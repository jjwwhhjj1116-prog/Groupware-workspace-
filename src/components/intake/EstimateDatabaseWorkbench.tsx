'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Database, Download, FileJson, Plus, RefreshCw, Save, Search, Trash2, Undo2 } from 'lucide-react';
import { ESTIMATE_DB_COLUMNS, ESTIMATE_DB_VENDOR_COLUMNS, exportEstimateDbJson, exportEstimateDbXlsx } from '@/lib/estimateDatabase';
import { useTranslation } from '@/lib/localization';
import { useAuthStore } from '@/store/authStore';
import { useEstimateDatabaseStore } from '@/store/estimateDatabaseStore';
import { useTranslationStore } from '@/store/translationStore';
import type { EstimateDbPayload, EstimateDbRecord, EstimateDbSection, EstimateDbTargetType, EstimateDbVendor } from '@/types/models';

type Tab = EstimateDbSection | 'REPORTS';
const TABS: Tab[] = ['PJ', 'PROGRESS', 'MEP_CONTRACT', 'REPORTS'];
const PAGE_SIZE = 50;
const targetTypes: EstimateDbTargetType[] = ['ORDER', 'SALES', 'DEPOSIT'];
const fieldClass = 'w-full min-w-[110px] border bg-[var(--color-surface)] px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';
const buttonClass = 'inline-flex min-h-9 items-center justify-center gap-1.5 border bg-[var(--color-surface)] px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50';

