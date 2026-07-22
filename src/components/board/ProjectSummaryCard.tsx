import React from 'react';
import { Project, TaskCard } from '@/types/models';
import { getProjectOverallProgress, getProjectDeliveryLifecycle, getProjectDeliveryBadge } from '@/lib/selectors';
import { Activity, AlertCircle, BarChart3, CheckCircle, ClipboardCheck, Clock, PackageCheck, User } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/Badge';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { useTranslationStore } from '@/store/translationStore';
import { ProjectWorkflowSummary, ProjectWorkflowTab } from '@/lib/projectWorkflow';
import { ProjectWorkflowProgress } from '@/components/projects/ProjectWorkflowProgress';

interface Props {
  project: Project;
  tasks: TaskCard[];
  onClick: (projectId: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLElement>, projectId: string) => void;
  onOperationClick?: (projectId: string, tab?: ProjectWorkflowTab) => void;
  workflow: ProjectWorkflowSummary;
}

export const ProjectSummaryCard: React.FC<Props> = ({ project, tasks, onClick, draggable, onDragStart, onOperationClick, workflow }) => {
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
    <article
      draggable={draggable}
      onDragStart={(e) => onDragStart && onDragStart(e, project.id)}
      className="cc-tactile-card group space-y-3 p-4"
      data-interactive="true"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge variant={project.projectSourceType === 'CLIENT_ORDER' ? 'INFO' : 'DEFAULT'}>
            {project.projectSourceType === 'CLIENT_ORDER' ? t('board.summary.sourceOrder') : t('board.summary.sourceInternal')}
          </Badge>
          <Badge variant={getLifecycleBadgeVariant()}>{badgeText}</Badge>
        </div>
        <div className="flex items-start gap-2">
          <button type="button" onClick={() => onClick(project.id)} className="min-w-0 flex-1 rounded text-left font-bold text-[15px] text-[var(--color-text-main)] line-clamp-2 leading-snug group-hover:text-[var(--color-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{project.title}</button>
          {onOperationClick && <button type="button" title={t('projectWorkflow.openCurrent')} aria-label={t('projectWorkflow.openCurrent')} onClick={() => onOperationClick(project.id, workflow.currentTab)} className="shrink-0 rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-text-sub)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><Activity className="h-4 w-4" /></button>}
        </div>
      </div>

      <div className="border-y border-[var(--color-border)] py-2">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-[var(--color-text-sub)]">
          <span>{t(`projectWorkflow.phase.${workflow.currentPhase}`)}</span>
          <span>{workflow.completion}%</span>
        </div>
        <ProjectWorkflowProgress summary={workflow} compact />
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

      {onOperationClick && <div className="grid grid-cols-3 gap-1 border-t border-[var(--color-border)] pt-2">
        <WorkflowAction icon={<ClipboardCheck className="h-3.5 w-3.5" />} label={t('projectWorkflow.phase.QC')} onClick={() => onOperationClick(project.id, 'QC')} />
        <WorkflowAction icon={<PackageCheck className="h-3.5 w-3.5" />} label={t('projectWorkflow.phase.DELIVERY')} onClick={() => onOperationClick(project.id, 'DELIVERY')} />
        <WorkflowAction icon={<BarChart3 className="h-3.5 w-3.5" />} label={t('projectWorkflow.phase.PROFIT')} onClick={() => onOperationClick(project.id, 'PROFIT')} />
      </div>}
    </article>
  );
};

function WorkflowAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" title={label} onClick={onClick} className="inline-flex min-w-0 items-center justify-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{icon}<span className="truncate">{label}</span></button>;
}
