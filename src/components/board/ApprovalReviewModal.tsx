import React, { useState } from 'react';
import { ApprovalRequest } from '@/types/models';
import { useAuthStore } from '@/store/authStore';
import { useApprovalStore } from '@/store/approvalStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { X, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  request: ApprovalRequest;
  onClose: () => void;
}

export const ApprovalReviewModal: React.FC<Props> = ({ request, onClose }) => {
  const { currentUser } = useAuthStore();
  const { updateApprovalStatus } = useApprovalStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const [comment, setComment] = useState('');

  const handleApprove = () => {
    if (!currentUser) return;
    updateApprovalStatus(request.id, 'APPROVED', currentUser.id, comment);
    alert(t('board.approval.approvedAlert'));
    onClose();
  };

  const handleReject = () => {
    if (!currentUser) return;
    if (!comment.trim()) {
      alert(t('board.approval.rejectReasonRequired'));
      return;
    }
    updateApprovalStatus(request.id, 'REJECTED', currentUser.id, comment);
    alert(t('board.approval.rejectedAlert'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg)]/50">
          <h2 className="text-lg font-bold text-[var(--color-text-main)]">{t('board.approval.title')}</h2>
          <button onClick={onClose} className="text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-[var(--color-bg)] p-4 rounded-lg border border-[var(--color-border)] text-sm space-y-2">
            <div>
              <span className="text-[var(--color-text-sub)] block mb-1">{t('board.approval.reqTitle')}</span>
              <span className="font-bold text-[var(--color-text-main)]">{request.title}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-sub)] block mb-1">{t('board.approval.detailReason')}</span>
              <span className="text-[var(--color-text-main)] whitespace-pre-wrap">{request.reason}</span>
            </div>
            {request.requestedStartDate && request.requestedDueDate && (
              <div>
                <span className="text-[var(--color-text-sub)] block mb-1">{t('board.approval.hopeDate')}</span>
                <span className="text-blue-600 font-bold">{request.requestedStartDate} ~ {request.requestedDueDate}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.approval.reviewComment')}</label>
            <textarea 
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-lg p-3 text-sm outline-none min-h-[80px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              placeholder={t('board.approval.reviewCommentPlaceholder')}
            />
          </div>
        </div>

        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]/50 flex justify-end gap-3">
          <button onClick={handleReject} className="flex items-center gap-1 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none">
            <XCircle className="w-4 h-4" /> {t('board.approval.reject')}
          </button>
          <button onClick={handleApprove} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none">
            <CheckCircle className="w-4 h-4" /> {t('board.approval.approve')}
          </button>
        </div>
      </div>
    </div>
  );
};
