import React, { useState } from 'react';
import { TaskCard, ApprovalRequestType } from '@/types/models';
import { useAuthStore } from '@/store/authStore';
import { useApprovalStore } from '@/store/approvalStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { X, Calendar, Clock, Users, CalendarClock } from 'lucide-react';

interface Props {
  task: TaskCard;
  type: ApprovalRequestType;
  onClose: () => void;
}

export const ScheduleRequestModal: React.FC<Props> = ({ task, type, onClose }) => {
  const { currentUser } = useAuthStore();
  const { addRequest } = useApprovalStore();
  const { addNotification } = useNotificationStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  const [reason, setReason] = useState('');
  const [requestedStartDate, setRequestedStartDate] = useState(task.startDate || '');
  const [requestedDueDate, setRequestedDueDate] = useState(task.dueDate || '');

  const getTitle = () => {
    switch (type) {
      case 'DEADLINE_EXTENSION': return t('board.schedReq.extTitle');
      case 'OVERTIME_REQUEST': return t('board.schedReq.overtimeTitle');
      case 'MANPOWER_SUPPORT': return t('board.schedReq.supportTitle');
      case 'SCHEDULE_REPLAN': return t('board.schedReq.replanTitle');
      default: return t('board.schedReq.defaultTitle');
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'DEADLINE_EXTENSION': return <Calendar className="w-5 h-5 text-red-600" />;
      case 'OVERTIME_REQUEST': return <Clock className="w-5 h-5 text-orange-600" />;
      case 'MANPOWER_SUPPORT': return <Users className="w-5 h-5 text-purple-600" />;
      case 'SCHEDULE_REPLAN': return <CalendarClock className="w-5 h-5 text-blue-600" />;
      default: return null;
    }
  };

  const handleSave = () => {
    if (!reason.trim()) {
      alert(t('board.schedReq.alertReqReason'));
      return;
    }
    if (!currentUser) return;

    if (type === 'SCHEDULE_REPLAN' || type === 'DEADLINE_EXTENSION') {
      if (requestedStartDate > requestedDueDate) {
        alert(t('board.dispatch.alertInvalidDate'));
        return;
      }
    }

    addRequest({
      type,
      taskId: task.id,
      projectId: task.projectId,
      requestedBy: currentUser.id,
      pmId: task.pmId,
      managerId: task.managerId,
      title: `[${getTitle()}] ${task.title}`,
      reason,
      requestedStartDate: (type === 'SCHEDULE_REPLAN' || type === 'DEADLINE_EXTENSION') ? requestedStartDate : undefined,
      requestedDueDate: (type === 'SCHEDULE_REPLAN' || type === 'DEADLINE_EXTENSION') ? requestedDueDate : undefined,
    });

    // Notify PM or Department Manager
    const notifyTargetId = task.pmId || task.managerId;
    if (notifyTargetId) {
      addNotification({
        userId: notifyTargetId,
        type: 'APPROVAL_REQUEST',
        title: '새로운 신청 접수',
        message: `${currentUser.name} 작업자가 [${task.title}] 업무에 대해 ${getTitle()}을 접수했습니다.`,
        priority: 'HIGH',
        relatedTaskId: task.id,
      });
    }

    console.log(`[AuditLog] User ${currentUser.id} created request ${type} for task ${task.id}`);

    alert(t('board.schedReq.alertSubmitted'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg)]/50">
          <div className="flex items-center gap-2">
            {getIcon()}
            <h2 className="text-lg font-bold text-[var(--color-text-main)]">{getTitle()}</h2>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-[var(--color-bg)] p-3 rounded-lg border border-[var(--color-border)] text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-sub)]">{t('board.schedReq.targetTask')}</span>
              <span className="font-bold">{task.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-sub)]">{t('board.schedReq.currentSched')}</span>
              <span className="font-medium text-[var(--color-text-main)]">{task.startDate} ~ {task.dueDate}</span>
            </div>
          </div>

          {(type === 'SCHEDULE_REPLAN' || type === 'DEADLINE_EXTENSION') && (
            <div className="grid grid-cols-2 gap-4">
              {type === 'SCHEDULE_REPLAN' && (
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.schedReq.hopeStart')}</label>
                  <input 
                    type="date" 
                    value={requestedStartDate}
                    onChange={e => setRequestedStartDate(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                  />
                </div>
              )}
              <div className={type === 'DEADLINE_EXTENSION' ? 'col-span-2' : ''}>
                <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.schedReq.hopeEnd')}</label>
                <input 
                  type="date" 
                  value={requestedDueDate}
                  onChange={e => setRequestedDueDate(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-sub)] mb-1">{t('board.schedReq.reasonLabel')}</label>
            <textarea 
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-lg p-3 text-sm outline-none min-h-[100px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              placeholder={t('board.schedReq.reasonPlaceholder')}
            />
          </div>
        </div>

        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none">
            {t('common.cancel')}
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none">
            {t('board.schedReq.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};
