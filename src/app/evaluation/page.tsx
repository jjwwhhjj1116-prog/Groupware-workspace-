'use client';

import React, { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useEvaluationStore } from '@/store/evaluationStore';
import { mockEvaluationPolicy } from '@/data/seed/evaluationSeed';
import { generatePerformanceEvaluation } from '@/lib/evaluation/engine';
import { WorkloadUnit, PerformanceEvaluationResult } from '@/lib/evaluation/types';
import { ShieldAlert, CheckCircle2, Lock, Unlock, Search, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/lib/localization';
import { useTranslationStore } from '@/store/translationStore';

export default function EvaluationPage() {
  const { currentUser, users } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { qcIssues, appeals, updateAppealStatus, updateQcIssueWeight } = useEvaluationStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  // MVP: Generate mock workload units (assuming each worker has 100 base workload)
  const mockWorkloads = useMemo(() => {
    return users.map(u => ({
      id: `wl_${u.id}`,
      evaluationPeriodId: 'default_period',
      userId: u.id,
      workloadType: 'MANUAL',
      baseWorkload: 100,
      finalWorkload: 100,
      source: 'MANUAL',
      createdAt: new Date().toISOString()
    } as WorkloadUnit));
  }, [users]);

  // Generate results on the fly
  const evalResults = useMemo(() => {
    const results: PerformanceEvaluationResult[] = users.map(user => 
      generatePerformanceEvaluation(
        user.id, 
        'default_period', 
        user.departmentId, 
        qcIssues, 
        mockWorkloads, 
        mockEvaluationPolicy
      )
    );
    return results;
  }, [users, qcIssues, mockWorkloads]);

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('header.loginRequired')}</div>;

  // Filter based on roles
  const visibleResults = evalResults.filter(res => {
    if (currentUser.role === 'SUPER_ADMIN') return true;
    if (currentUser.role === 'DEPARTMENT_MANAGER') return res.departmentId === currentUser.departmentId;
    return res.userId === currentUser.id;
  });

  const filteredResults = visibleResults.filter(res => 
    res.userId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    res.departmentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgScore = filteredResults.length > 0 
    ? filteredResults.reduce((sum, r) => sum + r.qualityScore, 0) / filteredResults.length
    : 0;

  const myResult = evalResults.find(r => r.userId === currentUser.id);

  const pendingAppeals = appeals.filter(a => a.status === 'PENDING');
  
  const handleReviewAppeal = (appealId: string, isAccepted: boolean) => {
    const appeal = appeals.find(a => a.id === appealId);
    if (!appeal) return;

    const comment = window.prompt(isAccepted ? t('evaluation.promptAccept') : t('evaluation.promptReject'));
    if (comment === null) return;

    if (isAccepted) {
      const newWeightStr = window.prompt(t('evaluation.promptWeight'), '0');
      if (newWeightStr && !isNaN(Number(newWeightStr))) {
        if (appeal.targetIssueId) {
          updateQcIssueWeight(appeal.targetIssueId, Number(newWeightStr));
        }
      }
    }

    updateAppealStatus(appealId, isAccepted ? 'ACCEPTED' : 'REJECTED', currentUser.id, comment);
    alert(t('evaluation.alertProcessed'));
  };

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-[var(--color-surface)] p-5 rounded-xl shadow-sm border border-[var(--color-border)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)] flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" /> {t('evaluation.title')}
          </h1>
          <p className="text-sm text-[var(--color-text-sub)] mt-1">{t('evaluation.subtitle')}</p>
        </div>
        
        {currentUser.role === 'SUPER_ADMIN' && (
          <button 
            onClick={() => setIsLocked(!isLocked)}
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${isLocked ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {isLocked ? t('evaluation.btnUnlock') : t('evaluation.btnLock')}
          </button>
        )}
      </div>

      {(currentUser.role === 'WORKER' || currentUser.role === 'PM') && myResult && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800/50 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-blue-900 dark:text-blue-300">{t('evaluation.myTitle')}</h2>
            <button
              onClick={() => {
                const reason = window.prompt(t('evaluation.promptAppealReason'));
                if (reason) {
                  useEvaluationStore.getState().addAppeal({
                    evaluationPeriodId: 'default_period',
                    userId: currentUser.id,
                    evaluationResultId: myResult.id,
                    reason,
                    requestedBy: currentUser.id
                  });
                  alert(t('evaluation.alertAppealSubmitted'));
                }
              }}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] px-3 py-1.5 text-sm font-bold bg-white text-blue-700 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50"
            >
              {t('evaluation.btnAppeal')}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[var(--color-surface)] p-4 rounded-lg shadow-sm">
              <div className="text-xs text-[var(--color-text-sub)] mb-1">{t('evaluation.lblWorkload')}</div>
              <div className="text-2xl font-bold text-[var(--color-text-main)]">{myResult.totalWorkload}</div>
            </div>
            <div className="bg-[var(--color-surface)] p-4 rounded-lg shadow-sm">
              <div className="text-xs text-[var(--color-text-sub)] mb-1">{t('evaluation.lblWeightedErrors')}</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{myResult.totalWeightedErrorCount.toFixed(1)}</div>
            </div>
            <div className="bg-[var(--color-surface)] p-4 rounded-lg shadow-sm">
              <div className="text-xs text-[var(--color-text-sub)] mb-1">{t('evaluation.lblErrorRate')}</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{myResult.weightedErrorRate.toFixed(2)}%</div>
            </div>
            <div className="bg-[var(--color-surface)] p-4 rounded-lg shadow-sm border-2 border-blue-200 dark:border-blue-700">
              <div className="text-xs text-[var(--color-text-sub)] mb-1">{t('evaluation.lblFinalScore')}</div>
              <div className="text-3xl font-black text-blue-700 dark:text-blue-400">{t('evaluation.lblScoreUnit', { score: myResult.qualityScore.toString() })}</div>
            </div>
          </div>
        </div>
      )}

      {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEPARTMENT_MANAGER') && (
        <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex justify-between items-center">
            <h2 className="font-bold text-[var(--color-text-main)]">{t('evaluation.listTitle')}</h2>
            <div className="flex gap-4 items-center">
              <span className="text-sm font-semibold text-[var(--color-text-sub)] bg-[var(--color-surface)] px-3 py-1 rounded-full border">
                {t('evaluation.listAvg', { score: avgScore.toFixed(1) })}
              </span>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-sub)]" />
                <input 
                  aria-label={t('evaluation.searchPlaceholder')}
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('evaluation.searchPlaceholder')}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] pl-9 pr-4 py-1.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg)] text-[var(--color-text-sub)] font-semibold border-b">
                <tr>
                  <th className="p-4">{t('evaluation.colWorker')}</th>
                  <th className="p-4">{t('evaluation.colDept')}</th>
                  <th className="p-4 text-right">{t('evaluation.colWorkload')}</th>
                  <th className="p-4 text-right">{t('evaluation.colSimpleError')}</th>
                  <th className="p-4 text-right">{t('evaluation.colWeightedError')}</th>
                  <th className="p-4 text-right">{t('evaluation.colErrorRate')}</th>
                  <th className="p-4 text-right">{t('evaluation.colQualityScore')}</th>
                  <th className="p-4 text-center">{t('evaluation.colStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredResults.map(res => (
                  <tr key={res.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors">
                    <td className="p-4 font-medium text-[var(--color-text-main)]">{res.userId}</td>
                    <td className="p-4 text-[var(--color-text-sub)]">{res.departmentId}</td>
                    <td className="p-4 text-right font-mono">{res.totalWorkload}</td>
                    <td className="p-4 text-right font-mono">{res.totalRawErrorCount}</td>
                    <td className="p-4 text-right font-mono text-red-600 dark:text-red-400">{res.totalWeightedErrorCount.toFixed(1)}</td>
                    <td className="p-4 text-right font-mono text-orange-600 dark:text-orange-400 font-medium">{res.weightedErrorRate.toFixed(2)}%</td>
                    <td className="p-4 text-right font-bold text-blue-700 dark:text-blue-400">{t('evaluation.lblScoreUnit', { score: res.qualityScore.toString() })}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isLocked ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {isLocked ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {isLocked ? t('evaluation.statusLocked') : t('evaluation.statusCalc')}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredResults.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[var(--color-text-sub)]">{t('evaluation.emptyList')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEPARTMENT_MANAGER') && (
        <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-orange-200 dark:border-orange-900/50 overflow-hidden mt-6">
          <div className="p-5 border-b border-orange-100 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 flex justify-between items-center">
            <h2 className="font-bold text-orange-800 dark:text-orange-400">{t('evaluation.appealTitle', { count: pendingAppeals.length.toString() })}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-orange-50/50 dark:bg-orange-900/10 text-[var(--color-text-sub)] font-semibold border-b">
                <tr>
                  <th className="p-4">{t('evaluation.colAppealer')}</th>
                  <th className="p-4">{t('evaluation.colTargetIssue')}</th>
                  <th className="p-4">{t('evaluation.colAppealReason')}</th>
                  <th className="p-4 text-center">{t('evaluation.colAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {pendingAppeals.map(appeal => {
                  const issue = qcIssues.find(i => i.id === appeal.targetIssueId);
                  return (
                    <tr key={appeal.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="p-4 font-medium text-[var(--color-text-main)]">{appeal.requestedBy}</td>
                      <td className="p-4 text-[var(--color-text-sub)]">
                        {issue ? t('evaluation.issueInfo', { stage: issue.issueStage, title: issue.title, weight: issue.weightPercent.toString() }) : t('evaluation.issueUnknown')}
                      </td>
                      <td className="p-4 text-[var(--color-text-main)] max-w-sm truncate" title={appeal.reason}>{appeal.reason}</td>
                      <td className="p-4 text-center space-x-2">
                        <button onClick={() => handleReviewAppeal(appeal.id, true)} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700">{t('evaluation.btnAccept')}</button>
                        <button onClick={() => handleReviewAppeal(appeal.id, false)} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700">{t('evaluation.btnReject')}</button>
                      </td>
                    </tr>
                  );
                })}
                {pendingAppeals.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[var(--color-text-sub)]">{t('evaluation.emptyAppeals')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
