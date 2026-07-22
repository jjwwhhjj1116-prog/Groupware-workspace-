import React from 'react';
import { Project, TaskCard } from '@/types/models';
import { getProjectOverallProgress, getProjectDeliveryLifecycle, getProjectDeliveryBadge, getProjectBoardColumn } from '@/lib/selectors';
import { Activity, AlertCircle, BarChart3, CalendarClock, CheckCircle, ClipboardCheck, Clock, PackageCheck, PencilLine, Play, User, UsersRound } from 'lucide-react';
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
  onProjectAction?: (project: Project, action: 'START' | 'DUE' | 'COMPLETE' | 'REVISION') => void;
}

export const ProjectSummaryCard: React.FC<Props> = ({ project, tasks, onClick, draggable, onDragStart, onOperationClick, onProjectAction, workflow }) => {
  const { users, currentUser } = useAuthStore();
  const { postDeliveryWorkRequests, revisionRequests } = useProjectStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const progress = getProjectOverallProgress(project, tasks);
  const lifecycle = getProjectDeliveryLifecycle(project);
  const badgeText = getProjectDeliveryBadge(project);
  const pmUser = users.find(u => u.id === project.pmId);
  const projectMembers = Array.from(new Set(tasks.filter((task) => task.projectId === project.id && task.assigneeId && !task.isDeleted).map((task) => task.assigneeId!)))
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is NonNullable<typeof user> => Boolean(user));
  const memberTeams = Array.from(new Set(projectMembers.map((user) => user.teamName || user.subDepartmentName || user.departmentName).filter(Boolean)));
  const activeRevisionsCount = revisionRequests.filter(r => r.projectId === project.id && (r.status === 'PENDING' || r.status === 'ACCEPTED')).length;
  const boardColumn = getProjectBoardColumn(project, new Date(), activeRevisionsCount > 0);
  const cardAccent = boardColumn === 'PRE_WORK' ? 'border-l-slate-400' : boardColumn === 'IN_PROGRESS' ? 'border-l-sky-500' : boardColumn === 'COMPLETED' ? 'border-l-emerald-500' : 'border-l-orange-500';
  
  const pendingTasks = tasks.filter(t => t.projectId === project.id && t.status !== 'DONE').length;
  const pendingRequestsCount = postDeliveryWorkRequests.filter(r => r.projectId === project.id && (r.status === 'PENDING_PM' || r.status === 'PENDING_MANAGER' || r.status === 'PENDING_SUPER_ADMIN')).length;
  
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
      className={`cc-tactile-card group space-y-3 border-l-[3px] ${cardAccent} p-4`}
      data-interactive="true"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
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
          <span className="font-medium">PM · {pmUser ? getUserDisplayName(pmUser) : t('board.summary.pmUnset')}</span>
        </div>
        <div className="flex items-center gap-1 font-semibold">
          <Clock className="w-3 h-3" aria-hidden="true" />
          <span>{project.deliveryDate || project.dueDate ? t('board.summary.targetDelivery', { date: project.deliveryDate || project.dueDate || '' }) : t('unset')}</span>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-2.5">
        <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-[10px] font-black text-[var(--color-text-sub)]"><UsersRound className="h-3.5 w-3.5" />투입 인력</span>{memberTeams.length > 0 && <span className="max-w-[132px] truncate text-[9px] font-bold text-[var(--color-text-sub)]">{memberTeams.join(' · ')}</span>}</div>
        {projectMembers.length > 0 ? <div className="mt-2 flex items-center"><div className="flex -space-x-2">{projectMembers.slice(0, 6).map((member, index) => <span key={member.id} title={`${getUserDisplayName(member)} · ${member.teamName || member.departmentName || ''}`} className="grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--color-surface)] text-[9px] font-black text-white shadow-sm" style={{ background: ['#2979a8','#d07a28','#18806a','#7a5bb2','#c14e68','#59705f'][index % 6] }}>{getUserDisplayName(member).slice(0, 1)}</span>)}</div>{projectMembers.length > 6 && <span className="ml-2 text-[10px] font-black text-[var(--color-text-sub)]">+{projectMembers.length - 6}</span>}</div> : <p className="mt-2 text-[10px] font-semibold text-[var(--color-text-sub)]">착수 시 담당자와 작업을 배정해 주세요.</p>}
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

      {onProjectAction && <div className="grid grid-cols-2 gap-1.5 border-t border-[var(--color-border)] pt-2">
        {boardColumn === 'PRE_WORK' && <ProjectAction icon={<Play className="h-3.5 w-3.5" />} label="착수·인력배정" tone="bg-sky-50 text-sky-700 border-sky-200" onClick={() => onProjectAction(project, 'START')} />}
        {boardColumn === 'IN_PROGRESS' && <><ProjectAction icon={<CalendarClock className="h-3.5 w-3.5" />} label="납품 예정" tone="bg-amber-50 text-amber-700 border-amber-200" onClick={() => onProjectAction(project, 'DUE')} /><ProjectAction icon={<PackageCheck className="h-3.5 w-3.5" />} label="납품 완료" tone="bg-emerald-50 text-emerald-700 border-emerald-200" onClick={() => onProjectAction(project, 'COMPLETE')} /></>}
        {boardColumn === 'COMPLETED' && <ProjectAction icon={<PackageCheck className="h-3.5 w-3.5" />} label="납품 이력" tone="bg-emerald-50 text-emerald-700 border-emerald-200" onClick={() => onProjectAction(project, 'COMPLETE')} />}
        {boardColumn === 'REVISION' && <ProjectAction icon={<PencilLine className="h-3.5 w-3.5" />} label="수정 등록" tone="bg-orange-50 text-orange-700 border-orange-200" onClick={() => onProjectAction(project, 'REVISION')} />}
      </div>}
    </article>
  );
};

function WorkflowAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" title={label} onClick={onClick} className="inline-flex min-w-0 items-center justify-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{icon}<span className="truncate">{label}</span></button>;
}

function ProjectAction({ icon, label, tone, onClick }: { icon: React.ReactNode; label: string; tone: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-[10px] font-black transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${tone}`}>{icon}{label}</button>;
}
