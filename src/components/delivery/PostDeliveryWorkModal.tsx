import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { X } from 'lucide-react';

interface Props {
  projectId: string;
  onClose: () => void;
}

export const PostDeliveryWorkModal: React.FC<Props> = ({ projectId, onClose }) => {
  const { currentUser } = useAuthStore();
  const { addPostDeliveryWorkRequest } = useProjectStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number>(0);
  const [impactDeliveryDate, setImpactDeliveryDate] = useState(false);
  const [newSuggestedDeliveryDate, setNewSuggestedDeliveryDate] = useState('');

  if (!currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !reason) {
      alert(t('alert.requireTitleReason'));
      return;
    }
    
    addPostDeliveryWorkRequest({
      projectId,
      requestedBy: currentUser.id,
      title,
      description,
      reason,
      estimatedHours,
      impactDeliveryDate,
      newSuggestedDeliveryDate: impactDeliveryDate ? newSuggestedDeliveryDate : undefined,
    });
    
    alert(t('alert.postWorkSubmitted'));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-[var(--color-surface)] rounded-[20px] shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
          <h2 id="modal-title" className="font-bold text-[var(--color-text-main)]">{t('delivery.postWork.title')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="p-1.5 text-[var(--color-text-sub)] hover:text-[var(--color-text-sub)] rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          <form id="post-delivery-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="post-work-title" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('delivery.postWork.titleLabel')} <span className="text-red-500">*</span></label>
              <input 
                id="post-work-title"
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-[var(--color-border-strong)] rounded p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                placeholder={t('delivery.postWork.titlePlaceholder')}
                required
              />
            </div>
            
            <div>
              <label htmlFor="post-work-reason" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('delivery.postWork.reasonLabel')} <span className="text-red-500">*</span></label>
              <select 
                id="post-work-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-[var(--color-border-strong)] rounded p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                required
              >
                <option value="">{t('delivery.postWork.reasonSelect')}</option>
                <option value="CLIENT_REQUEST">{t('delivery.postWork.reasonClient')}</option>
                <option value="DEFECT_FIX">{t('delivery.postWork.reasonDefect')}</option>
                <option value="SCOPE_CHANGE">{t('delivery.postWork.reasonScope')}</option>
                <option value="ETC">{t('delivery.postWork.reasonEtc')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="post-work-desc" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('delivery.postWork.detailLabel')}</label>
              <textarea 
                id="post-work-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-[var(--color-border-strong)] rounded p-2 text-sm h-24 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                placeholder={t('delivery.postWork.detailPlaceholder')}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="post-work-time" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('delivery.postWork.timeLabel')}</label>
                <div className="flex items-center gap-2">
                  <input 
                    id="post-work-time"
                    type="number" 
                    min="0"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="w-full border border-[var(--color-border-strong)] rounded p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                  />
                  <span className="text-sm text-[var(--color-text-sub)]">{t('delivery.postWork.timeUnit')}</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-bg)] p-3 rounded-lg border border-[var(--color-border)] space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-main)]">
                <input 
                  type="checkbox" 
                  checked={impactDeliveryDate}
                  onChange={(e) => setImpactDeliveryDate(e.target.checked)}
                  className="rounded border-[var(--color-border-strong)] text-indigo-600 focus:ring-indigo-500"
                />
                {t('delivery.postWork.changeDate')}
              </label>
              
              {impactDeliveryDate && (
                <div>
                  <label htmlFor="post-work-new-date" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">{t('delivery.postWork.newDate')}</label>
                  <input 
                    id="post-work-new-date"
                    type="date" 
                    value={newSuggestedDeliveryDate}
                    onChange={(e) => setNewSuggestedDeliveryDate(e.target.value)}
                    className="w-full border border-[var(--color-border-strong)] rounded p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                    required={impactDeliveryDate}
                  />
                </div>
              )}
            </div>
          </form>
        </div>
          
        <div className="px-6 py-4 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--color-text-sub)] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            {t('common.cancel')}
          </button>
          <button type="submit" form="post-delivery-form" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
            {t('delivery.postWork.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};
