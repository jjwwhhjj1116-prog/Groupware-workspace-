'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { useImportStore } from '@/store/importStore';
import { AlertCircle, FileUp, Info, Play, AlertTriangle, ShieldAlert } from 'lucide-react';
import { applyImportData, WorkspaceExportData } from '@/lib/jsonHandoff';

export default function ImportPreviewPage() {
  const { settings: translationSettings } = useTranslationStore();
  const t = useTranslation(translationSettings?.uiLanguage || 'ko');

  const { currentUser } = useAuthStore();
  const { sessions, issues, updateSessionStatus, resolveIssue, ignoreIssue } = useImportStore();
  
  const [activeSessionId] = useState<string>(sessions[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ISSUES' | 'PERSONNEL_MATCH' | 'PROJECT_MATCH'>('OVERVIEW');

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('settings.personnel.authRequired')}</div>;
  if (!['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return <div className="py-10 text-center text-[var(--color-danger)] font-bold">{t('settings.permissions.permissionDenied')}</div>;
  }

  const session = sessions.find(s => s.id === activeSessionId);
  const sessionIssues = issues.filter(i => i.importSessionId === activeSessionId);

  const blockerCount = sessionIssues.filter(i => i.severity === 'BLOCKER' && i.status === 'OPEN').length;
  const warningCount = sessionIssues.filter(i => i.severity === 'WARNING' && i.status === 'OPEN').length;

  const handleApply = () => {
    if (blockerCount > 0) {
      alert(t('settings.import.alertBlocker'));
      return;
    }
    const confirm = window.confirm(t('settings.import.alertConfirm'));
    if (confirm && session) {
      // In a real scenario, pendingData would be set when a file is uploaded.
      // Since it's mock for now, we only apply if pendingData exists.
      const { pendingData } = useImportStore.getState();
      if (pendingData) {
        applyImportData(pendingData as WorkspaceExportData);
      } else {
        // Fallback for mock demo: just set status without applying data
        alert(t('settings.import.alertFallback'));
      }
      updateSessionStatus(session.id, 'APPLIED');
    }
  };

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-[var(--color-surface)] p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-main)]">{t('settings.import.title')}</h1>
            <p className="text-xs text-[var(--color-text-sub)]">{t('settings.import.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded-lg text-sm font-bold text-[var(--color-text-main)] hover:bg-[var(--color-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
            {t('settings.import.btnUpload')}
          </button>
          <button 
            onClick={handleApply}
            disabled={!session || session.status === 'APPLIED' || blockerCount > 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 ${
              !session || session.status === 'APPLIED' || blockerCount > 0 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Play className="w-4 h-4" />
            {session?.status === 'APPLIED' ? t('settings.import.btnApplied') : t('settings.import.btnApply')}
          </button>
        </div>
      </div>

      {!session ? (
        <div className="bg-[var(--color-surface)] p-12 rounded-xl border text-center text-[var(--color-text-sub)]">
          {t('settings.import.noSession')}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="col-span-1 space-y-4">
            <div className="bg-[var(--color-surface)] rounded-xl border shadow-sm p-4">
              <h3 className="font-bold text-[var(--color-text-main)] mb-4 border-b pb-2">{t('settings.import.summaryTitle')}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-sub)]">{t('settings.import.lblFile')}</span>
                  <span className="font-medium text-[var(--color-text-main)] truncate ml-2" title={session.fileName}>{session.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-sub)]">{t('settings.import.lblTargetSheet')}</span>
                  <span className="font-medium text-[var(--color-text-main)]">{session.targetSheet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-sub)]">{t('settings.import.lblStatus')}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    session.status === 'APPLIED' ? 'bg-green-100 text-green-700' :
                    session.status === 'VALIDATED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {session.status}
                  </span>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold text-[var(--color-text-main)]">
                  <span>{t('settings.import.lblTotalRows')}</span>
                  <span>{session.totalRows.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-xl border shadow-sm p-2 flex flex-col gap-1">
              {[
                { id: 'OVERVIEW', label: t('settings.import.tabOverview') },
                { id: 'ISSUES', label: `${t('settings.import.tabIssues')} (${sessionIssues.length})` },
                { id: 'PERSONNEL_MATCH', label: t('settings.import.tabPersonnel') },
                { id: 'PROJECT_MATCH', label: t('settings.import.tabProject') }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'OVERVIEW' | 'ISSUES' | 'PERSONNEL_MATCH' | 'PROJECT_MATCH')}
                  className={`text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                    activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-3 space-y-4">
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-[var(--color-surface)] p-4 rounded-xl border shadow-sm">
                    <div className="text-[var(--color-text-sub)] text-xs font-bold mb-1">{t('settings.import.totalAssignments')}</div>
                    <div className="text-2xl font-extrabold text-[var(--color-text-main)]">{session.totalAssignments.toLocaleString()}</div>
                  </div>
                  <div className="bg-[var(--color-surface)] p-4 rounded-xl border shadow-sm">
                    <div className="text-[var(--color-text-sub)] text-xs font-bold mb-1">{t('settings.import.totalPersonnel')}</div>
                    <div className="text-2xl font-extrabold text-[var(--color-text-main)]">{session.totalPersonnel}</div>
                  </div>
                  <div className="bg-[var(--color-surface)] p-4 rounded-xl border shadow-sm">
                    <div className="text-[var(--color-text-sub)] text-xs font-bold mb-1">{t('settings.import.totalProjects')}</div>
                    <div className="text-2xl font-extrabold text-[var(--color-text-main)]">{session.totalProjects}</div>
                  </div>
                  <div className="bg-[var(--color-surface)] p-4 rounded-xl border shadow-sm bg-red-50/50">
                    <div className="text-red-500 text-xs font-bold mb-1">{t('settings.import.lblBlockerIssues')}</div>
                    <div className="text-2xl font-extrabold text-red-600">{blockerCount}</div>
                  </div>
                </div>

                <div className="bg-[var(--color-surface)] rounded-xl border shadow-sm p-6">
                  <h3 className="font-bold text-[var(--color-text-main)] mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-indigo-500" />
                    {t('settings.import.guideNextTitle')}
                  </h3>
                  <p className="text-sm text-[var(--color-text-sub)] mb-4 leading-relaxed">
                    {t('settings.import.guideNextDesc1')} <br/>
                    <span>
                      {t('settings.import.guideNextDesc2_1')}
                      <strong>{t('settings.import.guideNextDesc2_strong')}</strong>
                      {t('settings.import.guideNextDesc2_2')}
                    </span><br/>
                    <span>
                      {t('settings.import.guideNextDesc3_1')}
                      <strong>{t('settings.import.guideNextDesc3_strong')}</strong>
                      {t('settings.import.guideNextDesc3_2')}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'ISSUES' && (
              <div className="bg-[var(--color-surface)] rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-[var(--color-bg)] flex justify-between items-center">
                  <h3 className="font-bold text-[var(--color-text-main)]">{t('settings.import.listTitle')}</h3>
                  <div className="flex gap-4 text-sm font-medium">
                    <span className="text-red-600 flex items-center gap-1"><ShieldAlert className="w-4 h-4"/> {t('settings.import.lblBlocker')}: {blockerCount}</span>
                    <span className="text-orange-500 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> {t('settings.import.lblWarning')}: {warningCount}</span>
                  </div>
                </div>
                <div className="divide-y">
                  {sessionIssues.map(issue => (
                    <div key={issue.id} className={`p-4 transition-colors ${issue.status === 'RESOLVED' ? 'opacity-50 bg-[var(--color-bg)]' : 'hover:bg-[var(--color-bg)]'}`}>
                      <div className="flex gap-4">
                        <div className="pt-1">
                          {issue.severity === 'BLOCKER' ? <ShieldAlert className="w-5 h-5 text-red-500" /> :
                           issue.severity === 'ERROR' ? <AlertCircle className="w-5 h-5 text-orange-500" /> :
                           <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className={`font-bold text-sm ${issue.severity === 'BLOCKER' ? 'text-red-700' : 'text-[var(--color-text-main)]'}`}>
                              [{issue.issueType}] {issue.title}
                            </h4>
                            <div className="flex gap-2">
                              {issue.status === 'OPEN' && (
                                <>
                                  <button onClick={() => ignoreIssue(issue.id, currentUser.id)} className="text-xs px-2 py-1 rounded border text-[var(--color-text-sub)] hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{t('settings.import.btnIgnore')}</button>
                                  <button onClick={() => resolveIssue(issue.id, currentUser.id)} className="text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{t('settings.import.btnResolve')}</button>
                                </>
                              )}
                              {issue.status !== 'OPEN' && (
                                <span className="text-xs font-bold text-[var(--color-text-sub)] border px-2 py-1 rounded">{issue.status}</span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-[var(--color-text-sub)] mt-1">{issue.description}</p>
                          {issue.suggestedFix && (
                            <div className="mt-3 text-xs bg-blue-50 text-blue-800 p-2 rounded border border-blue-100">
                              <span className="font-bold">{t('settings.import.guidePrefix')}</span> {issue.suggestedFix}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-[var(--color-text-sub)] font-mono">
                            {t('settings.import.locationPrefix')} &quot;{issue.sourceSheet || t('settings.import.na')}&quot;, {t('settings.import.row')} {issue.sourceRow || t('settings.import.na')} {issue.sourceColumn ? `, ${t('settings.import.col')} ${issue.sourceColumn}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sessionIssues.length === 0 && (
                    <div className="p-12 text-center text-[var(--color-text-sub)]">{t('settings.import.noIssues')}</div>
                  )}
                </div>
              </div>
            )}

            {(activeTab === 'PERSONNEL_MATCH' || activeTab === 'PROJECT_MATCH') && (
              <div className="bg-[var(--color-surface)] p-12 rounded-xl border shadow-sm text-center text-[var(--color-text-sub)]">
                {activeTab === 'PERSONNEL_MATCH' ? t('settings.import.mockPersonnel') : t('settings.import.mockProject')} <br/> {t('settings.import.mockPreparing')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
