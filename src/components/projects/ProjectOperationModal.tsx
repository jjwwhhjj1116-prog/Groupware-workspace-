'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, ClipboardList, Mail, MessageSquare, Phone, Trash2, Users, X } from 'lucide-react';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { useAuthStore } from '@/store/authStore';
import { useProjectOperationStore } from '@/store/projectOperationStore';
import { useProjectStore } from '@/store/projectStore';
import { useTranslationStore } from '@/store/translationStore';
import { ProjectOperationActivityKind } from '@/types/models';

type Tab = 'OVERVIEW' | 'ACTIVITY' | 'ASSIGNMENTS' | 'TIMELINE' | 'DELIVERY';
type Props = { projectId: string; onClose: () => void };

const inputClass = 'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';
const actionClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50';
const dateOnly = (value?: string | null) => value ? value.slice(0, 10) : '';

export function ProjectOperationModal({ projectId, onClose }: Props) {
  const { currentUser, users } = useAuthStore();
  const project = useProjectStore((state) => state.projects.find((item) => item.id === projectId));
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { operations, loading, error, sync, addActivity, deleteActivity, updateMilestones, reviewStart } = useProjectOperationStore();
  const operation = operations.find((item) => item.projectId === projectId);
  const [tab, setTab] = useState<Tab>('OVERVIEW');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<ProjectOperationActivityKind>('MEETING');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 16));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [metaA, setMetaA] = useState('');
  const [metaB, setMetaB] = useState('');
  const [awardDate, setAwardDate] = useState<string | null>(null);
  const [expectedDate, setExpectedDate] = useState<string | null>(null);
  const [actualDate, setActualDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const hasTimelineChanges = awardDate !== null || expectedDate !== null || actualDate !== null;

  const actor = currentUser ? { id: currentUser.id, role: currentUser.role, departmentId: currentUser.departmentId } : null;
  useEffect(() => { if (actor) void sync(actor); }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const userName = (id?: string | null) => {
    const user = users.find((item) => item.id === id);
    return user ? getUserDisplayName(user) : id || t('unset');
  };
  const activityGroups = useMemo(() => ({
    meetings: operation?.activities.filter((item) => item.kind === 'MEETING') || [],
    calls: operation?.activities.filter((item) => item.kind === 'CALL') || [],
    emails: operation?.activities.filter((item) => item.kind === 'EMAIL') || [],
    timeline: operation?.activities.filter((item) => !['MEETING', 'CALL', 'EMAIL', 'NOTE'].includes(item.kind)) || [],
  }), [operation?.activities]);

  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage('');
    try { await work(); setMessage(success); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : t('projectOperation.error.generic')); }
    finally { setBusy(false); }
  };

  const submitActivity = () => {
    if (!actor || !title.trim()) return;
    const metadata: Record<string, string | number | boolean | null> = kind === 'CALL' ? { contact: metaA, followUp: metaB }
      : kind === 'EMAIL' ? { from: metaA, to: metaB }
        : {};
    void run(async () => {
      await addActivity(projectId, { kind, occurredAt: new Date(activityDate).toISOString(), title: title.trim(), body: body.trim(), metadata }, actor);
      setTitle(''); setBody(''); setMetaA(''); setMetaB('');
    }, t('projectOperation.message.activitySaved'));
  };

  if (!currentUser) return null;
  const tabs: Array<[Tab, string]> = [
    ['OVERVIEW', t('projectOperation.tab.overview')],
    ['ACTIVITY', t('projectOperation.tab.activity')],
    ['ASSIGNMENTS', t('projectOperation.tab.assignments')],
    ['TIMELINE', t('projectOperation.tab.timeline')],
    ['DELIVERY', t('projectOperation.tab.delivery')],
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 md:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="project-operation-title" className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-4 py-4 md:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--color-primary)]">{t('projectOperation.canonicalId', { id: projectId })}</p>
            <h2 id="project-operation-title" className="truncate text-xl font-bold text-[var(--color-text-main)]">{operation?.project.name || project?.title || t('projectOperation.title')}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-sub)]">{t('projectOperation.subtitle')}</p>
          </div>
          <button type="button" aria-label={t('common.close')} onClick={onClose} className="rounded-md p-2 text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex overflow-x-auto border-b border-[var(--color-border)] px-2 md:px-5" role="tablist">
          {tabs.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] ${tab === value ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]'}`}>{label}</button>)}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {loading && !operation ? <p className="py-12 text-center text-sm text-[var(--color-text-sub)]">{t('projectOperation.loading')}</p>
            : !operation ? <p className="py-12 text-center text-sm text-red-600">{error || t('projectOperation.empty')}</p>
              : <>
                {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800" role="status">{message}</div>}

                {tab === 'OVERVIEW' && <div className="space-y-6">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                    <Info label={t('projectOperation.field.status')} value={operation.project.status} />
                    <Info label={t('projectOperation.field.manager')} value={userName(operation.project.managerId)} />
                    <Info label={t('projectOperation.field.pm')} value={userName(operation.project.pmId)} />
                    <Info label={t('projectOperation.field.startApproval')} value={t(`projectOperation.start.${operation.startApprovalStatus}`)} />
                    <Info label={t('projectOperation.field.awardDate')} value={dateOnly(operation.awardDate) || t('unset')} />
                    <Info label={t('projectOperation.field.expectedCompletion')} value={dateOnly(operation.expectedCompletionDate) || t('unset')} />
                    <Info label={t('projectOperation.field.actualCompletion')} value={dateOnly(operation.actualCompletionDate) || t('unset')} />
                    <Info label={t('projectOperation.field.version')} value={String(operation.version)} />
                  </dl>
                  <div className="border-t border-[var(--color-border)] pt-5">
                    <h3 className="mb-3 text-sm font-bold text-[var(--color-text-main)]">{t('projectOperation.sourceTrace')}</h3>
                    <dl className="grid gap-2 text-sm md:grid-cols-2">
                      {Object.entries(operation.sourceTrace).map(([key, value]) => <div key={key} className="flex min-w-0 justify-between gap-3 border-b border-[var(--color-border)] py-2"><dt className="text-[var(--color-text-sub)]">{key}</dt><dd className="truncate font-mono text-[var(--color-text-main)]">{value || t('unset')}</dd></div>)}
                    </dl>
                  </div>
                  {operation.permissions.canApprove && <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-5">
                    <button disabled={busy} onClick={() => actor && void run(() => reviewStart(projectId, 'APPROVED', '', actor), t('projectOperation.message.startApproved'))} className={`${actionClass} bg-green-600 text-white hover:bg-green-700`}><Check className="h-4 w-4" />{t('projectOperation.action.approveStart')}</button>
                    <button disabled={busy} onClick={() => actor && void run(() => reviewStart(projectId, 'REJECTED', '', actor), t('projectOperation.message.startRejected'))} className={`${actionClass} border border-red-300 text-red-700 hover:bg-red-50`}>{t('projectOperation.action.rejectStart')}</button>
                  </div>}
                </div>}

                {tab === 'ACTIVITY' && <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
                  <div className="space-y-3 border-b border-[var(--color-border)] pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
                    <h3 className="font-bold text-[var(--color-text-main)]">{t('projectOperation.activity.add')}</h3>
                    <select value={kind} onChange={(event) => setKind(event.target.value as ProjectOperationActivityKind)} className={inputClass} disabled={!operation.permissions.canEdit}>
                      {(['MEETING', 'CALL', 'EMAIL', 'NOTE'] as const).map((item) => <option key={item} value={item}>{t(`projectOperation.kind.${item}`)}</option>)}
                    </select>
                    <input type="datetime-local" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} className={inputClass} disabled={!operation.permissions.canEdit} />
                    <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('projectOperation.activity.title')} className={inputClass} disabled={!operation.permissions.canEdit} />
                    <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={t('projectOperation.activity.body')} className={`${inputClass} min-h-24 resize-y`} disabled={!operation.permissions.canEdit} />
                    {kind === 'CALL' && <><input value={metaA} onChange={(event) => setMetaA(event.target.value)} placeholder={t('projectOperation.activity.contact')} className={inputClass} /><input value={metaB} onChange={(event) => setMetaB(event.target.value)} placeholder={t('projectOperation.activity.followUp')} className={inputClass} /></>}
                    {kind === 'EMAIL' && <><input value={metaA} onChange={(event) => setMetaA(event.target.value)} placeholder={t('projectOperation.activity.from')} className={inputClass} /><input value={metaB} onChange={(event) => setMetaB(event.target.value)} placeholder={t('projectOperation.activity.to')} className={inputClass} /></>}
                    <button disabled={busy || !operation.permissions.canEdit || !title.trim()} onClick={submitActivity} className={`${actionClass} w-full bg-[var(--color-primary)] text-white`}>{t('projectOperation.action.saveActivity')}</button>
                  </div>
                  <div className="space-y-5">
                    <ActivityGroup icon={<MessageSquare className="h-4 w-4" />} title={t('projectOperation.kind.MEETING')} items={activityGroups.meetings} userName={userName} canDelete={operation.permissions.canEdit} deleteLabel={t('projectOperation.action.deleteActivity')} onDelete={(id) => actor && void run(() => deleteActivity(projectId, id, actor), t('projectOperation.message.activityDeleted'))} />
                    <ActivityGroup icon={<Phone className="h-4 w-4" />} title={t('projectOperation.kind.CALL')} items={activityGroups.calls} userName={userName} canDelete={operation.permissions.canEdit} deleteLabel={t('projectOperation.action.deleteActivity')} onDelete={(id) => actor && void run(() => deleteActivity(projectId, id, actor), t('projectOperation.message.activityDeleted'))} />
                    <ActivityGroup icon={<Mail className="h-4 w-4" />} title={t('projectOperation.kind.EMAIL')} items={activityGroups.emails} userName={userName} canDelete={operation.permissions.canEdit} deleteLabel={t('projectOperation.action.deleteActivity')} onDelete={(id) => actor && void run(() => deleteActivity(projectId, id, actor), t('projectOperation.message.activityDeleted'))} />
                  </div>
                </div>}

                {tab === 'ASSIGNMENTS' && <div className="space-y-5">
                  <h3 className="flex items-center gap-2 font-bold text-[var(--color-text-main)]"><Users className="h-4 w-4" />{t('projectOperation.assignments.title')}</h3>
                  <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-y border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-sub)]"><tr><th className="p-3">{t('projectOperation.assignments.person')}</th><th className="p-3">{t('projectOperation.assignments.category')}</th><th className="p-3">{t('projectOperation.assignments.scope')}</th><th className="p-3">{t('projectOperation.assignments.period')}</th></tr></thead><tbody>{operation.assignments.rows.map((row) => <tr key={row.id} className="border-b border-[var(--color-border)]"><td className="p-3 font-semibold">{userName(row.assigneeId)}</td><td className="p-3">{t(`pmSchedule.category.${row.category}`)}</td><td className="p-3">{row.scope || t('unset')}</td><td className="p-3">{row.startDate} ~ {row.endDate}</td></tr>)}</tbody></table></div>
                  {!operation.assignments.rows.length && <p className="py-8 text-center text-sm text-[var(--color-text-sub)]">{t('projectOperation.assignments.empty')}</p>}
                </div>}

                {tab === 'TIMELINE' && <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
                  <div className="space-y-3 border-b border-[var(--color-border)] pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
                    <h3 className="flex items-center gap-2 font-bold text-[var(--color-text-main)]"><CalendarClock className="h-4 w-4" />{t('projectOperation.timeline.update')}</h3>
                    <label className="block text-xs font-semibold text-[var(--color-text-sub)]">{t('projectOperation.field.awardDate')}<input type="date" value={awardDate ?? dateOnly(operation.awardDate)} onChange={(event) => setAwardDate(event.target.value)} className={`${inputClass} mt-1`} /></label>
                    <label className="block text-xs font-semibold text-[var(--color-text-sub)]">{t('projectOperation.field.expectedCompletion')}<input type="date" value={expectedDate ?? dateOnly(operation.expectedCompletionDate)} onChange={(event) => setExpectedDate(event.target.value)} className={`${inputClass} mt-1`} /></label>
                    <label className="block text-xs font-semibold text-[var(--color-text-sub)]">{t('projectOperation.field.actualCompletion')}<input type="date" value={actualDate ?? dateOnly(operation.actualCompletionDate)} onChange={(event) => setActualDate(event.target.value)} className={`${inputClass} mt-1`} /></label>
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('projectOperation.timeline.reason')} className={`${inputClass} min-h-20`} />
                    <button disabled={busy || !operation.permissions.canEdit || !hasTimelineChanges || !reason.trim()} onClick={() => actor && void run(async () => {
                      await updateMilestones(projectId, {
                        ...(awardDate !== null ? { awardDate } : {}),
                        ...(expectedDate !== null ? { expectedCompletionDate: expectedDate } : {}),
                        ...(actualDate !== null ? { actualCompletionDate: actualDate } : {}),
                        reason,
                      }, actor);
                      setAwardDate(null); setExpectedDate(null); setActualDate(null); setReason('');
                    }, t('projectOperation.message.timelineSaved'))} className={`${actionClass} w-full bg-[var(--color-primary)] text-white`}>{t('projectOperation.action.saveTimeline')}</button>
                  </div>
                  <ActivityGroup icon={<ClipboardList className="h-4 w-4" />} title={t('projectOperation.tab.timeline')} items={activityGroups.timeline} userName={userName} canDelete={false} deleteLabel={t('projectOperation.action.deleteActivity')} onDelete={() => undefined} />
                </div>}

                {tab === 'DELIVERY' && <div className="space-y-5">
                  <h3 className="font-bold text-[var(--color-text-main)]">{t('projectOperation.delivery.title')}</h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
                    <Info label={t('projectOperation.delivery.date')} value={project?.deliveryDate || t('unset')} />
                    <Info label={t('projectOperation.delivery.status')} value={project?.deliveryDateStatus || t('unset')} />
                    <Info label={t('projectOperation.delivery.lifecycle')} value={project?.deliveryLifecycle || t('unset')} />
                    <Info label={t('projectOperation.delivery.changedBy')} value={userName(project?.deliveryDateUpdatedBy)} />
                    <Info label={t('projectOperation.delivery.changeReason')} value={project?.deliveryDateChangeReason || t('unset')} />
                    <Info label={t('projectOperation.delivery.closedAt')} value={project?.deliveryClosedAt || t('unset')} />
                  </dl>
                  <p className="border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-text-sub)]">{t('projectOperation.delivery.deferred')}</p>
                </div>}
              </>}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-[var(--color-text-sub)]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[var(--color-text-main)]">{value}</dd></div>;
}