const display = (value: unknown) => value === null || value === undefined || value === '' ? '-' : String(value);
const currency = (value: string) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function EstimateDatabaseWorkbench() {
  const { currentUser } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const store = useEstimateDatabaseStore();
  const [tab, setTab] = useState<Tab>('PJ');
  const [query, setQuery] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EstimateDbPayload>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { const timer = window.setTimeout(() => void store.sync(year), 0); return () => window.clearTimeout(timer); }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => tab === 'REPORTS' ? [] : store.records
    .filter((row) => row.section === tab && (!row.year || row.year === year))
    .filter((row) => !query || `${row.pjNo || ''} ${JSON.stringify(row.data)}`.toLowerCase().includes(query.toLowerCase())), [query, store.records, tab, year]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const report = store.report(year);

  const beginEdit = (row: EstimateDbRecord) => { setSelectedId(row.id); setDraft({ ...row.data }); setMessage(''); };
  const save = async () => {
    const row = store.records.find((item) => item.id === selectedId);
    if (!row || !currentUser) return;
    setBusy(true);
    try { await store.updateRecord(row, draft, currentUser.id); setSelectedId(null); setMessage(t('estimateDb.saved')); }
    catch (error) { setMessage(error instanceof Error ? error.message : t('estimateDb.error')); }
    finally { setBusy(false); }
  };
  const add = async () => {
    if (!currentUser || tab === 'REPORTS') return;
    setBusy(true);
    try {
      const pjNo = tab === 'PJ' ? `PJ-${year}-${String(rows.length + 1).padStart(4, '0')}` : null;
      const row = await store.createRecord({ section: tab, pjNo, year, sortOrder: rows.length, data: { ...(pjNo ? { 'PJ NO': pjNo } : {}), '최초생성날짜': new Date().toISOString().slice(0, 10) } }, currentUser.id);
      beginEdit(row);
    } finally { setBusy(false); }
  };
  const duplicate = async () => {
    const row = store.records.find((item) => item.id === selectedId);
    if (!row || !currentUser) return;
    const copied = await store.duplicateRecord(row, currentUser.id); beginEdit(copied);
  };
  const remove = async () => {
    const row = store.records.find((item) => item.id === selectedId);
    if (!row || !window.confirm(t('estimateDb.deleteConfirm'))) return;
    await store.deleteRecord(row); setSelectedId(null); setDraft({});
  };
  const refresh = async () => { setBusy(true); try { await store.sync(year); setMessage(t('estimateDb.refreshed')); } finally { setBusy(false); } };

  if (!currentUser) return <p className="p-8 text-center">{t('header.loginRequired')}</p>;
  if (!['DEPARTMENT_MANAGER', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) return <p className="p-8 text-center font-semibold text-[var(--color-danger)]">{t('estimateDb.permissionDenied')}</p>;

  return (
    <main style={{ contain: 'inline-size' }} className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden px-3 py-5 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <Link href="/projects/intake" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><ArrowLeft className="size-4" />{t('estimateSheet.back')}</Link>
          <div className="flex items-center gap-2"><Database className="size-6 text-[var(--color-primary)]" /><h1 className="text-2xl font-bold">{t('estimateDb.title')}</h1></div>
          <p className="mt-1 text-sm text-[var(--color-text-sub)]">{t('estimateDb.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects/intake/estimates" className={buttonClass}>{t('estimateDb.submissions')}</Link>
          <button type="button" onClick={() => void refresh()} disabled={busy} title={t('estimateRequest.refresh')} className={`${buttonClass} px-2.5`}><RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} /></button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b">
        <div role="tablist" aria-label={t('estimateDb.tabs')} className="flex overflow-x-auto">
          {TABS.map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setPage(1); setSelectedId(null); setDraft({}); }} className={`min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${tab === value ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-sub)]'}`}>{t(`estimateDb.tab.${value}` as Parameters<typeof t>[0])}</button>)}
        </div>
        <span className="pb-2 text-xs font-semibold text-[var(--color-text-sub)]">{store.persistenceMode === 'SERVER' ? t('estimateDb.serverMode') : t('estimateDb.demoMode')}</span>
      </div>

      {message && <p role="status" className="border-l-4 border-[var(--color-primary)] bg-[var(--color-bg-sub)] px-4 py-2 text-sm">{message}</p>}
      {store.error && <p role="alert" className="border-l-4 border-[var(--color-danger)] px-4 py-2 text-sm">{store.error}</p>}

      {tab !== 'REPORTS' ? <>
        <section aria-label={t('estimateDb.tools')} className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[var(--color-text-sub)]" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); setSelectedId(null); setDraft({}); }} aria-label={t('estimateDb.search')} placeholder={t('estimateDb.search')} className={`${fieldClass} pl-9`} /></label>
          <input type="number" min="2000" max="2200" value={year} onChange={(event) => { setYear(Number(event.target.value)); setPage(1); setSelectedId(null); setDraft({}); }} aria-label={t('estimateDb.year')} className={`${fieldClass} max-w-[110px]`} />
          <button type="button" onClick={() => void add()} disabled={busy} className={buttonClass}><Plus className="size-4" />{t('estimateDb.add')}</button>
          <button type="button" onClick={() => void duplicate()} disabled={!selectedId || busy} className={buttonClass}><Copy className="size-4" />{t('estimateDb.duplicate')}</button>
          <button type="button" onClick={() => void remove()} disabled={!selectedId || busy} className={`${buttonClass} text-[var(--color-danger)]`}><Trash2 className="size-4" />{t('estimateDb.delete')}</button>
          <button type="button" onClick={() => void save()} disabled={!selectedId || busy} className={`${buttonClass} border-[var(--color-primary)] bg-[var(--color-primary)] text-white`}><Save className="size-4" />{t('common.save')}</button>
          <button type="button" onClick={() => { setSelectedId(null); setDraft({}); }} disabled={!selectedId || busy} title={t('common.cancel')} className={`${buttonClass} px-2.5`}><Undo2 className="size-4" /></button>
        </section>

        <div className="overflow-x-auto border-y" aria-busy={store.loading}>
          <table className="border-collapse text-left text-xs" style={{ minWidth: `${Math.max(1200, (ESTIMATE_DB_COLUMNS[tab].length + 1) * 130)}px` }}>
            <thead className="sticky top-0 z-10"><tr className="border-b bg-[var(--color-bg-sub)]"><th className="sticky left-0 z-20 w-12 border-r bg-[var(--color-bg-sub)] px-2 py-2">#</th>{ESTIMATE_DB_COLUMNS[tab].map((column) => <th key={column.key} className="border-r px-2 py-2 font-semibold" style={{ width: column.width }}>{column.label}</th>)}</tr></thead>
            <tbody>{visibleRows.length ? visibleRows.map((row, rowIndex) => {
              const editing = selectedId === row.id;
              return <tr key={row.id} onClick={() => !editing && beginEdit(row)} className={`border-b align-top ${editing ? 'bg-[var(--color-bg-sub)]' : 'cursor-pointer hover:bg-[var(--color-bg-sub)]'}`}>
                <th className="sticky left-0 z-[5] border-r bg-[var(--color-surface)] p-1 text-center font-medium">
                  <button type="button" onClick={(event) => { event.stopPropagation(); beginEdit(row); }} className="min-h-8 w-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{(page - 1) * PAGE_SIZE + rowIndex + 1}</button>
                </th>
                {ESTIMATE_DB_COLUMNS[tab].map((column) => <td key={column.key} className="border-r p-1.5">{editing && !column.readonly ? <input type={column.kind === 'date' ? 'date' : 'text'} inputMode={column.kind === 'money' || column.kind === 'number' ? 'decimal' : undefined} value={String(draft[column.key] ?? '')} onChange={(event) => setDraft((value) => ({ ...value, [column.key]: event.target.value }))} aria-label={column.label} className={fieldClass} /> : <span className="block max-w-[220px] whitespace-pre-wrap break-words px-1 py-1">{display(editing ? draft[column.key] : row.data[column.key])}</span>}</td>)}
              </tr>;
            }) : <tr><td colSpan={ESTIMATE_DB_COLUMNS[tab].length + 1} className="px-4 py-16 text-center text-sm text-[var(--color-text-sub)]">{t('estimateDb.empty')}</td></tr>}</tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-sm"><span>{t('estimateDb.count', { count: String(rows.length) })}</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className={buttonClass}>{t('estimateDb.prev')}</button><span>{page} / {pageCount}</span><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount} className={buttonClass}>{t('estimateDb.next')}</button></div></div>
        {tab === 'MEP_CONTRACT' && <VendorSection vendors={store.vendors} currentUserId={currentUser.id} t={t} />}
      </> : <ReportSection year={year} setYear={setYear} report={report} records={store.records} vendors={store.vendors} targets={store.targets} currentUserId={currentUser.id} t={t} />}
    </main>
  );
}

