'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ClipboardCheck,
  Columns3,
  Download,
  FileSpreadsheet,
  History,
  LoaderCircle,
  Plus,
  Printer,
  RotateCcw,
  Rows3,
  Save,
  Send,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useEstimateRequestStore } from '@/store/estimateRequestStore';
import { useEstimateSheetStore } from '@/store/estimateSheetStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import {
  ESTIMATE_TEMPLATE_SPECS,
  ESTIMATE_TEMPLATE_TYPES,
  columnLabel,
  createEstimateSheetState,
  displayEstimateCell,
  estimateCellKey,
  templateCell,
} from '@/lib/estimateSheetTemplates';
import { downloadEstimateWorkbook, printEstimateSheet } from '@/lib/estimateSheetExport';
import { EstimateSheetState, EstimateTemplateType } from '@/types/models';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const styleToReact = (style = '') => Object.fromEntries(style.split(';').map((rule) => rule.split(':')).filter((entry) => entry.length > 1).map(([property, ...value]) => [property.trim().replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), value.join(':').trim()]));

function parseInput(value: string) {
  const trimmed = value.replaceAll('\u00a0', ' ').trim();
  if (trimmed.startsWith('=')) return { value: '', formula: trimmed.slice(1), userFormula: true };
  if (/^-?[\d,]+(?:\.\d+)?$/.test(trimmed)) return { value: Number(trimmed.replaceAll(',', '')), formula: '', userFormula: false };
  return { value: trimmed, formula: '', userFormula: false };
}

function insertRow(state: EstimateSheetState, after: number) {
  const cells = Object.fromEntries(Object.entries(state.cells).map(([key, value]) => {
    const [row, column] = key.split(':').map(Number);
    return [estimateCellKey(row > after ? row + 1 : row, column), value];
  }));
  return {
    ...state,
    cells,
    maxRow: state.maxRow + 1,
    rowHeights: [...state.rowHeights.slice(0, after), state.rowHeights[Math.max(0, after - 1)] || 20, ...state.rowHeights.slice(after)],
    merges: state.merges.map(([row1, column1, row2, column2]) => [row1 > after ? row1 + 1 : row1, column1, row2 > after ? row2 + 1 : row2, column2] as [number, number, number, number]),
  };
}

function insertColumn(state: EstimateSheetState, after: number) {
  const cells = Object.fromEntries(Object.entries(state.cells).map(([key, value]) => {
    const [row, column] = key.split(':').map(Number);
    return [estimateCellKey(row, column > after ? column + 1 : column), value];
  }));
  return {
    ...state,
    cells,
    maxCol: state.maxCol + 1,
    colWidths: [...state.colWidths.slice(0, after), state.colWidths[Math.max(0, after - 1)] || 64, ...state.colWidths.slice(after)],
    merges: state.merges.map(([row1, column1, row2, column2]) => [row1, column1 > after ? column1 + 1 : column1, row2, column2 > after ? column2 + 1 : column2] as [number, number, number, number]),
  };
}

