import React from 'react';
import { Project, TaskCard } from '@/types/models';
import { getProjectOverallProgress, getProjectDeliveryLifecycle, getProjectDeliveryBadge } from '@/lib/selectors';
import { AlertCircle, Clock, CheckCircle, User } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/Badge';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { useTranslationStore } from '@/store/translationStore';

interface Props {
  project: Project;
  tasks: TaskCard[];
  onClick: (projectId: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, projectId: string) => void;
}

export const ProjectSummaryCard: React.FC<Props> = ({ project, tasks, onClick, draggable, onDragStart }) => {
  const { users, currentUser } = useAuthStore();
  const { postDeliveryWorkRequests, revisionRequests } = useProjectStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const progress = getProjectOverallProgress(project, tasks);
  const lifecycle = getProjectDeliveryLifecycle(project);
  const badgeText = getProjectDeliveryBadge(project);
  const pmUser = users.find(u => u.id === project.pmId);
  
  const pendingTasks = tasks.filter(t => t.projectId === project.id && t.status !== 'DONE').length;
  const pendingRequestsCount = postDeliveryWorkRequests.filter(r => r.projectId === project.id && (r.status === 'PENDING_PM' || r.status === 'PENDING_MANAGER' || r.status === 'PENDING_SUPER_ADMIN')).length;
  const activeRevisionsCount = revisionRequests.filter(r => r.projectId === project.id && (r.status === 'PENDING' || r.status === 'ACCEPTED')).length;
  
  const getLifecycleBadgeVariant = () => {
    switch (lifecycle) {
      case 'OVERDUE': 
      case 'DUE_TODAY': return 'ERROR';
      case 'DUE_WITHIN_1_WEEK': 
      case 'DUE_WITHIN_2_WEEKS':
      case 'POST_DELIVERY_WORK_REQUESTED': 
      case 'POST_DELIVERY_WORK_IN_PROGRESS': return 'WARNING';
      case 'DUE_WITHIN_1_MONTH':
      case 'REOPENED': return 'INFO';
      case 'DELIVERY_CLOSED_AUTO':
      case 'DELIVERY_CLOSED_MANUAL': return 'SUCCESS';
      default: return 'DEFAULT';
    }
  };

  return (
    <div 
      draggable={draggable}
      onDragStart={(e) => onDragStart && onDragStart(e, project.id)}
      onClick={() => onClick(project.id)}
      className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)] shadow-sm border border-[var(--color-border)] hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-1 transition-all duration-200 cursor-pointer space-y-3 group"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge variant={project.projectSourceType === 'CLIENT_ORDER' ? 'INFO' : 'DEFAULT'}>
            {project.projectSourceType === 'CLIENT_ORDER' ? t('board.summary.sourceOrder') : t('board.summary.sourceInternal')}
          </Badge>
          <Badge variant={getLifecycleBadgeVariant()}>{badgeText}</Badge>
        </div>
        <h3 className="font-bold text-[15px] text-[var(--color-text-main)] line-clamp-2 leading-snug group-hover:text-[var(--color-primary)] transition-colors">{project.title}</h3>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-sub)]">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50 rounded-full flex items-center justify-center border" aria-hidden="true">
            <User className="w-3 h-3" />
          </div>
          <span className="font-medium">{pmUser ? getUserDisplayName(pmUser) : t('board.summary.pmUnset')}</span>
        </div>
        <div className="flex items-center gap-1 font-semibold">
          <Clock className="w-3 h-3" aria-hidden="true" />
          <span>{project.projectSourceType === 'INTERNAL_DEVELOPMENT' ? (project.targetDate ? t('board.summary.targetTarget', { date: project.targetDate }) : t('unset')) : (project.deliveryDate ? t('board.summary.targetDelivery', { date: project.deliveryDate }) : t('unset'))}</span>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-[var(--color-border)]">
        <div className="flex justify-between text-[11px] font-bold text-[var(--color-text-main)]">
          <span>{t('board.summary.progress')}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-[var(--color-primary)] h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3 text-[11px] font-semibold text-[var(--color-text-sub)]">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('board.summary.pendingTasks', { count: pendingTasks.toString() })}</span>
        </div>
        {pendingRequestsCount > 0 && (
          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('board.summary.addRequests', { count: pendingRequestsCount.toString() })}</span>
          </div>
        )}
        {activeRevisionsCount > 0 && (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('board.summary.revisions', { count: activeRevisionsCount.toString() })}</span>
          </div>
        )}
      </div>

      {project.status === 'MANAGER_REVIEW' && currentUser?.role === 'DEPARTMENT_MANAGER' && (
        <div className="pt-2 border-t border-[var(--color-border)] flex justify-end">
          <button 
            className="text-[11px] px-3 py-1.5 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 transition-colors shadow-sm"
            onClick={(e) => { 
              e.stopPropagation(); 
              useProjectStore.getState().updateProjectStatus(project.id, 'COMPLETED'); 
            }}
          >
            {t('board.summary.finalApprove')}
          </button>
        </div>
      )}
    </div>
  );
};
