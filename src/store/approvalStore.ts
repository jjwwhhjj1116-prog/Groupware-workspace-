import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApprovalRequest, ApprovalWorkflowTemplate, ApprovalRequestType } from '@/types/models';
import { mockApprovalRequests } from '@/data/mockData';
import { useNotificationStore } from '@/store/notificationStore';
import { useTaskStore } from '@/store/taskStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useConflictStore } from '@/store/conflictStore';
import { useProcessTemplateStore } from '@/store/processTemplateStore';
import { useAuditStore } from '@/store/auditStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { canApproveRequest } from '@/lib/permissions';

interface ApprovalState {
  requests: ApprovalRequest[];
  templates: ApprovalWorkflowTemplate[];
  addRequest: (request: Omit<ApprovalRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }) => string;
  updateApprovalStatus: (id: string, status: 'APPROVED' | 'REJECTED' | 'PM_APPROVED' | 'MANAGER_REVIEWING', reviewerId: string, comment?: string, alternativeType?: ApprovalRequestType) => void;
  updateTemplate: (templateId: string, updates: Partial<ApprovalWorkflowTemplate>) => void;
  replaceRequests: (requests: ApprovalRequest[]) => void;
  resetRequests: () => void;
  replaceTemplates: (templates: ApprovalWorkflowTemplate[]) => void;
  resetTemplates: () => void;
}

const initialRequests: ApprovalRequest[] = [
  ...mockApprovalRequests
];

const initialTemplates: ApprovalWorkflowTemplate[] = [
  {
    id: 'tmpl_1',
    requestType: 'OVERTIME_REQUEST',
    isActive: true,
    steps: [
      { stepIndex: 1, role: 'PM', required: true },
      { stepIndex: 2, role: 'DEPARTMENT_MANAGER', required: true }
    ]
  },
  {
    id: 'tmpl_2',
    requestType: 'SCHEDULE_APPROVAL',
    isActive: true,
    steps: [
      { stepIndex: 1, role: 'DEPARTMENT_MANAGER', required: true }
    ]
  }
];

