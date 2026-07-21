'use client';

import { AlertTriangle, Check, Circle } from 'lucide-react';
import { ProjectWorkflowPhase, ProjectWorkflowSummary } from '@/lib/projectWorkflow';
import { useTranslation } from '@/lib/localization';
import { useTranslationStore } from '@/store/translationStore';

type Props = {
  summary: ProjectWorkflowSummary;
  compact?: boolean;
  onPhaseClick?: (phase: ProjectWorkflowPhase) => void;
};

const stateClass = {
  COMPLETE: 'border-emerald-500 bg-emerald-500 text-white',
  ACTIVE: 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white',
  PENDING: 'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-sub)]',
  BLOCKED: 'border-red-500 bg-red-50 text-red-700',
};

export function ProjectWorkflowProgress({ summary, compact = false, onPhaseClick }: Props) {
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-3'}>
      {!compact && <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--color-text-sub)]">
        <span>{t('projectWorkflow.progress')}</span>
        <span>{summary.completion}%</span>
      </div>}
      <ol className="grid grid-cols-6 gap-1" aria-label={t('projectWorkflow.progress')}>
        {summary.phases.map((phase) => {
          const content = <>
            <span className={`grid ${compact ? 'h-5 w-5' : 'h-7 w-7'} place-items-center rounded-full border ${stateClass[phase.state]}`}>
              {phase.state === 'COMPLETE' ? <Check className="h-3.5 w-3.5" /> : phase.state === 'BLOCKED' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
            </span>
            {!compact && <span className="mt-1 text-[10px] font-semibold text-[var(--color-text-sub)]">{t(`projectWorkflow.phase.${phase.id}`)}</span>}
          </>;
          return <li key={phase.id} className="flex min-w-0 flex-col items-center">
            {onPhaseClick ? <button type="button" title={`${t(`projectWorkflow.phase.${phase.id}`)} - ${t(`projectWorkflow.state.${phase.state}`)}`} onClick={() => onPhaseClick(phase)} className="flex min-w-0 flex-col items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{content}</button> : content}
          </li>;
        })}
      </ol>
    </div>
  );
}
