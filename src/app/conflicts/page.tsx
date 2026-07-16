'use client';
import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useConflictStore } from '@/store/conflictStore';
import { ConflictResolutionStatus } from '@/types/models';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export default function ConflictsPage() {
  const { currentUser } = useAuthStore();
  const { conflicts, resolveConflict } = useConflictStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('header.loginRequired')}</div>;
  if (!['SUPER_ADMIN', 'DEPARTMENT_MANAGER', 'PM'].includes(currentUser.role)) {
    return <div className="py-10 text-center text-[var(--color-danger)] font-bold">{t('conflicts.noPermission')}</div>;
  }

  // Filter conflicts for this manager/PM
  // In a real app, we'd check if the conflict belongs to a user under this manager's department or PM's project
  const visibleConflicts = conflicts;
  const pendingConflicts = visibleConflicts.filter(c => c.status === 'PENDING');
  const resolvedConflicts = visibleConflicts.filter(c => c.status !== 'PENDING');

  const handleResolve = (id: string, resolution: ConflictResolutionStatus) => {
    const comment = window.prompt(t('conflicts.promptComment'));
    if (!comment) {
      alert(t('conflicts.alertCommentRequired'));
      return;
    }
    resolveConflict(id, resolution, currentUser.id, comment);
  };

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-4">{t('conflicts.title')}</h1>
        <p className="text-sm text-[var(--color-text-sub)] mb-6">{t('conflicts.subtitle')}</p>
        
        <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border overflow-hidden mb-8">
          <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
            <h2 className="font-bold text-red-800">{t('conflicts.pendingCount', { count: pendingConflicts.length.toString() })}</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg)] border-b">
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('conflicts.colTarget')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('conflicts.colPeriod')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('conflicts.colType')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('conflicts.colContent')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('conflicts.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {pendingConflicts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[var(--color-text-sub)]">{t('conflicts.emptyPending')}</td>
                </tr>
              ) : (
                pendingConflicts.map(c => (
                  <tr key={c.id} className="border-b hover:bg-[var(--color-bg)]">
                    <td className="p-4 font-medium text-[var(--color-text-main)]">{c.userId}</td>
                    <td className="p-4 text-sm text-[var(--color-text-sub)]">{c.startDate} ~ {c.endDate}</td>
                    <td className="p-4 text-sm text-red-600 font-bold">{c.conflictType}</td>
                    <td className="p-4 text-sm text-[var(--color-text-main)]">{c.description}</td>
                    <td className="p-4 space-y-2">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleResolve(c.id, 'RESOLVED_OVERLAP_ALLOWED')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-gray-100 text-[var(--color-text-main)] px-3 py-1 rounded text-xs hover:bg-gray-200">{t('conflicts.btnOverlapAllowed')}</button>
                        <button onClick={() => handleResolve(c.id, 'RESOLVED_DELAYED')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-200">{t('conflicts.btnDelay')}</button>
                        <button onClick={() => handleResolve(c.id, 'RESOLVED_REASSIGNED')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs hover:bg-purple-200">{t('conflicts.btnReassign')}</button>
                        <button onClick={() => handleResolve(c.id, 'RESOLVED_OVERTIME_APPROVED')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-orange-100 text-orange-700 px-3 py-1 rounded text-xs hover:bg-orange-200">{t('conflicts.btnOvertime')}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-4">{t('conflicts.historyTitle')}</h2>
        <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg)] border-b">
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('conflicts.colTargetPeriod')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('conflicts.colContent')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('conflicts.colStatus')}</th>
                <th className="p-4 text-sm font-semibold text-[var(--color-text-sub)]">{t('approvals.colComment')}</th>
              </tr>
            </thead>
            <tbody>
              {resolvedConflicts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-[var(--color-text-sub)]">{t('conflicts.emptyHistory')}</td>
                </tr>
              ) : (
                resolvedConflicts.map(c => (
                  <tr key={c.id} className="border-b hover:bg-[var(--color-bg)]">
                    <td className="p-4">
                      <div className="font-medium text-[var(--color-text-main)]">{c.userId}</div>
                      <div className="text-xs text-[var(--color-text-sub)]">{c.startDate} ~ {c.endDate}</div>
                    </td>
                    <td className="p-4 text-sm text-[var(--color-text-main)]">{c.description}</td>
                    <td className="p-4 text-sm font-bold text-green-600">
                      {c.status}
                    </td>
                    <td className="p-4 text-sm text-[var(--color-text-sub)]">{c.resolutionComment}</td>
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