export function EstimateSheetWorkbench({ requestId }: { requestId: string }) {
  const { currentUser } = useAuthStore();
  const { requests, sync: syncRequests } = useEstimateRequestStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { sheets, persistenceMode, loading, error, sync, createSheet, saveVersion, submitSheet, sendSubmission, startRevision, recordExport } = useEstimateSheetStore();
  const sheet = sheets[requestId];
  const request = requests.find((item) => item.id === requestId);
  const [templateType, setTemplateType] = useState<EstimateTemplateType>('개산견적');
  const [version, setVersion] = useState<number | null>(() => sheet?.currentVersion ?? null);
  const [state, setState] = useState<EstimateSheetState>(() => clone(sheet?.versions[0]?.state || createEstimateSheetState('개산견적')));
  const [activeCell, setActiveCell] = useState({ row: 1, column: 1 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState<string | null>(null);
  const [deliveryChannel, setDeliveryChannel] = useState('EMAIL');
  const hydrated = useRef(false);

  useEffect(() => {
    if (!requestId || hydrated.current) return;
    hydrated.current = true;
    void syncRequests().catch(() => undefined);
    void sync(requestId).then((loaded) => {
      const requestedVersion = Number(new URLSearchParams(window.location.search).get('version'));
      const selected = loaded?.versions.find((entry) => entry.version === requestedVersion)
        || loaded?.versions.find((entry) => entry.version === loaded.currentVersion)
        || loaded?.versions[0];
      if (loaded && selected) {
        setVersion(selected.version);
        setTemplateType(loaded.templateType);
        setState(clone(selected.state));
      }
    }).catch(() => undefined);
  }, [requestId, sync, syncRequests]);

  const selectedVersion = sheet?.versions.find((entry) => entry.version === version);
  const canView = Boolean(request && (
    ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser?.role || '')
    || (['PM', 'DEPARTMENT_MANAGER'].includes(currentUser?.role || '')
      && (request.departmentId === currentUser?.departmentId || request.ownerId === currentUser?.id))
  ));
  const canManage = Boolean(request && (
    ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser?.role || '')
    || (currentUser?.role === 'DEPARTMENT_MANAGER' && request.departmentId === currentUser.departmentId)
    || (currentUser?.role === 'PM' && request.ownerId === currentUser.id)
  ));
  const readOnly = Boolean(sheet && (!canManage || sheet.status !== 'DRAFT' || version !== sheet.currentVersion));
  const active = state.cells[estimateCellKey(activeCell.row, activeCell.column)] || {};
  const formulaValue = active.formula ? `=${active.formula}` : String(active.value ?? '');
  const spec = ESTIMATE_TEMPLATE_SPECS[state.type];

  const mergeMap = useMemo(() => {
    const starts = new Map<string, [number, number, number, number]>();
    const skips = new Set<string>();
    state.merges.forEach((merge) => {
      starts.set(estimateCellKey(merge[0], merge[1]), merge);
      for (let row = merge[0]; row <= merge[2]; row += 1) for (let column = merge[1]; column <= merge[3]; column += 1) if (row !== merge[0] || column !== merge[1]) skips.add(estimateCellKey(row, column));
    });
    return { starts, skips };
  }, [state.merges]);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true); setMessage('');
    try { await action(); setMessage(success); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : t('estimateSheet.error')); }
    finally { setBusy(false); }
  };

  const updateCell = (row: number, column: number, value: string) => {
    if (readOnly) return;
    setState((current) => ({ ...current, cells: { ...current.cells, [estimateCellKey(row, column)]: parseInput(value) } }));
  };

  const updateFormula = (value: string) => updateCell(activeCell.row, activeCell.column, value);

  const create = () => run(async () => {
    if (!currentUser || !canManage) return;
    const initial = createEstimateSheetState(templateType);
    const created = await createSheet(requestId, templateType, initial, currentUser.id);
    setVersion(created.currentVersion);
    setState(clone(created.versions[0].state));
  }, t('estimateSheet.created'));

  const save = () => run(async () => {
    if (!currentUser) return;
    const updated = await saveVersion(requestId, state, currentUser.id);
    setVersion(updated.currentVersion);
  }, t('estimateSheet.saved'));

  const exportXlsx = () => run(async () => {
    if (!currentUser || !sheet) return;
    const fileName = await downloadEstimateWorkbook(state);
    await recordExport(requestId, 'XLSX', fileName, currentUser.id);
  }, t('estimateSheet.exported'));

  const printPdf = () => run(async () => {
    if (!currentUser || !sheet) return;
    const fileName = printEstimateSheet(state);
    await recordExport(requestId, 'PDF', fileName, currentUser.id);
  }, t('estimateSheet.printOpened'));

  const submit = () => run(async () => {
    if (!currentUser) return;
    await submitSheet(requestId, currentUser.id, recipient ?? request?.company ?? request?.client ?? '', deliveryChannel);
  }, t('estimateSheet.submitted'));

  const send = () => run(async () => {
    if (!currentUser) return;
    await sendSubmission(requestId, currentUser.id);
  }, t('estimateSheet.sent'));

  const revise = () => run(async () => {
    if (!currentUser) return;
    const updated = await startRevision(requestId, currentUser.id);
    const latest = updated.versions.find((entry) => entry.version === updated.currentVersion);
    if (latest) {
      setVersion(latest.version);
      setState(clone(latest.state));
    }
  }, t('estimateSheet.revisionStarted'));

  if (!requestId) return <p className="p-8 text-center text-[var(--color-danger)]">{t('estimateSheet.missingRequest')}</p>;
  if (!currentUser) return <p className="p-8 text-center">{t('header.loginRequired')}</p>;
  if (request && !canView) return <p className="p-8 text-center text-[var(--color-danger)]">{t('estimateSheet.permissionDenied')}</p>;

  return (
    <div className="min-w-0 space-y-4 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-4">
            <Link href={`/projects/intake?requestId=${encodeURIComponent(requestId)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><ArrowLeft className="size-4" />{t('estimateSheet.back')}</Link>
            <Link href="/projects/intake/estimates" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><History className="size-4" />{t('estimateSubmission.openManagement')}</Link>
          </div>
          <h1 className="truncate text-2xl font-bold">{t('estimateSheet.title')}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-sub)]">{request?.projectName || requestId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold ${persistenceMode === 'SERVER' ? 'text-emerald-600' : 'text-amber-600'}`}>{persistenceMode === 'SERVER' ? t('estimateRequest.serverMode') : t('estimateRequest.localMode')}</span>
          {sheet && <span className="border-l pl-2 text-xs font-semibold">{sheet.status === 'SENT' ? t('estimateSheet.statusSent') : sheet.status === 'SUBMITTED' ? t('estimateSheet.statusSubmitted') : t('estimateSheet.statusDraft')}</span>}
        </div>
      </header>

      {(message || error) && <p role="status" className="border-l-4 border-[var(--color-primary)] bg-[var(--color-bg-sub)] px-4 py-3 text-sm">{message || error}</p>}

      {!sheet ? (
        <section className="mx-auto max-w-3xl py-12">
          <div className="mb-5 flex items-center gap-3"><FileSpreadsheet className="size-8 text-[var(--color-primary)]" /><div><h2 className="text-lg font-bold">{t('estimateSheet.chooseTemplate')}</h2><p className="text-sm text-[var(--color-text-sub)]">{t('estimateSheet.chooseTemplateHelp')}</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ESTIMATE_TEMPLATE_TYPES.map((type) => <button key={type} type="button" onClick={() => setTemplateType(type)} className={`border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${templateType === type ? 'border-[var(--color-primary)] bg-[var(--color-bg-sub)]' : 'bg-[var(--color-surface)]'}`}><strong>{type}</strong><span className="mt-1 block text-xs text-[var(--color-text-sub)]">{ESTIMATE_TEMPLATE_SPECS[type].maxRow} × {ESTIMATE_TEMPLATE_SPECS[type].maxCol} · {ESTIMATE_TEMPLATE_SPECS[type].merges.length} merges</span></button>)}
          </div>
          <button type="button" onClick={create} disabled={busy || loading || !canManage} className="mt-5 inline-flex items-center gap-2 bg-[var(--color-primary)] px-4 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{t('estimateSheet.create')}</button>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-y py-3">
            <label className="flex items-center gap-2 text-sm"><History className="size-4" /><span className="sr-only">{t('estimateSheet.version')}</span><select value={version || sheet.currentVersion} onChange={(event) => { const next = Number(event.target.value); const selected = sheet.versions.find((entry) => entry.version === next); if (selected) { setVersion(next); setState(clone(selected.state)); } }} className="border bg-[var(--color-surface)] px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{sheet.versions.map((entry) => <option key={entry.id} value={entry.version}>v{entry.version} · {new Date(entry.createdAt).toLocaleString()}</option>)}</select></label>
            <div className="h-6 border-l" />
            <button type="button" title={t('estimateSheet.insertRow')} disabled={readOnly} onClick={() => setState((current) => insertRow(current, activeCell.row))} className="grid size-9 place-items-center border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-40"><Rows3 className="size-4" /></button>
            <button type="button" title={t('estimateSheet.insertColumn')} disabled={readOnly} onClick={() => setState((current) => insertColumn(current, activeCell.column))} className="grid size-9 place-items-center border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-40"><Columns3 className="size-4" /></button>
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" onClick={save} disabled={busy || readOnly} className="inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-40"><Save className="size-4" />{t('common.save')}</button>
              <button type="button" onClick={exportXlsx} disabled={busy} className="inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-40"><Download className="size-4" />XLSX</button>
              <button type="button" onClick={printPdf} disabled={busy} className="inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-40"><Printer className="size-4" />PDF</button>
              {sheet.status === 'DRAFT' && <button type="button" onClick={submit} disabled={busy || readOnly} className="inline-flex items-center gap-2 bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-40"><ClipboardCheck className="size-4" />{t('estimateSheet.submit')}</button>}
              {sheet.status === 'SUBMITTED' && <button type="button" onClick={send} disabled={busy || !canManage} className="inline-flex items-center gap-2 bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-40"><Send className="size-4" />{t('estimateSheet.markSent')}</button>}
              {sheet.status === 'SENT' && <button type="button" onClick={revise} disabled={busy || !canManage} className="inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-40"><RotateCcw className="size-4" />{t('estimateSheet.newRevision')}</button>}
            </div>
          </div>

          {sheet.status === 'DRAFT' && version === sheet.currentVersion && canManage && (
            <div className="grid gap-3 border-b pb-4 sm:grid-cols-2">
              <label className="text-sm"><span className="mb-1 block font-medium">{t('estimateSubmission.recipient')}</span><input value={recipient ?? request?.company ?? request?.client ?? ''} onChange={(event) => setRecipient(event.target.value)} className="w-full border bg-[var(--color-surface)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></label>
              <label className="text-sm"><span className="mb-1 block font-medium">{t('estimateSubmission.deliveryChannel')}</span><select value={deliveryChannel} onChange={(event) => setDeliveryChannel(event.target.value)} className="w-full border bg-[var(--color-surface)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><option value="EMAIL">Email</option><option value="PORTAL">Portal</option><option value="HANDOFF">Handoff</option></select></label>
            </div>
          )}

          <div className="grid grid-cols-[70px_minmax(0,1fr)] border text-sm">
            <div className="border-r bg-[var(--color-bg-sub)] px-2 py-2 text-center font-semibold">{columnLabel(activeCell.column)}{activeCell.row}</div>
            <input aria-label={t('estimateSheet.formulaBar')} value={formulaValue} disabled={readOnly} onChange={(event) => updateFormula(event.target.value)} className="min-w-0 bg-[var(--color-surface)] px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] disabled:opacity-60" />
          </div>

          {readOnly && <p className="bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{sheet.status === 'SENT' ? t('estimateSheet.sentReadonly') : sheet.status === 'SUBMITTED' ? t('estimateSheet.submittedReadonly') : t('estimateSheet.historyReadonly')}</p>}

          <div className="relative max-h-[68vh] overflow-auto border bg-white text-black">
            <table className="border-collapse table-fixed" style={{ width: state.colWidths.reduce((sum, width) => sum + width, 42) }}>
              <colgroup><col style={{ width: 42 }} />{state.colWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
              <thead className="sticky top-0 z-20"><tr><th className="sticky left-0 z-30 border bg-gray-100" />{Array.from({ length: state.maxCol }, (_, index) => <th key={index} className="h-7 border bg-gray-100 text-xs font-semibold">{columnLabel(index + 1)}</th>)}</tr></thead>
              <tbody>{Array.from({ length: state.maxRow }, (_, rowIndex) => {
                const row = rowIndex + 1;
                return <tr key={row} style={{ height: state.rowHeights[rowIndex] || 20 }}><th className="sticky left-0 z-10 border bg-gray-100 text-xs font-semibold">{row}</th>{Array.from({ length: state.maxCol }, (_, columnIndex) => {
                  const column = columnIndex + 1;
                  const key = estimateCellKey(row, column);
                  if (mergeMap.skips.has(key)) return null;
                  const merge = mergeMap.starts.get(key);
                  const cell = state.cells[key] || {};
                  const displayed = displayEstimateCell(state, row, column);
                  const selected = row === activeCell.row && column === activeCell.column;
                  return <td key={key} rowSpan={merge ? merge[2] - merge[0] + 1 : 1} colSpan={merge ? merge[3] - merge[1] + 1 : 1} contentEditable={!readOnly} suppressContentEditableWarning spellCheck={false} onFocus={() => setActiveCell({ row, column })} onBlur={(event) => updateCell(row, column, event.currentTarget.innerText)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.blur(); setActiveCell({ row: Math.min(state.maxRow, row + 1), column }); } }} className={`min-w-0 border p-0 align-middle outline-none ${cell.formula ? 'bg-blue-50' : ''} ${selected ? 'ring-2 ring-inset ring-[var(--color-primary)]' : ''}`} style={styleToReact(templateCell(state.type, row, column)?.s) as React.CSSProperties}>{typeof displayed === 'number' ? displayed.toLocaleString() : displayed}</td>;
                })}</tr>;
              })}</tbody>
            </table>
            {spec.images.map((image, index) => {
              const left = state.colWidths.slice(0, image.from.col).reduce((sum, width) => sum + width, 42) + (image.from.colOff || 0) / 9525;
              const top = state.rowHeights.slice(0, image.from.row).reduce((sum, height) => sum + height, 28) + (image.from.rowOff || 0) / 9525;
              const right = state.colWidths.slice(0, image.to.col).reduce((sum, width) => sum + width, 42) + (image.to.colOff || 0) / 9525;
              const bottom = state.rowHeights.slice(0, image.to.row).reduce((sum, height) => sum + height, 28) + (image.to.rowOff || 0) / 9525;
              // Embedded legacy workbook images are data URIs and cannot use the Next image loader.
              // eslint-disable-next-line @next/next/no-img-element
              return <img key={index} src={image.data} alt="CON-COST" className="pointer-events-none absolute z-10 object-contain" style={{ left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) }} />;
            })}
          </div>

          <footer className="flex flex-wrap justify-between gap-2 text-xs text-[var(--color-text-sub)]"><span>{state.type} · {state.maxRow} × {state.maxCol} · {state.merges.length} merges</span><span>{t('estimateSheet.templateHash')}: {selectedVersion?.templateHash.slice(0, 12)}…</span></footer>
        </>
      )}
    </div>
  );
}
