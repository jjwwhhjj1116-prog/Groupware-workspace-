'use client';
import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useApprovalStore } from '@/store/approvalStore';
import { ApprovalRequestType } from '@/types/models';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export default function ApprovalsPage() {
  const { currentUser, users } = useAuthStore();
  const { requests, updateApprovalStatus } = useApprovalStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('header.loginRequired')}</div>;
  
  const isDeputyOf = (targetUserId?: string) => {
    if (!targetUserId) return false;
    const targetUser = users.find(u => u.id === targetUserId);
    return targetUser?.deputyApproverId === currentUser?.id;
  };

  const hasApprovalRights = ['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'PM'].includes(currentUser.role) || users.some(u => u.deputyApproverId === currentUser.id);
  if (!hasApprovalRights) {
    return <div className="py-10 text-center text-[var(--color-danger)] font-bold">{t('approvals.noPermission')}</div>;
  }

  // Only show requests pending for this manager or super admin, or PM
  const pendingRequests = requests.filter(r => 
    (r.status === 'PENDING' && (r.pmId === currentUser.id || isDeputyOf(r.pmId))) ||
    (r.status === 'MANAGER_REVIEWING' && (r.managerId === currentUser.id || isDeputyOf(r.managerId))) ||
    (r.status === 'PENDING' && (r.managerId === currentUser.id || isDeputyOf(r.managerId)) && !r.pmId) || // No PM, goes straight to manager
    (currentUser.role === 'SUPER_ADMIN' && ['PENDING', 'MANAGER_REVIEWING'].includes(r.status))
  );
  
  const completedRequests = requests.filter(r => !['PENDING', 'MANAGER_REVIEWING'].includes(r.status));

  const handleAction = (id: string, action: 'APPROVED' | 'REJECTED', alternativeType?: ApprovalRequestType) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    let comment = '';
    if (action === 'REJECTED' || alternativeType) {
      comment = window.prompt(action === 'REJECTED' ? t('approvals.promptReject') : t('approvals.promptAlt')) || '';
      if (!comment) {
        alert(t('approvals.alertReasonRequired'));
        return;
      }
    }

    let nextStatus: 'APPROVED' | 'REJECTED' | 'MANAGER_REVIEWING' = action;
    
    const isPmApproval = req.pmId === currentUser.id || isDeputyOf(req.pmId);

    // If PM is approving, it goes to Manager
    if (action === 'APPROVED' && isPmApproval && req.managerId && req.status === 'PENDING') {
      nextStatus = 'MANAGER_REVIEWING';
      comment = comment || 'PM (또는 대리 결재자) 1차 승인';
    }

    updateApprovalStatus(id, nextStatus, currentUser.id, comment, alternativeType);
  };

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-4">{t('approvals.pendingTitle')}</h1>
        <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg)] border-b">
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('approvals.colType')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('approvals.colRequest')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('approvals.colReason')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('approvals.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-[var(--color-text-sub)]">{t('approvals.emptyPending')}</td>
                </tr>
              ) : (
                pendingRequests.map(r => (
                  <tr key={r.id} className="border-b hover:bg-[var(--color-bg)]">
                    <td className="p-4 font-medium text-[var(--color-text-main)]">{r.type}</td>
                    <td className="p-4 text-sm text-[var(--color-text-main)]">{r.title}</td>
                    <td className="p-4 text-sm text-[var(--color-text-sub)] max-w-lg truncate" title={r.reason}>{r.reason}</td>
                    <td className="p-4 space-x-2 flex flex-wrap gap-2 items-center">
                      <button onClick={() => handleAction(r.id, 'APPROVED')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors">{t('board.approval.approve')}</button>
                      <button onClick={() => handleAction(r.id, 'REJECTED')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-100 transition-colors">{t('board.approval.reject')}</button>
                      
                      {hasApprovalRights && (
                        <>
                          {r.type === 'OVERTIME_REQUEST' && (
                            <button onClick={() => handleAction(r.id, 'APPROVED', 'DEADLINE_EXTENSION')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-amber-100 text-amber-700 border border-amber-200 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-amber-200 transition-colors">
                              {t('approvals.btnAltExt')}
                            </button>
                          )}
                          {r.type === 'DEADLINE_EXTENSION' && (
                            <button onClick={() => handleAction(r.id, 'APPROVED', 'MANPOWER_SUPPORT')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-amber-100 text-amber-700 border border-amber-200 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-amber-200 transition-colors">
                              {t('approvals.btnAltSup')}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-4">{t('approvals.recentTitle')}</h2>
        <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg)] border-b">
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('approvals.colTitle')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('approvals.colResult')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('approvals.colComment')}</th>
              </tr>
            </thead>
            <tbody>
              {completedRequests.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-[var(--color-text-sub)]">{t('approvals.emptyRecent')}</td>
                </tr>
              ) : (
                completedRequests.map(r => (
                  <tr key={r.id} className="border-b hover:bg-[var(--color-bg)]">
                    <td className="p-4 font-medium text-[var(--color-text-main)]">{r.title}</td>
                    <td className="p-4 text-sm font-bold">
                      <span className={r.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}>
                        {r.status} {r.alternativeType ? t('approvals.altPrefix', { type: r.alternativeType }) : ''}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--color-text-sub)]">{r.reviewComment}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