function VendorSection({ vendors, currentUserId, t }: { vendors: EstimateDbVendor[]; currentUserId: string; t: ReturnType<typeof useTranslation> }) {
  const store = useEstimateDatabaseStore();
  const [selected, setSelected] = useState<EstimateDbVendor | null>(null);
  const [draft, setDraft] = useState<EstimateDbPayload>({});
  const add = async () => { const vendor = await store.createVendor({ NO: String(vendors.length + 1), '업체명': t('estimateDb.newVendor'), '공종': '기계' }, currentUserId); setSelected(vendor); setDraft(vendor.data); };
  return <section className="space-y-3 border-t pt-4" aria-labelledby="vendor-heading">
    <div className="flex items-center justify-between"><div><h2 id="vendor-heading" className="text-lg font-bold">{t('estimateDb.vendors')}</h2><p className="text-sm text-[var(--color-text-sub)]">{t('estimateDb.vendorHelp')}</p></div><div className="flex gap-2"><button type="button" onClick={() => void add()} className={buttonClass}><Plus className="size-4" />{t('estimateDb.addVendor')}</button><button type="button" onClick={() => selected && void store.updateVendor(selected, draft, currentUserId).then((saved) => { setSelected(saved); setDraft(saved.data); })} disabled={!selected} className={buttonClass}><Save className="size-4" />{t('common.save')}</button><button type="button" onClick={() => selected && void store.deleteVendor(selected).then(() => setSelected(null))} disabled={!selected} className={`${buttonClass} text-[var(--color-danger)]`}><Trash2 className="size-4" /></button></div></div>
    <div className="overflow-x-auto border-y"><table className="min-w-[2200px] border-collapse text-xs"><thead><tr className="bg-[var(--color-bg-sub)]">{ESTIMATE_DB_VENDOR_COLUMNS.map((column) => <th key={column} className="border-r px-2 py-2">{column}</th>)}</tr></thead><tbody>{vendors.map((vendor) => <tr key={vendor.id} onClick={() => { setSelected(vendor); setDraft({ ...vendor.data }); }} className={`cursor-pointer border-t ${selected?.id === vendor.id ? 'bg-[var(--color-bg-sub)]' : ''}`}>{ESTIMATE_DB_VENDOR_COLUMNS.map((column, columnIndex) => <td key={column} className="border-r p-1.5">{selected?.id === vendor.id ? <input value={String(draft[column] ?? '')} onChange={(event) => setDraft((value) => ({ ...value, [column]: event.target.value }))} aria-label={column} className={fieldClass} /> : columnIndex === 0 ? <button type="button" onClick={(event) => { event.stopPropagation(); setSelected(vendor); setDraft({ ...vendor.data }); }} className="min-h-8 w-full px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{display(vendor.data[column])}</button> : <span className="block px-1 py-1">{display(vendor.data[column])}</span>}</td>)}</tr>)}</tbody></table></div>
  </section>;
}

function ReportSection({ year, setYear, report, records, vendors, targets, currentUserId, t }: { year: number; setYear: (year: number) => void; report: ReturnType<ReturnType<typeof useEstimateDatabaseStore.getState>['report']>; records: EstimateDbRecord[]; vendors: EstimateDbVendor[]; targets: ReturnType<typeof useEstimateDatabaseStore.getState>['targets']; currentUserId: string; t: ReturnType<typeof useTranslation> }) {
  const store = useEstimateDatabaseStore();
  const values = targetTypes.flatMap((type) => report[type === 'ORDER' ? 'order' : type === 'SALES' ? 'sales' : 'deposit'].map((point) => Number(point.amount)));
  const max = Math.max(1, ...values);
  return <div className="space-y-5">
    <section className="flex flex-wrap items-center gap-2 border-b pb-4"><label className="text-sm font-semibold">{t('estimateDb.reportYear')} <input type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} className={`${fieldClass} ml-2 max-w-[110px]`} /></label><button type="button" onClick={() => void exportEstimateDbXlsx(records, vendors, report)} className={buttonClass}><Download className="size-4" />XLSX</button><button type="button" onClick={() => void exportEstimateDbJson(records, vendors, targets)} className={buttonClass}><FileJson className="size-4" />JSON</button></section>
    <section aria-labelledby="annual-heading"><h2 id="annual-heading" className="mb-3 text-lg font-bold">{t('estimateDb.annual')}</h2><div className="overflow-x-auto border-y"><table className="min-w-[980px] w-full border-collapse text-sm"><thead><tr className="bg-[var(--color-bg-sub)]"><th className="px-3 py-3">{t('estimateDb.category')}</th>{Array.from({ length: 12 }, (_, index) => <th key={index} className="px-3 py-3 text-right">{index + 1}</th>)}</tr></thead><tbody>{targetTypes.map((type) => { const points = report[type === 'ORDER' ? 'order' : type === 'SALES' ? 'sales' : 'deposit']; return <tr key={type} className="border-t"><th className="px-3 py-3 text-left">{t(`estimateDb.report.${type}` as Parameters<typeof t>[0])}</th>{points.map((point) => { const pointValue = Number(point.amount); return <td key={point.month} className="px-3 py-3 text-right"><strong>{currency(point.amount)}</strong><span className="mt-1 block h-1 bg-[var(--color-bg-sub)]"><span className="block h-full bg-[var(--color-primary)]" style={{ width: `${pointValue > 0 ? Math.max(2, pointValue / max * 100) : 0}%` }} /></span></td>; })}</tr>; })}</tbody></table></div></section>
    <section aria-labelledby="target-heading"><h2 id="target-heading" className="mb-1 text-lg font-bold">{t('estimateDb.targets')}</h2><p className="mb-3 text-sm text-[var(--color-text-sub)]">{t('estimateDb.targetHelp')}</p><div className="overflow-x-auto border-y"><table className="min-w-[980px] w-full border-collapse text-sm"><thead><tr className="bg-[var(--color-bg-sub)]"><th className="px-3 py-3">{t('estimateDb.category')}</th>{Array.from({ length: 12 }, (_, index) => <th key={index} className="px-2 py-3">{index + 1}</th>)}</tr></thead><tbody>{targetTypes.map((type) => <tr key={type} className="border-t"><th className="px-3 py-2 text-left">{t(`estimateDb.report.${type}` as Parameters<typeof t>[0])}</th>{Array.from({ length: 12 }, (_, index) => { const month = index + 1; const target = targets.find((item) => item.type === type && item.year === year && item.month === month); return <td key={month} className="p-1"><input defaultValue={target?.amount || ''} onBlur={(event) => { if (event.target.value !== (target?.amount || '')) void store.putTarget(type, year, month, event.target.value || '0', currentUserId); }} aria-label={`${type} ${month}`} inputMode="decimal" className={`${fieldClass} min-w-[88px] text-right`} /></td>; })}</tr>)}</tbody></table></div></section>
  </div>;
}
