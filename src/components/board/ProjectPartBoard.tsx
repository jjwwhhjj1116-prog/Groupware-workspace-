import React from 'react';
import { TaskCard, PersonnelCard } from '@/types/models';
import { getProjectWorkParts, getPartTaskCards, getPartProgress, getPartEmployees, calculateTaskProgress } from '@/lib/selectors';
import { TaskDetailModal } from './TaskDetailModal';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { useApprovalStore } from '@/store/approvalStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuditStore } from '@/store/auditStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { CheckCircle, XCircle, AlertCircle, AlertTriangle, Calendar } from 'lucide-react';

interface ProjectPartBoardProps {
  projectId: string;
  tasks: TaskCard[];
  users: PersonnelCard[];
  onTaskClick?: (taskId: string) => void;
  onDispatchClick?: () => void;
}

export const ProjectPartBoard: React.FC<ProjectPartBoardProps> = ({ projectId, tasks, users, onDispatchClick }) => {
  const [selectedTask, setSelectedTask] = React.useState<TaskCard | null>(null);
  const { currentUser } = useAuthStore();
  const project = useProjectStore(state => state.projects.find(p => p.id === projectId));
  const { tasks: allTasks, updateTaskStatus } = useTaskStore();
  const updateProjectStatus = useProjectStore(state => state.updateProjectStatus);
  const { requests, updateApprovalStatus } = useApprovalStore();
  const { addNotification } = useNotificationStore();
  const { addLog } = useAuditStore();
  const { schedules } = useScheduleStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  
  const parts = getProjectWorkParts(projectId, tasks, users);
  
  if (parts.length === 0) {
    const isAuthorized = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DEPARTMENT_MANAGER' || (currentUser?.role === 'PM' && project?.pmId === currentUser?.id);

    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-sub)] bg-[var(--color-surface)] rounded-lg border border-dashed gap-4">
        <p>{t('board.part.noPart')}</p>
        {isAuthorized && onDispatchClick && (
          <button 
            onClick={onDispatchClick}
            className="px-4 py-2 bg-[var(--color-primary)] text-white font-bold rounded-md hover:bg-opacity-90 transition-colors shadow-sm"
          >
            {t('board.part.dispatchBtn')}
          </button>
        )}
      </div>
    );
  }

  const allTasksDone = tasks.length > 0 && tasks.every(t => t.status === 'DONE');
  const isPM = currentUser?.role === 'PM' && project?.pmId === currentUser?.id;
  const isManager = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DEPARTMENT_MANAGER' || (project?.managerId && currentUser?.id === project.managerId);

  const handleApproveSchedule = () => {
    if (!window.confirm(t('board.part.confirmApprove'))) return;
    
    const req = requests.find(r => r.projectId === projectId && r.type === 'SCHEDULE_APPROVAL' && r.status === 'PENDING');
    if (req) {
      updateApprovalStatus(req.id, 'APPROVED', currentUser?.id || '');
    }

    if (project?.pmId && project.pmId !== req?.requestedBy) {
      addNotification({
        userId: project.pmId,
        type: 'SYSTEM',
        title: '일정 승인 완료',
        message: `[${project?.title}] 일정 계획이 승인되어 공식 반영되었습니다.`,
        priority: 'NORMAL',
        relatedProjectId: projectId
      });
    }

    addLog({
      entityType: 'PROJECT',
      entityId: projectId,
      action: 'SCHEDULE_APPROVED',
      actorId: currentUser?.id || '',
      message: '중간관리자에 의해 소요일정이 승인됨'
    });
  };

  const handleRejectSchedule = () => {
    const reason = window.prompt(t('board.part.promptReject'));
    if (reason === null) return;
    
    const req = requests.find(r => r.projectId === projectId && r.type === 'SCHEDULE_APPROVAL' && r.status === 'PENDING');
    if (req) {
      updateApprovalStatus(req.id, 'REJECTED', currentUser?.id || '', reason);
    }

    if (project?.pmId && project.pmId !== req?.requestedBy) {
      addNotification({
        userId: project.pmId,
        type: 'SYSTEM',
        title: '일정 승인 반려',
        message: `[${project?.title}] 일정 계획이 반려되었습니다.\n사유: ${reason || '없음'}`,
        priority: 'HIGH',
        relatedProjectId: projectId
      });
    }

    addLog({
      entityType: 'PROJECT',
      entityId: projectId,
      action: 'SCHEDULE_REJECTED',
      actorId: currentUser?.id || '',
      message: `중간관리자에 의해 소요일정이 반려됨 (사유: ${reason || '없음'})`
    });
  };

  const getWorkerConflicts = (task: TaskCard) => {
    if (!task.assigneeId || !task.startDate || !task.dueDate) return null;
    
    const userSchedules = schedules.filter(s => s.userId === task.assigneeId && s.scheduleType === 'OFF');
    const offDays = userSchedules.some(s => s.startDateTime.split('T')[0] <= task.dueDate! && s.endDateTime.split('T')[0] >= task.startDate!);
    
    const overlappingTasks = allTasks.filter(t => 
      t.assigneeId === task.assigneeId && 
      t.status !== 'DONE' && 
      t.status !== 'REJECTED' &&
      t.approvalStatus === 'APPROVED' &&
      t.startDate && t.dueDate &&
      t.startDate <= task.dueDate! && t.dueDate >= task.startDate!
    );
    
    let existingHours = 0;
    overlappingTasks.forEach(t => existingHours += (t.estimatedHours || 8));
    
    const days = Math.max(1, (new Date(task.dueDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 3600 * 24) + 1);
    const addedHours = task.estimatedHours || 8;
    const avgDaily = (existingHours + addedHours) / days;

    if (!offDays && avgDaily <= 8) return null;
    return { offDays, avgDaily: avgDaily.toFixed(1) };
  };

  const pendingTasks = tasks.filter(t => t.approvalStatus === 'PENDING');
  const conflictCount = pendingTasks.filter(t => getWorkerConflicts(t) !== null).length;

  return (
    <>
      {allTasksDone && isPM && project?.status !== 'MANAGER_REVIEW' && project?.status !== 'COMPLETED' && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => updateProjectStatus(projectId, 'MANAGER_REVIEW')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm animate-pulse"
          >
            <CheckCircle className="w-4 h-4" />
            {t('board.part.reqManagerReview')}
          </button>
        </div>
      )}
      
      {project?.status === 'SCHEDULE_PENDING_APPROVAL' && isManager && (
        <div className="mb-4 flex flex-col gap-4 bg-blue-50/80 p-4 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-blue-800 font-bold">
              <AlertCircle className="w-5 h-5" />
              {t('board.part.waitApprovalDesc')}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRejectSchedule}
                className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 font-bold rounded-md hover:bg-red-50 border border-red-200 transition-colors shadow-sm"
              >
                <XCircle className="w-4 h-4" />
                {t('board.part.rejectSchedule')}
              </button>
              <button
                onClick={handleApproveSchedule}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm animate-pulse"
              >
                <CheckCircle className="w-4 h-4" />
                {t('board.part.approveSchedule')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-md p-4 border border-blue-100 shadow-sm">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600"/>
              {t('board.part.previewTitle')}
            </h4>
            
            {conflictCount > 0 && (
              <div className="mb-4 text-sm bg-orange-50 text-orange-800 p-2 rounded border border-orange-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{t('board.part.conflictCountAlert', { conflictCount: conflictCount.toString() })}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-50 text-gray-900 border-b">
                  <tr>
                    <th className="px-3 py-2">{t('board.part.thTask')}</th>
                    <th className="px-3 py-2">{t('board.part.thAssignee')}</th>
                    <th className="px-3 py-2">{t('board.part.thPeriod')}</th>
                    <th className="px-3 py-2 text-right">{t('board.part.thEst')}</th>
                    <th className="px-3 py-2">{t('board.part.thConflict')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTasks.map(task => {
                    const assignee = users.find(u => u.id === task.assigneeId);
                    const conflict = getWorkerConflicts(task);
                    return (
                      <tr key={task.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{task.title}</td>
                        <td className="px-3 py-2">{assignee?.name || t('board.assignee.unassigned')}</td>
                        <td className="px-3 py-2">{task.startDate} ~ {task.dueDate}</td>
                        <td className="px-3 py-2 text-right">{task.estimatedHours}h</td>
                        <td className="px-3 py-2">
                          {conflict ? (
                            <div className="flex flex-col gap-1 text-xs">
                              {conflict.offDays && <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 inline-block w-fit">{t('board.part.conflictOff')}</span>}
                              {Number(conflict.avgDaily) > 8 && <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 inline-block w-fit">{t('board.part.conflictOverload', { avgDaily: conflict.avgDaily })}</span>}
                            </div>
                          ) : (
                            <span className="text-green-600 text-xs">{t('board.part.conflictOk')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {project?.status === 'SCHEDULE_REJECTED' && isPM && (
        <div className="mb-4 flex justify-between items-center bg-red-50 p-4 rounded-lg border border-red-100">
          <div className="flex items-center gap-2 text-red-800 font-bold">
            <AlertCircle className="w-5 h-5" />
            {t('board.part.rejectedAlert')}
          </div>
          <button
            onClick={onDispatchClick}
            className="px-4 py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition-colors shadow-sm"
          >
            {t('board.part.rewriteRetry')}
          </button>
        </div>
      )}

      <div className="flex flex-col space-y-6 overflow-y-auto pb-6 p-2 custom-scrollbar max-h-[calc(100vh-150px)]">
        {parts.map(part => {
          const partTasks = getPartTaskCards(part.id, parts, tasks);
          const partEmployees = getPartEmployees(part.id, parts, tasks, users);
          const avgProgress = getPartProgress(part.id, parts, tasks);
          
          return (
            <div key={part.id} className="w-full bg-[var(--color-bg)] rounded-xl flex flex-col border border-[var(--color-border)] shadow-sm">
              <div className="p-4 bg-[var(--color-surface)] rounded-t-xl border-b border-[var(--color-border)] flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-[var(--color-text-main)] text-base">{part.partName}</h3>
                  <span className="text-xs font-semibold text-[var(--color-text-sub)] bg-gray-100 px-2 py-0.5 rounded-full border">
                    {t('board.part.taskCount', { count: partTasks.length.toString() })}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-sub)]">
                    <span className="font-medium">{t('board.part.participantCount', { count: partEmployees.length.toString() })}</span>
                    <span className="text-gray-300">|</span>
                    <span className="font-medium text-blue-600">{t('board.part.progressPercent', { percent: avgProgress.toString() })}</span>
                  </div>
                  
                  <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(0, Math.min(100, avgProgress))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 p-4 overflow-x-auto custom-scrollbar min-h-[160px]">
                {partTasks.map(task => {
                  const assignee = users.find(u => u.id === task.assigneeId);
                  const progress = calculateTaskProgress(task);
                  const isMyTask = currentUser?.id === task.assigneeId;
                  
                  return (
                    <div 
                      key={task.id} 
                      className="flex-shrink-0 w-[280px] bg-[var(--color-surface)] p-3 rounded-lg shadow-sm border border-[var(--color-border)] hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
                      onClick={() => setSelectedTask(task)}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {task.scopeName || 'General'}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            task.approvalStatus === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                            task.status === 'DONE' ? 'bg-green-100 text-green-700' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                            task.status === 'REVIEW' ? 'bg-purple-100 text-purple-700' :
                            task.status === 'REJECTED' || task.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-[var(--color-text-sub)]'
                          }`}>
                            {task.approvalStatus === 'PENDING' ? t('board.part.statusPending') :
                             task.approvalStatus === 'REJECTED' ? t('board.part.statusRejected') :
                             task.status === 'IN_PROGRESS' ? t('board.status.inProgress') :
                             task.status === 'REVIEW' ? t('board.status.pmReview') :
                             task.status === 'DONE' ? t('board.status.done') :
                             task.status}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-sm text-[var(--color-text-main)] mb-4 line-clamp-2">{task.title}</h4>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-sub)] mt-auto">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-[var(--color-text-sub)]" aria-hidden="true">
                            {assignee ? (assignee.displayName?.[0] || assignee.name[0]) : '?'}
                          </div>
                          <span className="truncate max-w-[120px]">{assignee ? (assignee.displayName || assignee.name) : t('board.assignee.unassigned')}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 font-medium">
                          {isMyTask && task.status !== 'DONE' && task.approvalStatus === 'APPROVED' ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'DONE'); }}
                              className="text-[10px] px-2 py-1 bg-green-100 text-green-700 border border-green-200 rounded hover:bg-green-200 transition-colors font-bold shadow-sm"
                            >
                              {t('board.part.taskDone')}
                            </button>
                          ) : (
                            <span>{progress}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {partTasks.length === 0 && (
                  <div className="flex items-center justify-center w-full py-8 text-sm text-[var(--color-text-sub)]">
                    {t('board.part.noTasks')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
};
