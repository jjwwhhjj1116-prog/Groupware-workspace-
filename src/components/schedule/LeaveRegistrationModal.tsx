import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useApprovalStore } from '@/store/approvalStore';

import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { X, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaveRegistrationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentUser, users } = useAuthStore();
  const { addSchedule } = useScheduleStore();
  const { addRequest } = useApprovalStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  
  const [scheduleType, setScheduleType] = useState<'OFF' | 'ETC'>('OFF');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen || !currentUser) return null;

  const approverId = users.find(u => u.role === 'SUPER_ADMIN' || u.role === 'DEPARTMENT_MANAGER')?.id || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      alert(t('alert.requireFields'));
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert(t('board.dispatch.alertInvalidDate'));
      return;
    }

    const startDateTime = `${startDate}T00:00:00Z`;
    const endDateTime = `${endDate}T23:59:59Z`;

    addSchedule({
      userId: currentUser.id,
      ownerRole: currentUser.role,
      departmentId: currentUser.departmentId,
      title: `[${scheduleType === 'OFF' ? '휴가' : '일정'}] ${reason}`,
      description: reason,
      scheduleType,
      startDateTime,
      endDateTime,
      isAllDay: true,
      visibility: 'DEPARTMENT',
      requiresApproval: true,
    });

    addRequest({
      type: 'SCHEDULE_APPROVAL',
      requestedBy: currentUser.id,
      managerId: approverId,
      title: `[${scheduleType === 'OFF' ? '휴가' : '일정'}] ${reason}`,
      reason: `${startDate} ~ ${endDate}\n사유: ${reason}`,
      projectId: 'schedule'
    });

    alert(t('alert.leaveSubmitted'));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-[var(--color-surface)] rounded-[20px] shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="leave-modal-title">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <CalendarIcon className="w-5 h-5" />
            <h3 id="leave-modal-title">{t('schedule.leave.title')}</h3>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-[var(--color-text-sub)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-6 py-6 overflow-y-auto max-h-[70vh]">
          <form id="leave-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="leave-type" className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('schedule.leave.type')}</label>
              <div className="flex gap-4" id="leave-type">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="scheduleType"
                    value="OFF"
                    checked={scheduleType === 'OFF'}
                    onChange={() => setScheduleType('OFF')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{t('schedule.leave.typeOff')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="scheduleType"
                    value="ETC"
                    checked={scheduleType === 'ETC'}
                    onChange={() => setScheduleType('ETC')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{t('schedule.leave.typeEtc')}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('board.process.startLabel')}</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('board.process.endLabel')}</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">{t('schedule.leave.reason')}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('schedule.leave.reasonPlaceholder')}
                className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-sm h-24"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[var(--color-text-sub)] hover:bg-gray-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="leave-form"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <CalendarIcon className="w-4 h-4" />
            {t('schedule.leave.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

