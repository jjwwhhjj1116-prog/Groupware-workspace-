import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { TaskCard } from '@/types/models';
import { Clock, User, AlertCircle, FileText } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { calculateTaskProgress, calculateTaskHealthScore } from '@/lib/selectors';
import { useTaskStore } from '@/store/taskStore';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { useTranslationStore } from '@/store/translationStore';

interface TaskCardItemProps {
  task: TaskCard;
  onClick?: () => void;
}

export const TaskCardItem: React.FC<TaskCardItemProps> = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const users = useAuthStore(state => state.users);
  const projects = useProjectStore(state => state.projects);
  const blockers = useTaskStore(state => state.blockers);
  const progressUpdates = useTaskStore(state => state.progressUpdates);

  const assignee = users.find(u => u.id === task.assigneeId);
  const pm = users.find(u => u.id === task.pmId);
  const project = projects.find(p => p.id === task.projectId);
  const { settings } = useTranslationStore();
  const uiLang = settings.uiLanguage;
  const t = useTranslation(uiLang);

  let primaryTitle = task.title;
  let secondaryTitle = '';
  let transStatus = null;

  if (task.titleI18n) {
    const targetLang = uiLang === 'ko' ? 'vi' : 'ko';
    if (uiLang === task.titleI18n.originalLanguage) {
      primaryTitle = task.titleI18n.originalText;
      const trans = task.titleI18n.translations?.[targetLang];
      if (trans) {
        secondaryTitle = t('board.card.autoTransLabel').replace('{lang}', targetLang.toUpperCase()).replace('{text}', trans.text);
        transStatus = trans.status;
      }
    } else {
      const trans = task.titleI18n.translations?.[uiLang];
      if (trans && trans.status !== 'TRANSLATION_FAILED') {
        primaryTitle = trans.text;
        secondaryTitle = t('board.card.orgTextLabel').replace('{lang}', task.titleI18n.originalLanguage.toUpperCase()).replace('{text}', task.titleI18n.originalText);
        transStatus = trans.status;
      } else {
        primaryTitle = task.titleI18n.originalText;
        secondaryTitle = t('board.card.noTransLabel').replace('{lang}', uiLang.toUpperCase());
      }
    }
  }

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  const isDelayed = task.dueDate ? new Date(task.dueDate) < new Date() && task.status !== 'DONE' : false;
  
  const healthScore = calculateTaskHealthScore(task, blockers, progressUpdates);
  const healthColor = healthScore >= 80 ? 'text-green-600 bg-green-50 border-green-200' 
                    : healthScore >= 50 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' 
                    : 'text-red-600 bg-red-50 border-red-200';

  const hasOpenBlockers = blockers.some(b => b.taskId === task.id && b.status === 'OPEN');
  const isPendingApproval = task.approvalStatus === 'PENDING';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.()}
      className={`bg-[var(--color-surface)] p-3 rounded-lg shadow-sm border ${isDragging ? 'border-blue-400 shadow-md ring-2 ring-blue-100' : 'border-[var(--color-border)]'} cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[var(--color-border-strong)] transition-all group`}
    >
      <div className="flex justify-between items-start mb-2 gap-1 flex-wrap">
        <div className="flex gap-1.5 flex-wrap flex-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border ${healthColor}`}>
            ♥ {healthScore}
          </span>
          {hasOpenBlockers && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border text-red-600 bg-red-50 border-red-200 flex items-center gap-0.5">
              <AlertCircle className="w-3 h-3" /> Blocker
            </span>
          )}
          {task.isAdditionalTask && (
            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded shadow-sm border border-purple-100">
              {t('board.card.postWork')}
            </span>
          )}
          {isDelayed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-red-50 text-red-600 border-red-200 flex items-center">
              <AlertCircle className="w-3 h-3 mr-0.5" /> {t('board.card.delayed')}
            </span>
          )}
          {isPendingApproval && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-purple-50 text-purple-600 border-purple-200">
              {t('board.card.pendingApprove')}
            </span>
          )}
          {transStatus === 'AUTO_TRANSLATED' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-blue-50 text-blue-600 border-blue-200">
              Auto
            </span>
          )}
          {transStatus === 'HUMAN_REVIEW_REQUIRED' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-yellow-50 text-yellow-600 border-yellow-200">
              {t('board.card.needReview')}
            </span>
          )}
          {transStatus === 'HUMAN_APPROVED' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-green-50 text-green-600 border-green-200">
              {t('board.card.approvedTrans')}
            </span>
          )}
          {task.isOutsourced && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold bg-teal-50 text-teal-700 border-teal-200">
              {task.billingAmount ? t('board.card.billingLabel').replace('{amount}', task.billingAmount.toLocaleString()) : t('board.card.outsourced')}
            </span>
          )}
        </div>
        {task.sourceSheet && (
          <span className="text-[9px] text-[var(--color-text-sub)] bg-[var(--color-bg)] px-1.5 py-0.5 rounded border border-[var(--color-border)] flex items-center whitespace-nowrap">
            <FileText className="w-2.5 h-2.5 mr-0.5" />
            {task.sourceSheet}
          </span>
        )}
      </div>

      <div className="mb-2">
        <span className="text-[10px] font-medium text-[var(--color-text-sub)] mb-0.5 block truncate">
          {project?.title || 'Unknown Project'}
        </span>
        <h4 className="font-semibold text-[var(--color-text-main)] text-sm leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
          {primaryTitle}
        </h4>
        {secondaryTitle && (
          <p className="text-xs text-slate-500 font-medium mt-1 truncate">
            {secondaryTitle}
          </p>
        )}
      </div>

      <div className="my-3">
        <ProgressBar 
          progress={calculateTaskProgress(task)} 
          showLabel={true} 
          colorClass={calculateTaskProgress(task) === 100 ? 'bg-green-500' : isDelayed ? 'bg-red-500' : 'bg-blue-500'} 
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-sub)] mt-2 border-t pt-2 border-gray-50">
        <div className="flex items-center gap-2">
          <div className="flex items-center" title={t('board.card.tooltipAssignee')}>
            <User className="w-3 h-3 mr-1" />
            <span className="truncate max-w-[65px]">{assignee ? getUserDisplayName(assignee) : t('board.assignee.unassigned')}</span>
          </div>
          {pm && (
            <div className="flex items-center text-indigo-600 font-medium" title={`PM: ${pm.name}`}>
              <span className="truncate max-w-[45px]">({getUserDisplayName(pm)})</span>
            </div>
          )}
        </div>
        <div className="flex items-center bg-[var(--color-bg)] px-1.5 py-0.5 rounded" title={t('board.card.tooltipDeadline')}>
          <Clock className={`w-3 h-3 mr-1 ${isDelayed ? 'text-red-500' : ''}`} />
          <span className={isDelayed ? 'text-red-600 font-medium' : ''}>
            {task.dueDate ? task.dueDate.substring(5) : '-'}
          </span>
        </div>
      </div>
    </div>
  );
};
