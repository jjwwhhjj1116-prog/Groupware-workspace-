'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Database, ExternalLink, FileCheck2, RefreshCw, Search, Send, TimerReset } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EstimateSheetApiError, estimateSheetApi } from '@/lib/estimateSheetApi';
import { filterEstimateSubmissions, summarizeEstimateSubmissions } from '@/lib/estimateSubmission';
import { useTranslation } from '@/lib/localization';
import { useAuthStore } from '@/store/authStore';
import { useEstimateRequestStore } from '@/store/estimateRequestStore';
import { useEstimateSheetStore } from '@/store/estimateSheetStore';
import { useTranslationStore } from '@/store/translationStore';
import {
  EstimateSubmissionListItem,
  EstimateSubmissionStatus,
  EstimateTemplateType,
} from '@/types/models';

const STATUS_OPTIONS: Array<EstimateSubmissionStatus | 'ALL'> = ['ALL', 'SUBMITTED', 'SENT'];

const canFallback = (error: unknown) => error instanceof TypeError
  || (error instanceof EstimateSheetApiError && [401, 404].includes(error.status));

export function EstimateSubmissionWorkbench() {
  const { currentUser } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const tRef = useRef(t);
  const { requests, sync: syncRequests } = useEstimateRequestStore();
  const { sheets } = useEstimateSheetStore();
  const [serverRows, setServerRows] = useState<EstimateSubmissionListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<EstimateSubmissionStatus | 'ALL'>('ALL');
  const [templateType, setTemplateType] = useState<EstimateTemplateType | 'ALL'>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const localRows = useMemo(() => Object.values(sheets).flatMap((sheet) => {
    const request = requests.find((item) => item.id === sheet.estimateRequestId);
    return (sheet.submissions || []).map((submission): EstimateSubmissionListItem => ({
      ...submission,
      estimateRequestId: sheet.estimateRequestId,
      requestNo: request?.requestNo || submission.summary.requestNo,
      projectName: request?.projectName || submission.summary.projectName,
      company: request?.company || request?.client || submission.summary.company,
      ownerId: request?.ownerId,
      departmentId: request?.departmentId || '',
      requestStatus: request?.status || 'ESTIMATE_DRAFTING',
      templateType: sheet.templateType,
      decisionReady: submission.status === 'SENT',
    }));
  }), [requests, sheets]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    await syncRequests().catch(() => undefined);
    try {
      setServerRows(await estimateSheetApi.listSubmissions());
    } catch (caught) {
      if (canFallback(caught)) setServerRows(null);
      else setError(caught instanceof Error ? caught.message : tRef.current('estimateSubmission.loadError'));
    } finally {
      setLoading(false);
    }
  }, [syncRequests]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const rows = serverRows ?? localRows;
  const filtered = useMemo(() => filterEstimateSubmissions(rows, { query, status, templateType, from, to }), [from, query, rows, status, templateType, to]);

  const summary = useMemo(() => summarizeEstimateSubmissions(filtered), [filtered]);
  const metrics: Array<{ label: string; value: number; Icon: LucideIcon }> = [
    { label: t('estimateSubmission.total'), value: summary.total, Icon: FileCheck2 },
    { label: t('estimateSubmission.statusSubmitted'), value: summary.submitted, Icon: TimerReset },
    { label: t('estimateSubmission.statusSent'), value: summary.sent, Icon: Send },
    { label: t('estimateSubmission.decisionReady'), value: summary.ready, Icon: FileCheck2 },
  ];

  if (!currentUser) return <p className="p-8 text-center">{t('header.loginRequired')}</p>;
  if (!['PM', 'DEPARTMENT_MANAGER', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return <p className="p-8 text-center font-semibold text-[var(--color-danger)]">{t('estimateSubmission.permissionDenied')}</p>;
  }

  return (
    <div className="min-w-0 space-y-5 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <Link href="/projects/intake" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><ArrowLeft className="size-4" />{t('estimateSheet.back')}</Link>
          <h1 className="text-2xl font-bold">{t('estimateSubmission.title')}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-sub)]">{t('estimateSubmission.subtitle')}</p>
        </div>
        <div className="flex gap-2"><Link href="/projects/intake/database" className="inline-flex min-h-9 items-center gap-2 border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><Database className="size-4" />{t('estimateDb.title')}</Link><button type="button" onClick={() => void refresh()} disabled={loading} title={t('estimateRequest.refresh')} className="grid size-9 place-items-center border bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
      </header>

      {error && <p role="alert" className="border-l-4 border-[var(--color-danger)] bg-[var(--color-bg-sub)] px-4 py-3 text-sm">{error}</p>}

      <section aria-label={t('estimateSubmission.summary')} className="grid border-y sm:grid-cols-4">
        {metrics.map(({ label, value, Icon }, index) => (
          <div key={label} className={`flex items-center gap-3 px-4 py-3 ${index ? 'sm:border-l' : ''}`}><Icon className="size-5 text-[var(--color-primary)]" /><div><p className="text-xs text-[var(--color-text-sub)]">{label}</p><strong className="text-xl">{value}</strong></div></div>
        ))}
      </section>

      <section aria-label={t('estimateSubmission.filters')} className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_160px_160px_150px_150px]">
        <label className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[var(--color-text-sub)]" /><input aria-label={t('estimateSubmission.search')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('estimateSubmission.search')} className="w-full border bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></label>
        <select aria-label={t('estimateSubmission.statusFilter')} value={status} onChange={(event) => setStatus(event.target.value as EstimateSubmissionStatus | 'ALL')} className="border bg-[var(--color-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value === 'ALL' ? t('common.all') : t(`estimateSubmission.status${value === 'SENT' ? 'Sent' : 'Submitted'}` as Parameters<typeof t>[0])}</option>)}</select>
        <select aria-label={t('estimateSubmission.typeFilter')} value={templateType} onChange={(event) => setTemplateType(event.target.value as EstimateTemplateType | 'ALL')} className="border bg-[var(--color-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><option value="ALL">{t('common.all')}</option>{(['개산견적', '공내역서', '설계예가', '공사비검증'] as EstimateTemplateType[]).map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <label className="text-xs text-[var(--color-text-sub)]"><span className="sr-only">{t('estimateSubmission.from')}</span><input aria-label={t('estimateSubmission.from')} type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-full border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></label>
        <label className="text-xs text-[var(--color-text-sub)]"><span className="sr-only">{t('estimateSubmission.to')}</span><input aria-label={t('estimateSubmission.to')} type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-full border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></label>
      </section>

      <div className="overflow-x-auto border-y">
        <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
          <thead><tr className="border-b bg-[var(--color-bg-sub)]"><th className="px-3 py-3">{t('estimateSubmission.submittedAt')}</th><th className="px-3 py-3">{t('estimateSubmission.request')}</th><th className="px-3 py-3">{t('estimateSubmission.document')}</th><th className="px-3 py-3">{t('estimateSubmission.recipient')}</th><th className="px-3 py-3">{t('estimateSubmission.status')}</th><th className="px-3 py-3">{t('estimateSubmission.sentAt')}</th><th className="px-3 py-3">{t('estimateSubmission.readiness')}</th><th className="px-3 py-3 text-right">{t('estimateSubmission.links')}</th></tr></thead>
          <tbody>{filtered.length ? filtered.map((row) => (
            <tr key={row.id} className="border-b align-top hover:bg-[var(--color-bg-sub)]">
              <td className="whitespace-nowrap px-3 py-3">{new Date(row.submittedAt).toLocaleString()}</td>
              <td className="max-w-[260px] px-3 py-3"><strong className="block truncate">{row.projectName}</strong><span className="block truncate text-xs text-[var(--color-text-sub)]">{row.requestNo} · {row.company || '-'}</span></td>
              <td className="px-3 py-3"><span className="block font-medium">{row.templateType} · v{row.version}</span><code className="text-[11px] text-[var(--color-text-sub)]">{row.documentHash.slice(0, 12)}…</code></td>
              <td className="px-3 py-3">{row.recipient || '-'}<span className="block text-xs text-[var(--color-text-sub)]">{row.deliveryChannel || '-'}</span></td>
              <td className="px-3 py-3 font-semibold text-[var(--color-primary)]">{row.status === 'SENT' ? t('estimateSubmission.statusSent') : t('estimateSubmission.statusSubmitted')}</td>
              <td className="whitespace-nowrap px-3 py-3">{row.sentAt ? new Date(row.sentAt).toLocaleString() : '-'}</td>
              <td className="px-3 py-3">{row.decisionReady ? t('estimateSubmission.ready') : t('estimateSubmission.notReady')}</td>
              <td className="px-3 py-3"><div className="flex justify-end gap-2"><Link href={`/projects/intake?requestId=${encodeURIComponent(row.estimateRequestId)}`} className="inline-flex items-center gap-1 border px-2 py-1.5 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{t('estimateSubmission.sourceRequest')}<ExternalLink className="size-3" /></Link><Link href={`/projects/intake/estimate?requestId=${encodeURIComponent(row.estimateRequestId)}&version=${row.version}`} className="inline-flex items-center gap-1 border px-2 py-1.5 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">v{row.version}<ExternalLink className="size-3" /></Link></div></td>
            </tr>
          )) : <tr><td colSpan={8} className="px-4 py-12 text-center text-[var(--color-text-sub)]">{t('estimateSubmission.empty')}</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
