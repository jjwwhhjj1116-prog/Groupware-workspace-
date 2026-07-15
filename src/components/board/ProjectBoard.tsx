import React from 'react';
import { Project, TaskCard, RevisionRequest } from '@/types/models';
import { ProjectSummaryCard } from './ProjectSummaryCard';
import { GroupByOption } from './Board';
import { getDeliveryUrgencyBucket, getProjectBoardColumn } from '@/lib/selectors';
import { useTranslation } from '@/lib/localization';
import { useTranslationStore } from '@/store/translationStore';

interface Props {
  projects: Project[];
  tasks: TaskCard[];
  revisionRequests: RevisionRequest[];
  groupBy: GroupByOption;
  onProjectClick: (projectId: string) => void;
  onProjectMove?: (projectId: string, sourceColId: string, targetColId: string) => void;
}

export const ProjectBoard: React.FC<Props> = ({ projects, tasks, revisionRequests, groupBy, onProjectClick, onProjectMove }) => {
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const getColumns = () => {
    if (groupBy === 'PRIORITY') {
      const isInternal = projects.length > 0 && projects[0].projectSourceType === 'INTERNAL_DEVELOPMENT';
      const label = isInternal ? t('goal') : t('delivery');
      return [
        { id: 'OVERDUE', title: `🚨 ${t('overdue', { label })}` },
        { id: 'WITHIN_1_WEEK', title: `🔴 ${t('dueIn', { label, time: '1w' })}` },
        { id: 'WITHIN_2_WEEKS', title: `🟠 ${t('dueIn', { label, time: '2w' })}` },
        { id: 'WITHIN_1_MONTH', title: `🔵 ${t('dueIn', { label, time: '1m' })}` },
        { id: 'UNSET', title: `⚪ ${t('unset')}` },
      ];
    }
    // Default to Status groups
    return [
      { id: 'PRE_WORK', title: t('preWork') },
      { id: 'IN_PROGRESS', title: t('inProgress') },
      { id: 'COMPLETED', title: t('completed') },
      { id: 'REVISION', title: t('revision') },
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
      className={`grid gap-6 pb-6 p-2 grid-cols-1 md:grid-cols-2 ${columns.length === 5 ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4'}`}
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
            className="bg-[var(--color-bg)]/50 rounded-[var(--radius-card)] flex flex-col max-h-[calc(100vh-200px)] border border-[var(--color-border)] shadow-sm overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            role="region"
            aria-label={col.title}
          >
            <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]">
              <h2 className="font-bold text-[15px] text-[var(--color-text-main)] tracking-tight">{col.title}</h2>
              <span className="bg-gray-100 border border-[var(--color-border)] text-[var(--color-text-sub)] px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                {colProjects.length}
              </span>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {colProjects.map(project => (
                <ProjectSummaryCard 
                  key={project.id} 
                  project={project} 
                  tasks={tasks}
                  onClick={onProjectClick} 
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('projectId', project.id);
                    e.dataTransfer.setData('sourceColId', col.id);
                  }}
                />
              ))}
              {colProjects.length === 0 && (
                <div className="p-4 text-center text-sm text-[var(--color-text-sub)] border-2 border-dashed border-[var(--color-border)] rounded-lg">
                  {t('board.project.noProject')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
