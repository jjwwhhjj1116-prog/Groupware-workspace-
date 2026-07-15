import React, { useState, useEffect } from 'react';
import { useEvaluationStore } from '@/store/evaluationStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { X, Save, FileText } from 'lucide-react';

interface ProjectEvaluationModalProps {
  projectId: string;
  onClose: () => void;
}

export const ProjectEvaluationModal: React.FC<ProjectEvaluationModalProps> = ({ projectId, onClose }) => {
  const { currentUser } = useAuthStore();
  const { projects } = useProjectStore();
  const { projectContexts, saveProjectContext } = useEvaluationStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  
  const project = projects.find(p => p.id === projectId);
  
  const existingContext = projectContexts.find(
    c => c.projectId === projectId && c.evaluationPeriodId === 'default_period'
  );

  const [projectConditionSummary, setProjectConditionSummary] = useState(existingContext?.projectConditionSummary || '');
  const [scheduleDifficultyComment, setScheduleDifficultyComment] = useState(existingContext?.scheduleDifficultyComment || '');
  const [scopeDifficultyComment, setScopeDifficultyComment] = useState(existingContext?.scopeDifficultyComment || '');

  if (!project) return null;

  const handleSave = () => {
    saveProjectContext({
      evaluationPeriodId: 'default_period',
      projectId: project.id,
      pmId: project.pmId || currentUser?.id || 'UNKNOWN',
      departmentId: project.departmentId,
      projectConditionSummary,
      scheduleDifficultyComment,
      scopeDifficultyComment
    });
    alert(t('alert.evalSaved'));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-[var(--color-surface)] rounded-[20px] shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="eval-modal-title">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
          <div className="flex items-center gap-2 text-blue-800 font-bold">
            <FileText className="w-5 h-5" />
            <h3 id="eval-modal-title">{t('evaluation.eval.pmOpinionTitle')}</h3>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-[var(--color-text-sub)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-2">
            <p className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: t('evaluation.eval.pmOpinionDesc') }} />
          </div>

          <div>
            <label htmlFor="eval-summary" className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('evaluation.eval.summaryLabel')}</label>
            <textarea 
              id="eval-summary"
              value={projectConditionSummary}
              onChange={(e) => setProjectConditionSummary(e.target.value)}
              placeholder={t('evaluation.eval.summaryPlaceholder')}
              rows={4}
              className="w-full border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>

          <div>
            <label htmlFor="eval-schedule" className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('evaluation.eval.scheduleLabel')}</label>
            <textarea 
              id="eval-schedule"
              value={scheduleDifficultyComment}
              onChange={(e) => setScheduleDifficultyComment(e.target.value)}
              placeholder={t('evaluation.eval.schedulePlaceholder')}
              rows={3}
              className="w-full border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>

          <div>
            <label htmlFor="eval-scope" className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('evaluation.eval.scopeLabel')}</label>
            <textarea 
              id="eval-scope"
              value={scopeDifficultyComment}
              onChange={(e) => setScopeDifficultyComment(e.target.value)}
              placeholder={t('evaluation.eval.scopePlaceholder')}
              rows={3}
              className="w-full border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[var(--color-text-sub)] hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {t('evaluation.eval.saveOpinion')}
          </button>
        </div>
      </div>
    </div>
  );
};