export const useApprovalStore = create<ApprovalState>()(persist((set) => ({
  requests: initialRequests,
  templates: initialTemplates,
  addRequest: (requestData) => {
    const newId = requestData.id || `apr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    set((state) => ({
      requests: [...state.requests, {
        ...requestData,
        id: newId,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]
    }));

    useAuditStore.getState().addLog({
      actorId: requestData.requestedBy,
      action: 'CREATE',
      entityType: 'APPROVAL',
      entityId: newId,
      message: `Approval Request [${requestData.title}] created.`
    });

    if (requestData.managerId) {
      useNotificationStore.getState().addNotification({
        userId: requestData.managerId,
        type: 'SYSTEM',
        title: '새 결재 요청 알림',
        message: `[${requestData.title}] 결재가 요청되었습니다.`,
        priority: 'NORMAL',
        relatedApprovalId: newId
      });
    }

    return newId;
  },
  updateApprovalStatus: (id, status, reviewerId, comment, alternativeType) => set((state) => {
    const request = state.requests.find(r => r.id === id);
    if (!request) return state;

    const terminalStatuses = new Set(['APPROVED', 'REJECTED']);
    if (terminalStatuses.has(request.status)) return state;

    const reviewer = useAuthStore.getState().currentUser;
    const project = request.projectId
      ? useProjectStore.getState().projects.find((item) => item.id === request.projectId)
      : undefined;
    const canReviewProjectSchedule = request.type === 'SCHEDULE_APPROVAL' &&
      (status === 'APPROVED' || status === 'REJECTED') &&
      (reviewer?.role === 'SUPER_ADMIN' || (
        reviewer?.role === 'DEPARTMENT_MANAGER' &&
        reviewer.departmentId === project?.departmentId &&
        (!request.managerId || request.managerId === reviewer.id)
      ));
    const hasReviewPermission = request.type === 'SCHEDULE_APPROVAL' &&
      (status === 'APPROVED' || status === 'REJECTED')
      ? canReviewProjectSchedule
      : reviewer ? canApproveRequest(reviewer, request) : false;

    if (!reviewer || reviewer.id !== reviewerId || !hasReviewPermission) {
      console.warn('Permission denied: cannot review approval request');
      return state;
    }
    
    // Audit Log
    useAuditStore.getState().addLog({
      actorId: reviewerId,
      action: 'UPDATE',
      entityType: 'APPROVAL',
      entityId: id,
      message: `Approval Request ${id} status changed to ${status} by User ${reviewerId}. Comment: ${comment || 'N/A'}`
    });

    if (status === 'APPROVED' || status === 'REJECTED') {
      // Send Notification to requester
      useNotificationStore.getState().addNotification({
        userId: request.requestedBy,
        type: 'SYSTEM',
        title: `결재 ${status === 'APPROVED' ? '승인' : '반려'} 알림`,
        message: `요청하신 [${request.title}] 결재가 ${status === 'APPROVED' ? '승인' : '반려'} 처리되었습니다.\n검토자 의견: ${comment || '없음'}`,
        priority: status === 'REJECTED' ? 'HIGH' : 'NORMAL',
        relatedApprovalId: request.id
      });

      if (request.type === 'SCHEDULE_APPROVAL' && request.projectId) {
        const taskStore = useTaskStore.getState();
        const scheduleStore = useScheduleStore.getState();
        const scheduleTasks = taskStore.tasks.filter((task) =>
          task.projectId === request.projectId && task.approvalRequestId === request.id
        );

        if (status === 'APPROVED') {
          scheduleTasks.forEach((task) => {
            const approvedTask = { ...task, approvalStatus: 'APPROVED' as const };
            taskStore.updateTask(task.id, { approvalStatus: 'APPROVED' });
            scheduleStore.upsertTaskSchedule(approvedTask, reviewerId);
          });
          useProjectStore.getState().updateProjectStatus(request.projectId, 'IN_PROGRESS');
        } else {
          scheduleTasks.forEach((task) => taskStore.updateTask(task.id, { approvalStatus: 'REJECTED' }));
          scheduleStore.removeTaskSchedules(scheduleTasks.map((task) => task.id));
          useProjectStore.getState().updateProjectStatus(request.projectId, 'SCHEDULE_REJECTED');
        }
      }

      if (status === 'APPROVED' && request.taskId) {
        const taskStore = useTaskStore.getState();
        const task = taskStore.tasks.find(t => t.id === request.taskId);
        if (task) {
          if (request.type === 'DEADLINE_EXTENSION') {
            taskStore.updateTask(task.id, { dueDate: request.requestedDueDate || task.dueDate });
          } else if (request.type === 'OVERTIME_REQUEST') {
            const start = request.requestedStartDate || new Date().toISOString().split('T')[0];
            const end = request.requestedDueDate || new Date().toISOString().split('T')[0];
            taskStore.addWorkSegment({
              taskId: task.id,
              workerId: request.requestedBy,
              description: `[야근/초과근무 승인] ${request.title}`,
              startDate: start,
              endDate: end,
              progress: 0,
              status: 'APPROVED',
              isOvertime: true
            });
            
            // Check conflicts
            const overlapping = useScheduleStore.getState().schedules.filter(s => 
              s.userId === request.requestedBy && s.scheduleType === 'OFF' &&
              s.startDateTime.split('T')[0] <= end && s.endDateTime.split('T')[0] >= start
            );
            if (overlapping.length > 0) {
              useConflictStore.getState().addConflicts(overlapping.map(s => ({
                id: `c_${Date.now()}_${Math.random()}`,
                userId: request.requestedBy,
                startDate: s.startDateTime,
                endDate: s.endDateTime,
                conflictType: 'LEAVE_OVERLAP',
                relatedTaskIds: [task.id],
                relatedScheduleIds: [s.id],
                description: `휴가 일정과 야근/초과근무 일정이 겹칩니다.`,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              })));
            }
          } else if (request.type === 'SCHEDULE_REPLAN') {
            const start = request.requestedStartDate || new Date().toISOString().split('T')[0];
            const end = request.requestedDueDate || new Date().toISOString().split('T')[0];
            taskStore.addWorkSegment({
              taskId: task.id,
              workerId: request.requestedBy,
              description: `[세부일정 변경 승인] ${request.title}`,
              startDate: start,
              endDate: end,
              progress: 0,
              status: 'APPROVED',
              isOvertime: false
            });
            // If the replan exceeds original bounds, adjust them
            const newStart = request.requestedStartDate || task.startDate;
            const newEnd = request.requestedDueDate || task.dueDate;
            taskStore.updateTask(task.id, { startDate: newStart, dueDate: newEnd });
            
            // Check conflicts
            const overlapping = useScheduleStore.getState().schedules.filter(s => 
              s.userId === request.requestedBy && s.scheduleType === 'OFF' &&
              s.startDateTime.split('T')[0] <= end && s.endDateTime.split('T')[0] >= start
            );
            if (overlapping.length > 0) {
              useConflictStore.getState().addConflicts(overlapping.map(s => ({
                id: `c_${Date.now()}_${Math.random()}`,
                userId: request.requestedBy,
                startDate: s.startDateTime,
                endDate: s.endDateTime,
                conflictType: 'LEAVE_OVERLAP',
                relatedTaskIds: [task.id],
                relatedScheduleIds: [s.id],
                description: `휴가 일정과 세부 조정된 업무 일정이 겹칩니다.`,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              })));
            }
          } else if (request.type === 'MANPOWER_SUPPORT') {
            taskStore.addTask({
              projectId: task.projectId,
              title: `[지원] ${task.title}`,
              description: `[인력 지원 요청 승인] ${request.reason}`,
              status: 'TODO',
              priority: task.priority,
              departmentId: task.departmentId,
              assigneeId: '', // Unassigned, PM to assign later
              startDate: request.requestedStartDate || task.startDate,
              dueDate: request.requestedDueDate || task.dueDate,
              orderIndex: task.orderIndex + 1,
              approvalStatus: 'APPROVED'
            });
          } else if (request.type === 'PROCESS_SCHEDULE_APPROVAL') {
            const processTemplateStore = useProcessTemplateStore.getState();
            const assignment = processTemplateStore.assignments.find(a => a.taskId === task.id && a.status === 'PENDING_APPROVAL');
            if (assignment) {
              processTemplateStore.approveAssignment(assignment.id);
              
              const schedules = processTemplateStore.schedules.filter(s => s.assignmentId === assignment.id);
              const scheduleStore = useScheduleStore.getState();

              schedules.forEach(s => {
                if (s.startDate && s.endDate && s.assigneeId) {
                  const pTask = processTemplateStore.tasks.find(pt => pt.id === s.processTaskId);
                  const stage = processTemplateStore.stages.find(st => st.id === s.processStageId);
                  const description = `[공정: ${stage?.name || '미지정'}] ${pTask?.name || '미지정'}${s.description ? ` - ${s.description}` : ''}`;
                  
                  // 1. TaskStore에 WorkSegment 추가
                  taskStore.addWorkSegment({
                    taskId: task.id,
                    workerId: s.assigneeId,
                    description,
                    startDate: s.startDate,
                    endDate: s.endDate,
                    progress: s.progress,
                    status: 'APPROVED',
                    isOvertime: false
                  });

                  // 2. ScheduleStore에 PersonalSchedule (Official) 추가 (Handoff)
                  scheduleStore.addSchedule({
                    userId: s.assigneeId,
                    ownerRole: 'WORKER',
                    departmentId: task.departmentId,
                    title: `[공정일정] ${task.title}`,
                    description,
                    scheduleType: 'PERSONAL_WORK',
                    startDateTime: `${s.startDate}T09:00:00Z`,
                    endDateTime: `${s.endDate}T18:00:00Z`,
                    isAllDay: true,
                    visibility: 'DEPARTMENT',
                    createdBy: reviewerId,
                    updatedBy: reviewerId,
                    requiresApproval: false
                  });
                }
              });
            }
          }
        }
      } else if (status === 'REJECTED' && request.taskId) {
        if (request.type === 'PROCESS_SCHEDULE_APPROVAL') {
          const processTemplateStore = useProcessTemplateStore.getState();
          const assignment = processTemplateStore.assignments.find(a => a.taskId === request.taskId && (a.status === 'PENDING_APPROVAL' || a.status === 'DRAFT'));
          if (assignment) {
            processTemplateStore.rejectAssignment(assignment.id, comment || '반려되었습니다.');
          }
        }
      }
    }

    return {
      requests: state.requests.map(r => 
        r.id === id 
          ? { ...r, status, reviewedBy: reviewerId, reviewComment: comment, alternativeType, updatedAt: new Date().toISOString() }
          : r
      )
    };
  }),
  updateTemplate: (templateId, updates) => set((state) => ({
    templates: state.templates.map(t => 
      t.id === templateId ? { ...t, ...updates } : t
    )
  })),
  replaceRequests: (requests) => set({ requests }),
  resetRequests: () => set({ requests: [] }),
  replaceTemplates: (templates) => set({ templates }),
  resetTemplates: () => set({ templates: [] })
}), { name: 'approval-storage' }));
