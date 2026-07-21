'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { Check, Clock3, FileClock, FilePlus2, Plus, RotateCcw, Send, Upload } from 'lucide-react';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { useAuthStore } from '@/store/authStore';
import { useProjectDeliveryStore } from '@/store/projectDeliveryStore';
import { useTranslationStore } from '@/store/translationStore';
import { DailyReportStage, DeliveryRecordType, ProjectDailyReport } from '@/types/models';

type Props = { projectId: string; mode: 'DELIVERY' | 'DAILY' };
const inputClass = 'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60';
const buttonClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50';
const today = () => new Date().toISOString().slice(0, 10);
const fileInput = (file: File) => ({ logicalFileKey: file.name.trim().toLowerCase(), originalName: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, memo: '' });

export function ProjectDeliveryPanel({ projectId, mode }: Props) {
  const { currentUser, users } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { workspaces, loading, error, sync, createRound, addFile, addRecord, requestDownload, reviewDownload, createReport, approveReport } = useProjectDeliveryStore();
  const workspace = workspaces.find((item) => item.projectId === projectId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [roundKind, setRoundKind] = useState<'DELIVERY' | 'REDELIVERY'>('DELIVERY');
  const [parentRoundId, setParentRoundId] = useState('');
  const [roundLabel, setRoundLabel] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [roundMemo, setRoundMemo] = useState('');
  const [recordType, setRecordType] = useState<DeliveryRecordType>('CLIENT_DELIVERY');
  const [recordMemo, setRecordMemo] = useState('');
  const [downloadTarget, setDownloadTarget] = useState('');
  const [downloadReason, setDownloadReason] = useState('');
  const [scheduleRowId, setScheduleRowId] = useState('');
  const [reportDate, setReportDate] = useState(today());
  const [stage, setStage] = useState<DailyReportStage>('MORNING_DRAFT');
  const [planMemo, setPlanMemo] = useState('');
  const [resultMemo, setResultMemo] = useState('');
  const [progressRate, setProgressRate] = useState(0);
  const [delayReason, setDelayReason] = useState('');
  const [overtimeReason, setOvertimeReason] = useState('');

  const actor = currentUser ? { id: currentUser.id, role: currentUser.role, departmentId: currentUser.departmentId } : null;
  useEffect(() => { if (actor) void sync(projectId, actor); }, [projectId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const userName = (id?: string | null) => {
    const user = users.find((item) => item.id === id);
    return user ? getUserDisplayName(user) : id || t('unset');
  };
  const stageLabel = (value?: string | null) => {
    if (value === 'MORNING_DRAFT') return t('projectDelivery.stage.MORNING_DRAFT');
    if (value === 'FINAL') return t('projectDelivery.stage.FINAL');
    if (value === 'OVERTIME') return t('projectDelivery.stage.OVERTIME');
    if (value === 'DELAY') return t('projectDelivery.stage.DELAY');
    return t('unset');
  };
  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true); setMessage('');
    try { await work(); setMessage(success); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : t('projectDelivery.error.generic')); }
    finally { setBusy(false); }
  };
  const onFile = (roundId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && actor) void run(() => addFile(projectId, roundId, fileInput(file), actor), t('projectDelivery.message.fileAdded'));
    event.target.value = '';
  };

  if (!currentUser) return null;
  if (loading && !workspace) return <p className="py-12 text-center text-sm text-[var(--color-text-sub)]">{t('projectDelivery.loading')}</p>;
  if (!workspace) return <p className="py-12 text-center text-sm text-red-600">{error || t('projectDelivery.empty')}</p>;

  if (mode === 'DAILY') return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
      <div><h3 className="font-bold text-[var(--color-text-main)]">{t('projectDelivery.daily.title')}</h3><p className="mt-1 text-xs text-[var(--color-text-sub)]">{t('projectDelivery.daily.summary', { progress: String(workspace.progressRate), stage: stageLabel(workspace.currentStage) })}</p></div>
      <span className="rounded border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text-sub)]">{t(`projectDelivery.workspace.${workspace.status}`)}</span>
    </header>
    {message && <div role="status" className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</div>}
    {workspace.permissions.canWriteDaily && <section className="border-b border-[var(--color-border)] pb-5" aria-label={t('projectDelivery.daily.form')}>
      <h4 className="mb-3 text-sm font-bold text-[var(--color-text-main)]">{t('projectDelivery.daily.form')}</h4>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Field label={t('projectDelivery.daily.task')}><select className={inputClass} value={scheduleRowId} onChange={(event) => setScheduleRowId(event.target.value)}><option value="">{t('unset')}</option>{workspace.assignments.rows.map((row) => <option key={row.id} value={row.id}>{row.scope || row.category} - {userName(row.assigneeId)}</option>)}</select></Field>
        <Field label={t('projectDelivery.daily.date')}><input type="date" className={inputClass} value={reportDate} onChange={(event) => setReportDate(event.target.value)} /></Field>
        <Field label={t('projectDelivery.daily.stage')}><select className={inputClass} value={stage} onChange={(event) => setStage(event.target.value as DailyReportStage)}>{(['MORNING_DRAFT', 'FINAL', 'OVERTIME', 'DELAY'] as const).map((item) => <option key={item} value={item}>{t(`projectDelivery.stage.${item}`)}</option>)}</select></Field>
        <Field label={t('projectDelivery.daily.progress')}><div className="flex items-center gap-3"><input type="range" min="0" max="100" value={progressRate} onChange={(event) => setProgressRate(Number(event.target.value))} className="min-w-0 flex-1 accent-[var(--color-primary)]" /><span className="w-12 text-right text-sm font-bold">{progressRate}%</span></div></Field>
        <Field wide label={t('projectDelivery.daily.plan')}><textarea className={`${inputClass} min-h-20 resize-y`} value={planMemo} onChange={(event) => setPlanMemo(event.target.value)} /></Field>
        <Field wide label={t('projectDelivery.daily.result')}><textarea className={`${inputClass} min-h-20 resize-y`} value={resultMemo} onChange={(event) => setResultMemo(event.target.value)} /></Field>
        <Field wide label={t('projectDelivery.daily.overtime')}><textarea className={`${inputClass} min-h-16 resize-y`} value={overtimeReason} onChange={(event) => setOvertimeReason(event.target.value)} /></Field>
        <Field wide label={t('projectDelivery.daily.delay')}><textarea className={`${inputClass} min-h-16 resize-y`} value={delayReason} onChange={(event) => setDelayReason(event.target.value)} /></Field>
      </div>
      <div className="mt-3 flex justify-end"><button type="button" disabled={busy || (stage === 'MORNING_DRAFT' && !planMemo.trim()) || (stage === 'FINAL' && !resultMemo.trim()) || (stage === 'OVERTIME' && !overtimeReason.trim()) || (stage === 'DELAY' && !delayReason.trim())} className={`${buttonClass} bg-[var(--color-primary)] text-white`} onClick={() => actor && void run(async () => { await createReport(projectId, { scheduleRowId: scheduleRowId || null, reportDate, stage, planMemo, resultMemo, progressRate, delayReason, overtimeReason }, actor); setPlanMemo(''); setResultMemo(''); setDelayReason(''); setOvertimeReason(''); }, t('projectDelivery.message.reportSaved'))}><Send className="h-4 w-4" />{t('projectDelivery.action.saveReport')}</button></div>
    </section>}
    <div className="space-y-4">{workspace.dailyReports.map((report) => <DailyReportRow key={`${report.id}-${report.updatedAt}`} report={report} busy={busy} t={t} userName={userName} permissions={workspace.permissions} onApprove={(step) => actor && void run(() => approveReport(projectId, report.id, step, actor), t('projectDelivery.message.approved'))} />)}{!workspace.dailyReports.length && <Empty text={t('projectDelivery.daily.empty')} />}</div>
  </div>;

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4"><div><h3 className="font-bold text-[var(--color-text-main)]">{t('projectDelivery.title')}</h3><p className="mt-1 text-xs text-[var(--color-text-sub)]">{t('projectDelivery.canonical', { id: projectId })}</p></div><span className="rounded border border-[var(--color-border)] px-2 py-1 text-xs font-semibold">{t(`projectDelivery.workspace.${workspace.status}`)}</span></header>
    {message && <div role="status" className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</div>}
    {workspace.permissions.canManageDelivery && <section className="border-b border-[var(--color-border)] pb-5">
      <h4 className="mb-3 text-sm font-bold text-[var(--color-text-main)]">{t('projectDelivery.round.form')}</h4>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Field label={t('projectDelivery.round.kind')}><select className={inputClass} value={roundKind} onChange={(event) => setRoundKind(event.target.value as 'DELIVERY' | 'REDELIVERY')}><option value="DELIVERY">{t('projectDelivery.kind.DELIVERY')}</option><option value="REDELIVERY">{t('projectDelivery.kind.REDELIVERY')}</option></select></Field>
        {roundKind === 'REDELIVERY' && <Field label={t('projectDelivery.round.parent')}><select className={inputClass} value={parentRoundId} onChange={(event) => setParentRoundId(event.target.value)}><option value="">{t('unset')}</option>{workspace.rounds.map((round) => <option key={round.id} value={round.id}>{round.roundNo}. {round.label}</option>)}</select></Field>}
        <Field label={t('projectDelivery.round.label')}><input className={inputClass} value={roundLabel} onChange={(event) => setRoundLabel(event.target.value)} /></Field>
        <Field label={t('projectDelivery.round.date')}><input type="date" className={inputClass} value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></Field>
        <Field wide label={t('projectDelivery.round.memo')}><textarea className={`${inputClass} min-h-16 resize-y`} value={roundMemo} onChange={(event) => setRoundMemo(event.target.value)} /></Field>
      </div>
      <div className="mt-3 flex justify-end"><button type="button" disabled={busy || !roundLabel.trim() || (roundKind === 'REDELIVERY' && !parentRoundId)} className={`${buttonClass} bg-[var(--color-primary)] text-white`} onClick={() => actor && void run(async () => { await createRound(projectId, { kind: roundKind, parentRoundId: parentRoundId || null, label: roundLabel.trim(), deliveryDate, memo: roundMemo }, actor); setRoundLabel(''); setRoundMemo(''); setParentRoundId(''); setRoundKind('DELIVERY'); }, t('projectDelivery.message.roundSaved'))}>{roundKind === 'REDELIVERY' ? <RotateCcw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{t('projectDelivery.action.addRound')}</button></div>
    </section>}
    <section><h4 className="mb-3 text-sm font-bold text-[var(--color-text-main)]">{t('projectDelivery.round.list')}</h4><div className="space-y-4">{workspace.rounds.map((round) => <article key={round.id} className="border-y border-[var(--color-border)] py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-[var(--color-primary)]">{t('projectDelivery.round.no', { no: String(round.roundNo) })} · {t(`projectDelivery.kind.${round.kind}`)}</p><h5 className="mt-1 font-bold text-[var(--color-text-main)]">{round.label}</h5><p className="mt-1 text-xs text-[var(--color-text-sub)]">{round.deliveryDate.slice(0, 10)}{round.memo ? ` · ${round.memo}` : ''}</p></div>{workspace.permissions.canManageDelivery && <label className={`${buttonClass} cursor-pointer border border-[var(--color-border)]`}><Upload className="h-4 w-4" />{t('projectDelivery.action.addFile')}<input type="file" className="sr-only" onChange={(event) => onFile(round.id, event)} /></label>}</div><ul className="mt-3 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">{round.files.map((file) => <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span className="min-w-0 truncate font-semibold text-[var(--color-text-main)]">{file.originalName}</span><span className="text-xs text-[var(--color-text-sub)]">v{file.version} · {Math.ceil(file.size / 1024)} KB · {userName(file.createdBy)}</span></li>)}</ul>{!round.files.length && <p className="mt-3 text-xs text-[var(--color-text-sub)]">{t('projectDelivery.file.empty')}</p>}</article>)}{!workspace.rounds.length && <Empty text={t('projectDelivery.round.empty')} />}</div></section>
    <section className="grid gap-5 border-t border-[var(--color-border)] pt-5 lg:grid-cols-2">
      <div><h4 className="mb-3 text-sm font-bold text-[var(--color-text-main)]">{t('projectDelivery.record.title')}</h4>{workspace.permissions.canManageDelivery && <div className="space-y-2"><select className={inputClass} value={recordType} onChange={(event) => setRecordType(event.target.value as DeliveryRecordType)}>{(['CLIENT_DELIVERY', 'REVISION_REQUEST', 'INTERNAL_REVIEW', 'APPROVED', 'OTHER'] as const).map((item) => <option key={item} value={item}>{t(`projectDelivery.record.${item}`)}</option>)}</select><textarea className={`${inputClass} min-h-16`} value={recordMemo} onChange={(event) => setRecordMemo(event.target.value)} /><button type="button" disabled={busy || !recordMemo.trim()} className={`${buttonClass} w-full border border-[var(--color-border)]`} onClick={() => actor && void run(async () => { await addRecord(projectId, { occurredAt: new Date().toISOString(), type: recordType, memo: recordMemo.trim() }, actor); setRecordMemo(''); }, t('projectDelivery.message.recordSaved'))}><FilePlus2 className="h-4 w-4" />{t('projectDelivery.action.addRecord')}</button></div>}<ul className="mt-3 divide-y divide-[var(--color-border)]">{workspace.records.map((record) => <li key={record.id} className="py-2 text-sm"><strong>{t(`projectDelivery.record.${record.type}`)}</strong><p className="text-[var(--color-text-sub)]">{record.memo}</p></li>)}</ul></div>
      <div><h4 className="mb-3 text-sm font-bold text-[var(--color-text-main)]">{t('projectDelivery.download.title')}</h4>{workspace.permissions.canManageDelivery && <div className="space-y-2"><input className={inputClass} value={downloadTarget} onChange={(event) => setDownloadTarget(event.target.value)} placeholder={t('projectDelivery.download.target')} /><textarea className={`${inputClass} min-h-16`} value={downloadReason} onChange={(event) => setDownloadReason(event.target.value)} placeholder={t('projectDelivery.download.reason')} /><button type="button" disabled={busy || !downloadTarget.trim() || !downloadReason.trim()} className={`${buttonClass} w-full border border-[var(--color-border)]`} onClick={() => actor && void run(async () => { await requestDownload(projectId, downloadTarget.trim(), downloadReason.trim(), actor); setDownloadTarget(''); setDownloadReason(''); }, t('projectDelivery.message.downloadRequested'))}><FileClock className="h-4 w-4" />{t('projectDelivery.action.requestDownload')}</button></div>}<ul className="mt-3 divide-y divide-[var(--color-border)]">{workspace.downloadRequests.map((request) => <li key={request.id} className="py-3 text-sm"><div className="flex justify-between gap-2"><strong>{request.targetFile}</strong><span className="text-xs font-semibold">{t(`projectDelivery.approval.${request.status}`)}</span></div><p className="mt-1 text-[var(--color-text-sub)]">{request.reason}</p>{request.status === 'PENDING' && workspace.permissions.canApproveDownload && <div className="mt-2 flex gap-2"><button type="button" disabled={busy} className={`${buttonClass} bg-green-600 text-white`} onClick={() => actor && void run(() => reviewDownload(projectId, request.id, 'APPROVED', '', actor), t('projectDelivery.message.approved'))}><Check className="h-4 w-4" />{t('projectDelivery.action.approve')}</button><button type="button" disabled={busy} className={`${buttonClass} border border-red-300 text-red-700`} onClick={() => actor && void run(() => reviewDownload(projectId, request.id, 'REJECTED', '', actor), t('projectDelivery.message.rejected'))}>{t('projectDelivery.action.reject')}</button></div>}</li>)}</ul></div>
    </section>
  </div>;
}