function ActivityGroup({ icon, title, items, userName, canDelete, deleteLabel, onDelete }: { icon: React.ReactNode; title: string; items: Array<{ id: string; occurredAt: string; title: string; body: string; createdBy: string; metadata: Record<string, string | number | boolean | null> }>; userName: (id?: string | null) => string; canDelete: boolean; deleteLabel: string; onDelete: (id: string) => void }) {
  return <section><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--color-text-main)]">{icon}{title}<span className="text-xs text-[var(--color-text-sub)]">{items.length}</span></h3>{items.length ? <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">{items.map((item) => <li key={item.id} className="flex gap-3 py-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><strong className="text-sm text-[var(--color-text-main)]">{item.title}</strong><span className="text-xs text-[var(--color-text-sub)]">{new Date(item.occurredAt).toLocaleString()}</span></div>{item.body && <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-sub)]">{item.body}</p>}<p className="mt-1 text-xs text-[var(--color-text-sub)]">{userName(item.createdBy)} {Object.entries(item.metadata).filter(([, value]) => value).map(([key, value]) => ` · ${key}: ${value}`).join('')}</p></div>{canDelete && <button type="button" aria-label={deleteLabel} onClick={() => onDelete(item.id)} className="self-start rounded p-1.5 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><Trash2 className="h-4 w-4" /></button>}</li>)}</ul> : <p className="border-y border-dashed border-[var(--color-border)] py-5 text-center text-sm text-[var(--color-text-sub)]">-</p>}</section>;
}
