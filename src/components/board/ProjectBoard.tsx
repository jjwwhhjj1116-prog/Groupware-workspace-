import React from 'react';
import { Project, TaskCard, RevisionRequest } from '@/types/models';
import { ProjectSummaryCard } from './ProjectSummaryCard';
import { GroupByOption } from './Board';
import { getDeliveryUrgencyBucket, getProjectBoardColumn } from '@/lib/selectors';
import { useTranslation } from '@/lib/localization';
import { useTranslationStore } from '@/store/translationStore';
import { ProjectWorkflowTab } from '@/lib/projectWorkflow';
import { useProjectWorkflowIndex } from '@/hooks/useProjectWorkflow';
import { FolderOpen } from 'lucide-react';

interface Props {
  projects: Project[];
  tasks: TaskCard[];
  revisionRequests: RevisionRequest[];
  groupBy: GroupByOption;
  onProjectClick: (projectId: string) => void;
  onProjectMove?: (projectId: string, sourceColId: string, targetColId: string) => void;
  onOperationClick?: (projectId: string, tab?: ProjectWorkflowTab) => void;
  onProjectAction?: (project: Project, action: 'START' | 'DUE' | 'COMPLETE' | 'REVISION') => void;
}

export const ProjectBoard: React.FC<Props> = ({ projects, tasks, revisionRequests, groupBy, onProjectClick, onProjectMove, onOperationClick, onProjectAction }) => {
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const workflowByProject = useProjectWorkflowIndex(projects, tasks);

  const getColumns = () => {
    if (groupBy === 'PRIORITY') {
      const label = t('delivery');
      return [
        { id: 'OVERDUE', title: `🚨 ${t('overdue', { label })}`, accent: 'bg-rose-500', frame: 'border-rose-200/90' },
        { id: 'WITHIN_1_WEEK', title: `🔴 ${t('dueIn', { label, time: '1w' })}`, accent: 'bg-red-500', frame: 'border-red-200/90' },
        { id: 'WITHIN_2_WEEKS', title: `🟠 ${t('dueIn', { label, time: '2w' })}`, accent: 'bg-amber-500', frame: 'border-amber-200/90' },
        { id: 'WITHIN_1_MONTH', title: `🔵 ${t('dueIn', { label, time: '1m' })}`, accent: 'bg-blue-500', frame: 'border-blue-200/90' },
        { id: 'UNSET', title: `⚪ ${t('unset')}`, accent: 'bg-slate-400', frame: 'border-slate-200/90' },
      ];
    }
    // Default to Status groups
    return [
      { id: 'PRE_WORK', title: t('preWork'), accent: 'bg-slate-400', frame: 'border-slate-200/90' },
      { id: 'IN_PROGRESS', title: t('inProgress'), accent: 'bg-sky-500', frame: 'border-sky-200/90' },
      { id: 'COMPLETED', title: t('completed'), accent: 'bg-emerald-500', frame: 'border-emerald-200/90' },
      { id: 'REVISION', title: t('revision'), accent: 'bg-[#ff7a2f]', frame: 'border-orange-200/90' },
    ];
  };

  const columns = getColumns();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    const sourceColId = e.dataTransfer.getData('sourceColId');
    if (projectId && sourceColId && sourceColId !== targetColId && onProjectMove) {
      onProjectMove(projectId, sourceColId, targetColId);
    }
  };

  return (
    <div 
      className={`grid grid-cols-1 gap-4 pb-6 md:grid-cols-2 ${columns.length === 5 ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4'}`}
    >
      {columns.map(col => {
        const colProjects = projects.filter(p => {
          if (groupBy === 'PRIORITY') {
            return getDeliveryUrgencyBucket(p) === col.id;
          }
          
          const hasActiveRevision = revisionRequests.some(r => r.projectId === p.id && (r.status === 'PENDING' || r.status === 'ACCEPTED'));
          const columnId = getProjectBoardColumn(p, new Date(), hasActiveRevision);
          if (col.id === 'PRE_WORK') return columnId === 'PRE_WORK';
          if (col.id === 'REVISION') return columnId === 'REVISION';
          if (col.id === 'COMPLETED') return columnId === 'COMPLETED';
          return columnId === 'IN_PROGRESS';
        });

        return (
          <div 
            key={col.id} 
            className={`flex max-h-[calc(100vh-220px)] min-h-[250px] flex-col overflow-hidden rounded-[20px] border ${col.frame} bg-[var(--cc-surface-2)] shadow-[0_12px_30px_rgba(71,85,105,.09),inset_0_1px_0_rgba(255,255,255,.85)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(71,85,105,.14)]`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            role="region"
            aria-label={col.title}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h2 className="flex items-center gap-2 font-black text-[14px] tracking-tight text-[var(--color-text-main)]"><span className={`h-5 w-1 rounded-full ${col.accent}`} />{col.title}</h2>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--cc-surface-2)] px-2.5 py-0.5 text-[10px] font-black text-[var(--color-text-sub)]">
                {colProjects.length}
              </span>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {colProjects.map(project => (
                <ProjectSummaryCard 
                  key={project.id} 
                  project={project} 
                  tasks={tasks}
                  workflow={workflowByProject.get(project.id)!}
                  onClick={onProjectClick} 
                  onOperationClick={onOperationClick}
                  onProjectAction={onProjectAction}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('projectId', project.id);
                    e.dataTransfer.setData('sourceColId', col.id);
                  }}
                />
              ))}
              {colProjects.length === 0 && (
                <div className="flex min-h-[158px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/65 p-5 text-center text-[var(--color-text-sub)]">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--cc-surface-3)]"><FolderOpen className="h-5 w-5 opacity-60" /></span>
                  <strong className="text-xs font-black text-[var(--color-text-main)]">{t('board.project.noProject')}</strong>
                  <span className="mt-1.5 text-[10px] font-semibold leading-4">프로젝트가 이 단계로 이동하면<br />카드로 표시됩니다.</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