function DailyReportRow({ report, busy, t, userName, permissions, onApprove }: { report: ProjectDailyReport; busy: boolean; t: ReturnType<typeof useTranslation>; userName: (id?: string | null) => string; permissions: ProjectDeliveryWorkspacePermissions; onApprove: (step: 'PM' | 'MANAGER' | 'EXECUTIVE') => void }) {
  const approvals = [{ step: 'PM' as const, status: report.pmStatus, allowed: permissions.canApprovePm }, { step: 'MANAGER' as const, status: report.managerStatus, allowed: permissions.canApproveManager }, { step: 'EXECUTIVE' as const, status: report.executiveStatus, allowed: permissions.canApproveExecutive }];
  return <article className="border-y border-[var(--color-border)] py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-[var(--color-primary)]">{t(`projectDelivery.stage.${report.stage}`)} · {report.reportDate.slice(0, 10)}</p><h4 className="mt-1 font-bold text-[var(--color-text-main)]">{t('projectDelivery.daily.progressValue', { progress: String(report.progressRate) })}</h4><p className="mt-1 text-xs text-[var(--color-text-sub)]">{userName(report.createdBy)}</p></div><Clock3 className="h-4 w-4 text-[var(--color-text-sub)]" /></div><div className="mt-3 grid gap-3 md:grid-cols-2">{report.planMemo && <Text label={t('projectDelivery.daily.plan')} value={report.planMemo} />}{report.resultMemo && <Text label={t('projectDelivery.daily.result')} value={report.resultMemo} />}{report.overtimeReason && <Text label={t('projectDelivery.daily.overtime')} value={report.overtimeReason} />}{report.delayReason && <Text label={t('projectDelivery.daily.delay')} value={report.delayReason} />}</div><div className="mt-3 flex flex-wrap gap-2">{approvals.filter((approval) => approval.status !== 'NOT_REQUIRED').map((approval) => <button key={approval.step} type="button" disabled={busy || !approval.allowed || approval.status === 'APPROVED' || (approval.step !== 'PM' && report.pmStatus !== 'APPROVED')} className={`${buttonClass} border border-[var(--color-border)]`} onClick={() => onApprove(approval.step)}>{approval.status === 'APPROVED' ? <Check className="h-4 w-4 text-green-600" /> : <Clock3 className="h-4 w-4" />}{t(`projectDelivery.approvalStep.${approval.step}`)} · {t(`projectDelivery.approval.${approval.status}`)}</button>)}</div></article>;
}

type ProjectDeliveryWorkspacePermissions = { canApprovePm: boolean; canApproveManager: boolean; canApproveExecutive: boolean };
function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={`block text-xs font-semibold text-[var(--color-text-sub)] ${wide ? 'md:col-span-2' : ''}`}>{label}<div className="mt-1">{children}</div></label>; }
function Text({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold text-[var(--color-text-sub)]">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-main)]">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="border-y border-dashed border-[var(--color-border)] py-8 text-center text-sm text-[var(--color-text-sub)]">{text}</p>; }
