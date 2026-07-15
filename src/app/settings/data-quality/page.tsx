'use client';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDataQualityStore } from '@/store/dataQualityStore';
import { ShieldAlert, AlertTriangle, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function DataQualityPage() {
  const { settings: translationSettings } = useTranslationStore();
  const t = useTranslation(translationSettings?.uiLanguage || 'ko');

  const { currentUser } = useAuthStore();
  const { checks, lastCheckTime, runChecks, resolveCheck, ignoreCheck } = useDataQualityStore();
  
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('OPEN');

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('settings.personnel.authRequired')}</div>;
  if (!['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return <div className="py-10 text-center text-[var(--color-danger)] font-bold">{t('settings.permissions.permissionDenied')}</div>;
  }

  const filteredChecks = checks.filter(c => {
    if (filterCategory !== 'ALL' && c.category !== filterCategory) return false;
    if (filterSeverity !== 'ALL' && c.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    return true;
  });

  const blockerCount = checks.filter(c => c.severity === 'BLOCKER' && c.status === 'OPEN').length;
  const errorCount = checks.filter(c => c.severity === 'ERROR' && c.status === 'OPEN').length;
  const warningCount = checks.filter(c => c.severity === 'WARNING' && c.status === 'OPEN').length;
  const resolvedCount = checks.filter(c => c.status === 'RESOLVED').length;

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-[var(--color-surface)] p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-main)]">{t('settings.dataQuality.title')}</h1>
            <p className="text-xs text-[var(--color-text-sub)]">
              {t('settings.dataQuality.lastCheckPrefix')}{lastCheckTime ? new Date(lastCheckTime).toLocaleString() : t('settings.dataQuality.noRecord')}
            </p>
          </div>
        </div>
        
        <button 
          onClick={runChecks}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-bold text-white shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t('settings.dataQuality.btnRunChecks')}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface)] p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <div className="text-[var(--color-text-sub)] text-xs font-bold mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> {t('settings.dataQuality.totalChecks')}
          </div>
          <div className="text-2xl font-extrabold text-[var(--color-text-main)]">{checks.length}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm flex flex-col justify-between">
          <div className="text-red-500 text-xs font-bold mb-1">BLOCKER</div>
          <div className="text-2xl font-extrabold text-red-600">{blockerCount}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-between">
          <div className="text-orange-500 text-xs font-bold mb-1">ERROR / WARNING</div>
          <div className="text-2xl font-extrabold text-orange-600">{errorCount + warningCount}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm flex flex-col justify-between">
          <div className="text-green-600 text-xs font-bold mb-1">{t('settings.dataQuality.resolved')}</div>
          <div className="text-2xl font-extrabold text-green-700">{resolvedCount}</div>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-[var(--color-bg)] flex gap-4">
          <select 
            value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-main)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <option value="ALL">{t('settings.dataQuality.filterAllCategories')}</option>
            <option value="PERSONNEL">{t('settings.dataQuality.filterCategoryPersonnel')}</option>
            <option value="PROJECT">{t('settings.dataQuality.filterCategoryProject')}</option>
            <option value="SCHEDULE">{t('settings.dataQuality.filterCategorySchedule')}</option>
          </select>

          <select 
            value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-main)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <option value="ALL">{t('settings.dataQuality.filterAllSeverities')}</option>
            <option value="BLOCKER">BLOCKER</option>
            <option value="ERROR">ERROR</option>
            <option value="WARNING">WARNING</option>
          </select>

          <select 
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-main)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <option value="ALL">{t('settings.dataQuality.filterAllStatuses')}</option>
            <option value="OPEN">{t('settings.dataQuality.filterStatusOpen')}</option>
            <option value="RESOLVED">{t('settings.dataQuality.filterStatusResolved')}</option>
            <option value="IGNORED">{t('settings.dataQuality.filterStatusIgnored')}</option>
          </select>
        </div>

        <div className="divide-y">
          {filteredChecks.map(check => (
            <div key={check.id} className={`p-5 transition-colors ${check.status !== 'OPEN' ? 'opacity-50 bg-[var(--color-bg)]' : 'hover:bg-[var(--color-bg)]'}`}>
              <div className="flex gap-4">
                <div className="pt-1">
                  {check.severity === 'BLOCKER' ? <ShieldAlert className="w-5 h-5 text-red-500" /> :
                   check.severity === 'ERROR' ? <AlertCircle className="w-5 h-5 text-orange-500" /> :
                   <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-gray-200 text-[var(--color-text-main)] text-[10px] font-bold rounded mb-1 mr-2">
                        {check.category}
                      </span>
                      <h4 className={`font-bold inline-block ${check.severity === 'BLOCKER' ? 'text-red-700' : 'text-[var(--color-text-main)]'}`}>
                        {check.title}
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      {check.status === 'OPEN' && (
                        <>
                          <button onClick={() => ignoreCheck(check.id)} className="text-xs px-3 py-1.5 rounded border text-[var(--color-text-sub)] hover:bg-gray-100 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{t('settings.dataQuality.btnIgnore')}</button>
                          <button onClick={() => resolveCheck(check.id)} className="text-xs px-3 py-1.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                            <CheckCircle2 className="w-3 h-3" /> {t('settings.dataQuality.resolved')}
                          </button>
                        </>
                      )}
                      {check.status !== 'OPEN' && (
                        <span className="text-xs font-bold text-[var(--color-text-sub)] border px-2 py-1 rounded bg-[var(--color-surface)]">{check.status}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-[var(--color-text-sub)] mt-2">{check.description}</p>
                  
                  {check.suggestedFix && (
                    <div className="mt-3 text-xs bg-blue-50 text-blue-800 p-2.5 rounded-lg border border-blue-100 flex items-start gap-2">
                      <span className="font-bold shrink-0">{t('settings.dataQuality.suggestedFix')}</span>
                      <span>{check.suggestedFix}</span>
                    </div>
                  )}

                  {check.relatedEntityType && (
                    <div className="mt-3 text-xs flex gap-2">
                      <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] text-indigo-600 hover:underline">
                        {t('settings.dataQuality.viewEntityDetailsPrefix')}{check.relatedEntityType}{t('settings.dataQuality.viewEntityDetailsSuffix')} ({check.relatedEntityId})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredChecks.length === 0 && (
            <div className="p-12 text-center text-[var(--color-text-sub)] font-medium">
              {t('settings.dataQuality.noResult')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
