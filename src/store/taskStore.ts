import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TaskCard, TaskStatus, CompletionStatus, ProgressUpdate, TaskChecklistItem, TaskArtifact, TaskBlocker, UserId, TaskWorkSegment } from '@/types/models';
import { DetailedLineStage, getDetailedLineStage } from '@/lib/selectors';
import { fullTasks } from '@/data/fullScheduleSeed';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuditStore } from '@/store/auditStore';
import { MultiLangText } from '@/types/models';
import { canEditTask, canMoveTask } from '@/lib/permissions';

interface TaskState {
  tasks: TaskCard[];
  progressUpdates: ProgressUpdate[];
  checklists: TaskChecklistItem[];
  artifacts: TaskArtifact[];
  blockers: TaskBlocker[];
  workSegments: TaskWorkSegment[];
  loadDummyTasks: () => void;
  addTask: (task: Omit<TaskCard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (taskId: string, updates: Partial<TaskCard>) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  updateDetailedLineStage: (taskId: string, stage: DetailedLineStage) => void;
  updateTaskAssignee: (taskId: string, newAssigneeId: UserId | undefined) => void;
  updateTaskPriority: (taskId: string, newPriority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW') => void;
  updateTaskProgress: (taskId: string, newProgress: number, authorId: UserId, memo: string, blocker?: string, memoI18n?: MultiLangText) => void;
  requestTaskCompletion: (taskId: string, memo: string) => void;
  reviewTaskCompletion: (taskId: string, isApproved: boolean) => void;
  addChecklistItem: (item: Omit<TaskChecklistItem, 'id'>) => void;
  toggleChecklistItem: (itemId: string, completedBy: UserId) => void;
  addArtifact: (artifact: Omit<TaskArtifact, 'id' | 'createdAt'>) => void;
  deleteArtifact: (artifactId: string) => void;
  addBlocker: (blocker: Omit<TaskBlocker, 'id' | 'status' | 'createdAt'>) => void;
  resolveBlocker: (blockerId: string, resolvedBy: UserId) => void;
  addWorkSegment: (segment: Omit<TaskWorkSegment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWorkSegment: (id: string, updates: Partial<TaskWorkSegment>) => void;
  deleteWorkSegment: (id: string) => void;
  updateTaskBilling: (taskId: string, amount: number, status: 'PENDING' | 'INVOICED' | 'PAID', isOutsourced: boolean) => void;
  replaceTasks: (tasks: TaskCard[]) => void;
  resetTasks: () => void;
}

export const useTaskStore = create<TaskState>()(persist((set) => ({
  tasks: [],
  progressUpdates: [],
  checklists: [],
  artifacts: [],
  blockers: [],
  workSegments: [],
  loadDummyTasks: () => set({ tasks: fullTasks }),
  addTask: (taskData) => set((state) => {
    const newTask: TaskCard = {
      ...taskData,
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return { tasks: [...state.tasks, newTask] };
  }),
  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { ...t, ...updates, updatedAt: new Date().toISOString() } 
        : t
    )
  })),
  updateTaskStatus: (taskId, newStatus) => set((state) => {
    const { currentUser } = useAuthStore.getState();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return state;

    if (currentUser && !canEditTask(currentUser, task)) {
      console.warn('Permission denied: cannot edit task status');
      return state;
    }

    if (currentUser) {
      useAuditStore.getState().addLog({
        actorId: currentUser.id,
        action: 'UPDATE',
        entityType: 'TASK',
        entityId: taskId,
        message: `Task status changed from ${task.status} to ${newStatus}`
      });
      if (task.assigneeId && task.assigneeId !== currentUser.id) {
        useNotificationStore.getState().addNotification({
          userId: task.assigneeId,
          type: 'SYSTEM',
          title: '상태 변경 알림',
          message: `담당하신 업무 "${task.title}"의 상태가 ${newStatus}로 변경되었습니다.`,
          priority: 'NORMAL'
        });
      }
    }

    return {
      tasks: state.tasks.map(t => 
        t.id === taskId 
          ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } 
          : t
      )
    };
  }),
  updateDetailedLineStage: (taskId, stage) => set((state) => {
    return {
      tasks: state.tasks.map(t => {
        if (t.id !== taskId) return t;

        const { currentUser } = useAuthStore.getState();
        if (!currentUser) return t;

        const currentStage = getDetailedLineStage(t);
        const stageOrder: Record<DetailedLineStage, number> = {
          WAITING: 0,
          QC_PM_START: 1,
          IN_PROGRESS: 2,
          PM_REVIEW: 3,
          QC_REVIEW: 4,
          DONE: 5
        };

        const currentIdx = stageOrder[currentStage];
        const newIdx = stageOrder[stage];

        if (newIdx !== undefined && currentIdx !== undefined && newIdx > currentIdx + 1) {
          console.warn(`Cannot skip stages: ${currentStage} -> ${stage}`);
          return t;
        }

        let newStatus: TaskStatus = t.status;
        let newCompletion: CompletionStatus | undefined = t.completionStatus;
        
        switch (stage) {
          case 'WAITING':
            newStatus = 'TODO';
            newCompletion = 'NOT_STARTED';
            break;
          case 'QC_PM_START':
            newStatus = 'READY';
            newCompletion = 'NOT_STARTED';
            break;
          case 'IN_PROGRESS':
            newStatus = 'IN_PROGRESS';
            newCompletion = 'IN_PROGRESS';
            break;
          case 'PM_REVIEW':
            newStatus = 'REVIEW';
            newCompletion = 'PM_REVIEWING';
            break;
          case 'QC_REVIEW':
            newStatus = 'REVIEW';
            newCompletion = 'MANAGER_REVIEWING';
            break;
          case 'DONE':
            newStatus = 'DONE';
            newCompletion = 'COMPLETED';
            break;
        }

        if (!canMoveTask(currentUser, t, newStatus)) {
          console.warn('Unauthorized attempt to move task status');
          return t;
        }
        
        return { 
          ...t, 
          status: newStatus, 
          completionStatus: newCompletion, 
          updatedAt: new Date().toISOString() 
        };
      })
    };
  }),
  updateTaskAssignee: (taskId, newAssigneeId) => set((state) => {
    const { currentUser, users } = useAuthStore.getState();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return state;

    if (currentUser && !canEditTask(currentUser, task)) {
      console.warn('Permission denied: cannot assign task');
      return state;
    }

    if (newAssigneeId) {
      const assignee = users.find(u => u.id === newAssigneeId);
      if (!assignee) {
        console.warn(`Cannot assign task: User ${newAssigneeId} does not exist.`);
        return state;
      }
    }

    if (currentUser) {
      useAuditStore.getState().addLog({
        actorId: currentUser.id,
        action: 'UPDATE',
        entityType: 'TASK',
        entityId: taskId,
        message: `Task assignee changed from ${task.assigneeId || 'none'} to ${newAssigneeId || 'none'}`
      });
      
      if (newAssigneeId && newAssigneeId !== currentUser.id) {
        useNotificationStore.getState().addNotification({
          userId: newAssigneeId,
          type: 'ASSIGNMENT',
          title: '업무 배정 알림',
          message: `새로운 업무 "${task.title}"에 배정되었습니다.`,
          priority: 'NORMAL'
        });
      }
    }

    return {
      tasks: state.tasks.map(t => 
        t.id === taskId 
          ? { ...t, assigneeId: newAssigneeId, updatedAt: new Date().toISOString() } 
          : t
      )
    };
  }),
  updateTaskPriority: (taskId, newPriority) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { ...t, priority: newPriority, updatedAt: new Date().toISOString() } 
        : t
    )
  })),
  requestTaskCompletion: (taskId, memo) => set((state) => ({
    tasks: state.tasks.map(t =>
      t.id === taskId
        ? { 
            ...t, 
            status: 'REVIEW', 
            completionStatus: 'PM_REVIEWING', 
            description: t.description + `\n\n[완료 메모]\n${memo}`,
            updatedAt: new Date().toISOString() 
          }
        : t
    )
  })),
  reviewTaskCompletion: (taskId, isApproved) => set((state) => ({
    tasks: state.tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            status: isApproved ? 'DONE' : 'IN_PROGRESS',
            completionStatus: isApproved ? 'COMPLETED' : 'REJECTED',
            updatedAt: new Date().toISOString()
          }
        : t
    )
  })),
  updateTaskProgress: (taskId, newProgress, authorId, memo, blocker, memoI18n) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return state;
    
    const { currentUser } = useAuthStore.getState();
    if (!currentUser || !canEditTask(currentUser, task)) {
      console.warn('Unauthorized attempt to update task progress');
      return state;
    }

    const progressBefore = task.progress || 0;
    
    // Parse mentions and send notifications
    const mentionRegex = /@(\w+)/g;
    let match;
    const mentionedUserIds = new Set<string>();
    while ((match = mentionRegex.exec(memo)) !== null) {
      const username = match[1];
      const { users } = useAuthStore.getState();
      // Match by id or name
      const targetUser = users.find(u => u.id === username || u.name === username);
      if (targetUser && targetUser.id !== authorId && !mentionedUserIds.has(targetUser.id)) {
        mentionedUserIds.add(targetUser.id);
        useNotificationStore.getState().addNotification({
          userId: targetUser.id,
          type: 'MENTION',
          title: '업무 멘션 알림',
          message: `${task.title} 업무에서 회원님을 멘션했습니다: "${memo}"`,
          priority: 'NORMAL',
          relatedTaskId: taskId
        });
      }
    }
    
    // Add ProgressUpdate record
    const newUpdate: ProgressUpdate = {
      id: `pu_${Date.now()}`,
      taskId,
      authorId,
      progressBefore,
      progressAfter: newProgress,
      workSummary: memo,
      workSummaryI18n: memoI18n,
      blocker,
      createdAt: new Date().toISOString()
    };

    // Rule: if progress goes from 0 to > 0, set status to IN_PROGRESS
    let newStatus = task.status;
    let newCompletion = task.completionStatus;
    if (progressBefore === 0 && newProgress > 0 && newStatus === 'TODO') {
      newStatus = 'IN_PROGRESS';
      newCompletion = 'IN_PROGRESS';
    }

    return {
      progressUpdates: [newUpdate, ...state.progressUpdates],
      tasks: state.tasks.map(t =>
        t.id === taskId
          ? { ...t, progress: newProgress, status: newStatus, completionStatus: newCompletion, updatedAt: new Date().toISOString() }
          : t
      )
    };
  }),
  addChecklistItem: (item) => set((state) => {
    const task = state.tasks.find(t => t.id === item.taskId);
    if (task) {
      const { currentUser } = useAuthStore.getState();
      if (!currentUser || !canEditTask(currentUser, task)) return state;
    }
    return {
      checklists: [...state.checklists, { ...item, id: `chk_${Date.now()}` }]
    };
  }),
  toggleChecklistItem: (itemId, completedBy) => set((state) => {
    const checklist = state.checklists.find(c => c.id === itemId);
    if (checklist) {
      const task = state.tasks.find(t => t.id === checklist.taskId);
      if (task) {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser || !canEditTask(currentUser, task)) return state;
      }
    }
    return {
      checklists: state.checklists.map(c => 
        c.id === itemId 
          ? { ...c, isCompleted: !c.isCompleted, completedBy: !c.isCompleted ? completedBy : undefined, completedAt: !c.isCompleted ? new Date().toISOString() : undefined }
          : c
      )
    };
  }),
  addArtifact: (artifact) => set((state) => ({
    artifacts: [...state.artifacts, { ...artifact, id: `art_${Date.now()}`, createdAt: new Date().toISOString() }]
  })),
  deleteArtifact: (artifactId) => set((state) => ({
    artifacts: state.artifacts.filter(a => a.id !== artifactId)
  })),
  addBlocker: (blocker) => set((state) => {
    const task = state.tasks.find(t => t.id === blocker.taskId);
    if (task) {
      const { currentUser } = useAuthStore.getState();
      if (!currentUser || !canEditTask(currentUser, task)) return state;
    }
    return {
      blockers: [...state.blockers, { ...blocker, id: `blk_${Date.now()}`, status: 'OPEN', createdAt: new Date().toISOString() }]
    };
  }),
  resolveBlocker: (blockerId, resolvedBy) => set((state) => {
    const blocker = state.blockers.find(b => b.id === blockerId);
    if (blocker) {
      const task = state.tasks.find(t => t.id === blocker.taskId);
      if (task) {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser || !canEditTask(currentUser, task)) return state;
      }
    }
    return {
      blockers: state.blockers.map(b => 
        b.id === blockerId 
          ? { ...b, status: 'RESOLVED', resolvedAt: new Date().toISOString(), resolvedBy } 
          : b
      )
    };
  }),
  addWorkSegment: (segment) => set((state) => {
    const task = state.tasks.find(t => t.id === segment.taskId);
    if (task) {
      const { currentUser } = useAuthStore.getState();
      if (!currentUser || !canEditTask(currentUser, task)) return state;
    }
    return {
      workSegments: [...state.workSegments, {
        ...segment,
        id: `ws_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]
    };
  }),
  updateWorkSegment: (id, updates) => set((state) => {
    const segment = state.workSegments.find(ws => ws.id === id);
    if (segment) {
      const task = state.tasks.find(t => t.id === segment.taskId);
      if (task) {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser || !canEditTask(currentUser, task)) return state;
      }
    }
    return {
      workSegments: state.workSegments.map(ws => 
        ws.id === id ? { ...ws, ...updates, updatedAt: new Date().toISOString() } : ws
      )
    };
  }),
  deleteWorkSegment: (id) => set((state) => {
    const segment = state.workSegments.find(ws => ws.id === id);
    if (segment) {
      const task = state.tasks.find(t => t.id === segment.taskId);
      if (task) {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser || !canEditTask(currentUser, task)) return state;
      }
    }
    return {
      workSegments: state.workSegments.filter(ws => ws.id !== id)
    };
  }),
  updateTaskBilling: (taskId, amount, status, isOutsourced) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      const { currentUser } = useAuthStore.getState();
      if (!currentUser || !canEditTask(currentUser, task)) return state;
    }
    return {
      tasks: state.tasks.map(t =>
        t.id === taskId
          ? { ...t, billingAmount: amount, billingStatus: status, isOutsourced, updatedAt: new Date().toISOString() }
          : t
      )
    };
  }),
  replaceTasks: (tasks) => set({ tasks }),
  resetTasks: () => set({ tasks: [], progressUpdates: [], checklists: [], artifacts: [], blockers: [], workSegments: [] })
}), { name: 'task-storage' }));
