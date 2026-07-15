import React, { useState } from 'react';
import { useEvaluationStore } from '@/store/evaluationStore';
import { useAuthStore } from '@/store/authStore';
import { TaskCard } from '@/types/models';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { X, Save, AlertTriangle } from 'lucide-react';

interface QcIssueModalProps {
  task: TaskCard;
  onClose: () => void;
}

export const QcIssueModal: React.FC<QcIssueModalProps> = ({ task, onClose }) => {
  const { currentUser } = useAuthStore();
  const { addQcIssue } = useEvaluationStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const [issueStage, setIssueStage] = useState<'SUBMISSION_REVIEW' | 'FINAL_REVIEW' | 'DELIVERY_REVIEW' | 'POST_DELIVERY'>('SUBMISSION_REVIEW');
  const [issueType, setIssueType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [weightPercent, setWeightPercent] = useState<number>(25);

  const handleSave = () => {
    if (!title.trim() || !description.trim()) {
      alert(t('alert.requireTitleDesc'));
      return;
    }

    addQcIssue({
      evaluationPeriodId: 'default_period', // MVP uses a default period
      projectId: task.projectId,
      taskId: task.id,
      assigneeId: task.assigneeId || 'UNKNOWN',
      reportedBy: currentUser?.id || 'UNKNOWN',
      issueStage,
      issueType: issueType || 'GENERAL',
      title,
      description,
      severity,
      weightPercent,
    });

    alert(t('alert.qcIssueSubmitted'));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4" onMouseDown={onClose}>
      <div className="bg-[var(--color-surface)] rounded-[20px] shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--color-border)] bg-red-50">
          <div className="flex items-center gap-2 text-red-700 font-bold">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            <h3>{t('evaluation.qc.issueTitle')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-red-100 rounded-full transition-colors text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('evaluation.qc.stage')}</label>
            <select 
              value={issueStage} 
              onChange={(e) => setIssueStage(e.target.value as 'SUBMISSION_REVIEW' | 'FINAL_REVIEW' | 'DELIVERY_REVIEW' | 'POST_DELIVERY')}
              className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            >
              <option value="SUBMISSION_REVIEW">{t('evaluation.qc.stage1')}</option>
              <option value="FINAL_REVIEW">{t('evaluation.qc.stage2')}</option>
              <option value="DELIVERY_REVIEW">{t('evaluation.qc.stage3')}</option>
              <option value="POST_DELIVERY">{t('evaluation.qc.stage4')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('evaluation.qc.titleLabel')}</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('evaluation.qc.titlePlaceholder')}
              className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('evaluation.qc.descLabel')}</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('evaluation.qc.descPlaceholder')}
              rows={3}
              className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('evaluation.qc.severity')}</label>
              <select 
                value={severity} 
                onChange={(e) => setSeverity(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')}
                className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
              >
                <option value="LOW">{t('evaluation.qc.sevLow')}</option>
                <option value="MEDIUM">{t('evaluation.qc.sevMedium')}</option>
                <option value="HIGH">{t('evaluation.qc.sevHigh')}</option>
                <option value="CRITICAL">{t('evaluation.qc.sevCritical')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('evaluation.qc.weight')}</label>
              <select 
                value={weightPercent} 
                onChange={(e) => setWeightPercent(Number(e.target.value))}
                className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 bg-red-50"
              >
                <option value={100}>{t('evaluation.qc.weight100')}</option>
                <option value={50}>{t('evaluation.qc.weight50')}</option>
                <option value={25}>{t('evaluation.qc.weight25')}</option>
                <option value={10}>{t('evaluation.qc.weight10')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[var(--color-text-sub)] hover:bg-gray-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            {t('evaluation.qc.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};
