import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from '@/types/models';
import { TaskCardItem } from './TaskCardItem';
import { TaskStatus } from '@/types/models';
import { getColumnSummary } from '@/lib/selectors';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

interface ColumnProps {
  id: string;
  title: string;
  tasks: TaskCard[];
  onTaskClick?: (task: TaskCard) => void;
}

export const Column: React.FC<ColumnProps> = ({ id, title, tasks, onTaskClick }) => {
  const { setNodeRef } = useDroppable({ id });
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  
  const { avgProgress, delayedCount, urgentCount, pendingCount } = getColumnSummary(tasks);

  return (
    <div className="bg-[var(--color-bg)]/50 p-4 rounded-xl min-w-[300px] w-[300px] flex flex-col max-h-[85vh] border border-[var(--color-border)]/60 shadow-sm">
      <div className="mb-4">
        <h3 className="font-bold text-[var(--color-text-main)] flex justify-between items-center mb-2">
          {title}
          <span className="bg-[var(--color-surface)] text-[var(--color-text-sub)] px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm border border-[var(--color-border)]">
            {tasks.length}
          </span>
        </h3>
        
        {tasks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[10px] text-[var(--color-text-sub)] font-medium bg-[var(--color-surface)]/60 p-2 rounded-lg border border-[var(--color-border)]">
            <span>{t('board.column.avg')} <span className="text-[var(--color-text-main)]">{avgProgress}%</span></span>
            {delayedCount > 0 && <span>· <span className="text-red-500">{t('board.column.delayed')} {delayedCount}</span></span>}
            {urgentCount > 0 && <span>· <span className="text-orange-500">{t('board.column.urgent')} {urgentCount}</span></span>}
            {pendingCount > 0 && <span>· <span className="text-purple-500">{t('board.column.pending')} {pendingCount}</span></span>}
          </div>
        )}
      </div>
      
      <div ref={setNodeRef} className="flex-1 overflow-y-auto space-y-3 min-h-[100px] pr-1 pb-4 custom-scrollbar">
        {tasks.map(task => (
          <TaskCardItem key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
        ))}
      </div>
    </div>
  );
};
