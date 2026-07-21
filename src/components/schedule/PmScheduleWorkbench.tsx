'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, Check, History, Plus, RefreshCw, Save, Search, Send, Trash2, UsersRound, X } from 'lucide-react';
import { newPmScheduleRow, PmScheduleActor } from '@/lib/projectPmSchedule';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { useAuthStore } from '@/store/authStore';
import { useProjectPmScheduleStore } from '@/store/projectPmScheduleStore';
import { useTranslationStore } from '@/store/translationStore';
import { PmAssignment, PmRequestTargets, PmSchedulePlan, PmScheduleRow, ProjectPmSchedule, ProjectPmScheduleStatus } from '@/types/models';

const inputClass = 'w-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-2 text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';
const buttonFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';

export function PmScheduleWorkbench() {
  const { currentUser, users } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { schedules, persistenceMode, loading, error, sync, assign, requestDraft, savePlans, submit, approve, reject } = useProjectPmScheduleStore();
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProjectPmScheduleStatus>('ALL');
  const [mode, setMode] = useState<'DETAIL' | 'ALL'>('DETAIL');
  const [assignment, setAssignment] = useState<PmAssignment>({ primaryPmId: '', finishPmId: '', structurePmId: '', bimPmId: '', civilPmId: '' });
  const [targets, setTargets] = useState<PmRequestTargets>({ pmIds: [], teamLeaderIds: [] });
  const [memo, setMemo] = useState('');
  const [plan1, setPlan1] = useState<PmSchedulePlan>({ id: 'plan1', title: 'Plan 1', rows: [] });
  const [plan2, setPlan2] = useState<PmSchedulePlan>({ id: 'plan2', title: 'Plan 2', rows: [] });
  const [selectedPlan, setSelectedPlan] = useState<'plan1' | 'plan2'>('plan1');
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const actor = useMemo<PmScheduleActor | null>(() => currentUser ? ({ id: currentUser.id, role: currentUser.role, departmentId: currentUser.departmentId }) : null, [currentUser]);

  useEffect(() => {
    if (actor) void sync(actor);
  }, [actor, sync]);

  const filtered = useMemo(() => schedules.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const haystack = `${item.project.name} ${item.projectId}`.toLowerCase();
    return matchesStatus && haystack.includes(query.trim().toLowerCase());
  }), [query, schedules, statusFilter]);

  const effectiveSelectedId = schedules.some((item) => item.projectId === selectedId) ? selectedId : (filtered[0]?.projectId || '');
  const selected = schedules.find((item) => item.projectId === effectiveSelectedId) || null;

  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => {
      setAssignment(selected.assignment);
      setTargets(selected.requestTargets);
      setMemo(selected.requestMemo || '');
      setPlan1(selected.plan1);
      setPlan2(selected.plan2);
      setSelectedPlan(selected.selectedProposal || selected.approvedPlan || 'plan1');
      setRejectReason(selected.rejectReason || '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected]);

  const pmUsers = users.filter((user) => user.isActive !== false && ['PM', 'DEPARTMENT_MANAGER', 'SUPER_ADMIN'].includes(user.role));
  const scheduleUsers = users.filter((user) => user.isActive !== false && ['WORKER', 'PM', 'DEPARTMENT_MANAGER', 'SUPER_ADMIN'].includes(user.role));
  const teamLeaders = users.filter((user) => user.isActive !== false && ['TEAM_LEADER', 'MANAGER'].includes(user.organizationRank || ''));

  const run = async (operation: () => Promise<ProjectPmSchedule>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await operation();
      setSelectedId(updated.projectId);
      setMessage({ type: 'success', text: success });
    } catch (caught) {
      setMessage({ type: 'error', text: caught instanceof Error ? caught.message : t('pmSchedule.error.generic') });
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = (status: ProjectPmScheduleStatus) => ({
    PENDING_ASSIGNMENT: t('pmSchedule.status.PENDING_ASSIGNMENT'),
    PM_ASSIGNED: t('pmSchedule.status.PM_ASSIGNED'),
    DRAFT_REQUESTED: t('pmSchedule.status.DRAFT_REQUESTED'),
    DRAFTING: t('pmSchedule.status.DRAFTING'),
    SUBMITTED: t('pmSchedule.status.SUBMITTED'),
    REJECTED: t('pmSchedule.status.REJECTED'),
    APPROVED: t('pmSchedule.status.APPROVED'),
  })[status];

  const toggleTarget = (group: keyof PmRequestTargets, id: string) => setTargets((current) => ({
    ...current,
    [group]: current[group].includes(id) ? current[group].filter((item) => item !== id) : [...current[group], id],
  }));

  const approvedRows = schedules.flatMap((item) => {
    if (item.status !== 'APPROVED') return [];
    const plan = item.approvedPlan === 'plan2' ? item.plan2 : item.plan1;
    return plan.rows.map((row) => ({ ...row, projectId: item.projectId, projectName: item.project.name, planTitle: plan.title }));
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (!currentUser || !actor) return null;

  return (
    <section className="space-y-4" aria-labelledby="pm-schedule-title">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
            <h2 id="pm-schedule-title" className="text-lg font-bold text-[var(--color-text-main)]">{t('pmSchedule.title')}</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-sub)]">{t('pmSchedule.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--color-text-sub)]">{persistenceMode === 'SERVER' ? t('pmSchedule.persistence.server') : t('pmSchedule.persistence.local')}</span>
          <button type="button" onClick={() => void sync(actor)} disabled={loading} title={t('common.refresh')} className={`${buttonFocus} p-2 text-[var(--color-text-sub)] hover:text-[var(--color-primary)] disabled:opacity-50`}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="sr-only">{t('common.refresh')}</span>
          </button>
          <div className="flex border border-[var(--color-border-strong)]" role="group" aria-label={t('pmSchedule.viewMode')}>
            <button type="button" onClick={() => setMode('DETAIL')} className={`${buttonFocus} px-3 py-2 text-sm font-semibold ${mode === 'DETAIL' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-sub)]'}`}>{t('pmSchedule.view.detail')}</button>
            <button type="button" onClick={() => setMode('ALL')} className={`${buttonFocus} px-3 py-2 text-sm font-semibold ${mode === 'ALL' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-sub)]'}`}>{t('pmSchedule.view.all')}</button>
          </div>
        </div>
      </div>

      {(error || message) && (
        <div role="status" className={`flex items-start gap-2 border px-3 py-2 text-sm ${message?.type === 'success' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
          {message?.type === 'success' ? <Check className="mt-0.5 h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />}
          <span>{message?.text || error}</span>
        </div>
      )}

      {mode === 'ALL' ? (
        <ApprovedScheduleTable rows={approvedRows} users={users} emptyLabel={t('pmSchedule.all.empty')} t={t} />
      ) : (
        <div className="grid min-h-[620px] grid-cols-1 border border-[var(--color-border)] bg-[var(--color-surface)] lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-[var(--color-border)] lg:border-b-0 lg:border-r" aria-label={t('pmSchedule.projectList')}>
            <div className="space-y-2 border-b border-[var(--color-border)] p-3">
              <label className="relative block">
                <span className="sr-only">{t('pmSchedule.search')}</span>
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-text-sub)]" aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('pmSchedule.search')} className={`${inputClass} pl-8`} />
              </label>
              <select aria-label={t('pmSchedule.statusFilter')} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ProjectPmScheduleStatus)} className={inputClass}>
                <option value="ALL">{t('pmSchedule.status.ALL')}</option>
                {(['PENDING_ASSIGNMENT', 'PM_ASSIGNED', 'DRAFT_REQUESTED', 'DRAFTING', 'SUBMITTED', 'REJECTED', 'APPROVED'] as const).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </div>
            <div className="max-h-[540px] overflow-y-auto">
              {filtered.map((item) => (
                <button key={item.projectId} type="button" onClick={() => setSelectedId(item.projectId)} className={`${buttonFocus} w-full border-b border-[var(--color-border)] px-3 py-3 text-left ${item.projectId === effectiveSelectedId ? 'bg-[var(--color-bg)]' : 'hover:bg-[var(--color-bg)]/60'}`}>
                  <span className="block truncate text-sm font-semibold text-[var(--color-text-main)]">{item.project.name}</span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--color-text-sub)]"><span>{statusLabel(item.status)}</span><span>v{item.version}</span></span>
                </button>
              ))}
              {!filtered.length && <p className="p-4 text-center text-sm text-[var(--color-text-sub)]">{t('pmSchedule.empty')}</p>}
            </div>
          </aside>

          <main className="min-w-0 p-4 lg:p-5">
            {selected ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-main)]">{selected.project.name}</h3>
                    <p className="mt-1 break-all font-mono text-xs text-[var(--color-text-sub)]">{t('pmSchedule.canonicalId')}: {selected.projectId}</p>
                  </div>
                  <span className="self-start bg-[var(--color-bg)] px-2 py-1 text-xs font-semibold text-[var(--color-text-main)]">{statusLabel(selected.status)}</span>
                </div>

                <AssignmentSection assignment={assignment} onChange={setAssignment} users={pmUsers} disabled={!selected.permissions.canAssign || busy} t={t} onSave={() => void run(() => assign(selected.projectId, assignment, actor), t('pmSchedule.message.assigned'))} />
                <RequestSection targets={targets} memo={memo} onMemo={setMemo} onToggle={toggleTarget} pmUsers={pmUsers} teamLeaders={teamLeaders} disabled={!selected.permissions.canAssign || busy || !assignment.primaryPmId} t={t} onRequest={() => void run(() => requestDraft(selected.projectId, targets, memo, actor), t('pmSchedule.message.requested'))} />

                {selected.rejectReason && <div className="border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-800"><strong>{t('pmSchedule.rejectReason')}:</strong> {selected.rejectReason}</div>}

                <div className="space-y-4">
                  <div className="flex items-center gap-2"><CalendarRange className="h-4 w-4" aria-hidden="true" /><h4 className="text-sm font-bold text-[var(--color-text-main)]">{t('pmSchedule.plans')}</h4></div>
                  <PlanEditor plan={plan1} onChange={setPlan1} users={scheduleUsers} disabled={!selected.permissions.canEdit || busy} t={t} />
                  <PlanEditor plan={plan2} onChange={setPlan2} users={scheduleUsers} disabled={!selected.permissions.canEdit || busy} t={t} />
                  {selected.permissions.canEdit && (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" disabled={busy} onClick={() => void run(() => savePlans(selected.projectId, plan1, plan2, actor), t('pmSchedule.message.saved'))} className={`${buttonFocus} inline-flex items-center gap-2 border border-[var(--color-border-strong)] px-3 py-2 text-sm font-semibold text-[var(--color-text-main)] disabled:opacity-50`}><Save className="h-4 w-4" aria-hidden="true" />{t('pmSchedule.action.save')}</button>
                      <button type="button" disabled={busy} onClick={() => void run(() => submit(selected.projectId, plan1, plan2, actor), t('pmSchedule.message.submitted'))} className={`${buttonFocus} inline-flex items-center gap-2 bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50`}><Send className="h-4 w-4" aria-hidden="true" />{selected.status === 'REJECTED' ? t('pmSchedule.action.resubmit') : t('pmSchedule.action.submit')}</button>
                    </div>
                  )}
                </div>

                {selected.permissions.canReview && (
                  <div className="space-y-3 border-t border-[var(--color-border)] pt-5">
                    <h4 className="text-sm font-bold text-[var(--color-text-main)]">{t('pmSchedule.review')}</h4>
                    <div className="flex flex-wrap gap-4">
                      {(['plan1', 'plan2'] as const).map((plan) => <label key={plan} className="flex items-center gap-2 text-sm"><input type="radio" name="approved-plan" value={plan} checked={selectedPlan === plan} onChange={() => setSelectedPlan(plan)} className={buttonFocus} />{plan === 'plan1' ? plan1.title : plan2.title}</label>)}
                    </div>
                    <label className="block text-sm font-medium text-[var(--color-text-main)]">{t('pmSchedule.rejectReason')}<textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={2} className={`${inputClass} mt-1 resize-y`} /></label>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" disabled={busy || !rejectReason.trim()} onClick={() => void run(() => reject(selected.projectId, rejectReason, actor), t('pmSchedule.message.rejected'))} className={`${buttonFocus} inline-flex items-center gap-2 border border-red-400 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50`}><X className="h-4 w-4" aria-hidden="true" />{t('pmSchedule.action.reject')}</button>
                      <button type="button" disabled={busy} onClick={() => void run(() => approve(selected.projectId, selectedPlan, actor), t('pmSchedule.message.approved'))} className={`${buttonFocus} inline-flex items-center gap-2 bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50`}><Check className="h-4 w-4" aria-hidden="true" />{t('pmSchedule.action.approve')}</button>
                    </div>
                  </div>
                )}

                <HistorySection schedule={selected} users={users} t={t} />
              </div>
            ) : <p className="py-16 text-center text-sm text-[var(--color-text-sub)]">{t('pmSchedule.selectPrompt')}</p>}
          </main>
        </div>
      )}
    </section>
  );
}

type TFunction = ReturnType<typeof useTranslation>;
type UserOption = ReturnType<typeof useAuthStore.getState>['users'][number];

function UserSelect({ value, onChange, users, label, disabled }: { value: string; onChange: (value: string) => void; users: UserOption[]; label: string; disabled: boolean }) {
  return <label className="block text-xs font-medium text-[var(--color-text-sub)]">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`${inputClass} mt-1 disabled:opacity-60`}><option value="">-</option>{users.map((user) => <option key={user.id} value={user.id}>{getUserDisplayName(user)}</option>)}</select></label>;
}

function AssignmentSection({ assignment, onChange, users, disabled, onSave, t }: { assignment: PmAssignment; onChange: (value: PmAssignment) => void; users: UserOption[]; disabled: boolean; onSave: () => void; t: TFunction }) {
  const fields: Array<[keyof PmAssignment, string]> = [['primaryPmId', t('pmSchedule.assignment.primary')], ['finishPmId', t('pmSchedule.assignment.finish')], ['structurePmId', t('pmSchedule.assignment.structure')], ['bimPmId', t('pmSchedule.assignment.bim')], ['civilPmId', t('pmSchedule.assignment.civil')]];
  return <section className="space-y-3" aria-labelledby="pm-assignment-title"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><UsersRound className="h-4 w-4" aria-hidden="true" /><h4 id="pm-assignment-title" className="text-sm font-bold text-[var(--color-text-main)]">{t('pmSchedule.assignment')}</h4></div>{!disabled && <button type="button" onClick={onSave} className={`${buttonFocus} inline-flex items-center gap-1 bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white`}><Save className="h-3.5 w-3.5" aria-hidden="true" />{t('pmSchedule.action.saveAssignment')}</button>}</div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{fields.map(([field, label]) => <UserSelect key={field} value={assignment[field]} onChange={(value) => onChange({ ...assignment, [field]: value })} users={users} label={label} disabled={disabled} />)}</div></section>;
}

function RequestSection({ targets, memo, onMemo, onToggle, pmUsers, teamLeaders, disabled, onRequest, t }: { targets: PmRequestTargets; memo: string; onMemo: (value: string) => void; onToggle: (group: keyof PmRequestTargets, id: string) => void; pmUsers: UserOption[]; teamLeaders: UserOption[]; disabled: boolean; onRequest: () => void; t: TFunction }) {
  return <section className="space-y-3 border-t border-[var(--color-border)] pt-5"><div className="flex items-center justify-between"><h4 className="text-sm font-bold text-[var(--color-text-main)]">{t('pmSchedule.request')}</h4>{!disabled && <button type="button" onClick={onRequest} className={`${buttonFocus} inline-flex items-center gap-1 bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white`}><Send className="h-3.5 w-3.5" aria-hidden="true" />{t('pmSchedule.action.request')}</button>}</div><div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><TargetChecks title={t('pmSchedule.request.pmTargets')} items={pmUsers} checked={targets.pmIds} onToggle={(id) => onToggle('pmIds', id)} disabled={disabled} /><TargetChecks title={t('pmSchedule.request.leaderTargets')} items={teamLeaders} checked={targets.teamLeaderIds} onToggle={(id) => onToggle('teamLeaderIds', id)} disabled={disabled} /></div><label className="block text-xs font-medium text-[var(--color-text-sub)]">{t('pmSchedule.request.memo')}<textarea value={memo} disabled={disabled} onChange={(event) => onMemo(event.target.value)} rows={2} className={`${inputClass} mt-1 resize-y disabled:opacity-60`} /></label></section>;
}

function TargetChecks({ title, items, checked, onToggle, disabled }: { title: string; items: UserOption[]; checked: string[]; onToggle: (id: string) => void; disabled: boolean }) {
  return <fieldset disabled={disabled} className="min-w-0"><legend className="mb-2 text-xs font-medium text-[var(--color-text-sub)]">{title}</legend><div className="flex max-h-28 flex-wrap gap-x-4 gap-y-2 overflow-y-auto border border-[var(--color-border)] p-2">{items.map((user) => <label key={user.id} className="flex items-center gap-2 text-xs text-[var(--color-text-main)]"><input type="checkbox" checked={checked.includes(user.id)} onChange={() => onToggle(user.id)} className={buttonFocus} />{getUserDisplayName(user)}</label>)}</div></fieldset>;
}

function PlanEditor({ plan, onChange, users, disabled, t }: { plan: PmSchedulePlan; onChange: (value: PmSchedulePlan) => void; users: UserOption[]; disabled: boolean; t: TFunction }) {
  const updateRow = (id: string, field: keyof PmScheduleRow, value: string | number) => onChange({ ...plan, rows: plan.rows.map((row) => row.id === id ? { ...row, [field]: value } : row) });
  const updateAssignee = (id: string, assigneeId: string) => {
    const user = users.find((item) => item.id === assigneeId);
    onChange({ ...plan, rows: plan.rows.map((row) => row.id === id ? { ...row, assigneeId, departmentId: user?.departmentId || '' } : row) });
  };
  const addRow = () => onChange({ ...plan, rows: [...plan.rows, newPmScheduleRow(users[0])] });
  return <section className="border border-[var(--color-border)]"><div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"><input aria-label={t('pmSchedule.planTitle')} value={plan.title} disabled={disabled} onChange={(event) => onChange({ ...plan, title: event.target.value })} className="min-w-0 bg-transparent text-sm font-bold text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" />{!disabled && <button type="button" onClick={addRow} title={t('pmSchedule.action.addRow')} className={`${buttonFocus} p-1.5 text-[var(--color-primary)]`}><Plus className="h-4 w-4" aria-hidden="true" /><span className="sr-only">{t('pmSchedule.action.addRow')}</span></button>}</div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-xs"><thead><tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-sub)]">{[t('pmSchedule.row.assignee'), t('pmSchedule.row.category'), t('pmSchedule.row.scope'), t('pmSchedule.row.start'), t('pmSchedule.row.end'), t('pmSchedule.row.people'), t('pmSchedule.row.workDays'), t('pmSchedule.row.totalDays'), ''].map((label, index) => <th key={`${label}-${index}`} className="px-2 py-2 font-semibold">{label}</th>)}</tr></thead><tbody>{plan.rows.map((row) => <tr key={row.id} className="border-b border-[var(--color-border)] last:border-b-0"><td className="p-1"><select value={row.assigneeId} disabled={disabled} onChange={(event) => updateAssignee(row.id, event.target.value)} className={inputClass}>{users.map((user) => <option key={user.id} value={user.id}>{getUserDisplayName(user)}</option>)}</select></td><td className="p-1"><select value={row.category} disabled={disabled} onChange={(event) => updateRow(row.id, 'category', event.target.value)} className={inputClass}><option value="STRUCTURE">{t('pmSchedule.category.STRUCTURE')}</option><option value="FINISH">{t('pmSchedule.category.FINISH')}</option><option value="BIM">{t('pmSchedule.category.BIM')}</option><option value="CIVIL">{t('pmSchedule.category.CIVIL')}</option><option value="OTHER">{t('pmSchedule.category.OTHER')}</option></select></td><td className="p-1"><input value={row.scope} disabled={disabled} onChange={(event) => updateRow(row.id, 'scope', event.target.value)} className={inputClass} /></td><td className="p-1"><input type="date" value={row.startDate} disabled={disabled} onChange={(event) => updateRow(row.id, 'startDate', event.target.value)} className={inputClass} /></td><td className="p-1"><input type="date" value={row.endDate} disabled={disabled} onChange={(event) => updateRow(row.id, 'endDate', event.target.value)} className={inputClass} /></td>{(['people', 'workDays', 'totalDays'] as const).map((field) => <td key={field} className="p-1"><input type="number" min="1" value={row[field]} disabled={disabled} onChange={(event) => updateRow(row.id, field, Math.max(1, Number(event.target.value)))} className={`${inputClass} w-20`} /></td>)}<td className="p-1">{!disabled && <button type="button" onClick={() => onChange({ ...plan, rows: plan.rows.filter((item) => item.id !== row.id) })} title={t('pmSchedule.action.deleteRow')} className={`${buttonFocus} p-2 text-red-600`}><Trash2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">{t('pmSchedule.action.deleteRow')}</span></button>}</td></tr>)}</tbody></table>{!plan.rows.length && <p className="p-4 text-center text-xs text-[var(--color-text-sub)]">{t('pmSchedule.plan.empty')}</p>}</div></section>;
}

function HistorySection({ schedule, users, t }: { schedule: ProjectPmSchedule; users: UserOption[]; t: TFunction }) {
  return <section className="space-y-3 border-t border-[var(--color-border)] pt-5"><div className="flex items-center gap-2"><History className="h-4 w-4" aria-hidden="true" /><h4 className="text-sm font-bold text-[var(--color-text-main)]">{t('pmSchedule.history')}</h4></div>{schedule.histories.length ? <ol className="space-y-2">{schedule.histories.map((item) => <li key={item.id} className="flex flex-col gap-1 border-l-2 border-[var(--color-border-strong)] pl-3 text-xs sm:flex-row sm:items-center sm:justify-between"><span className="font-medium text-[var(--color-text-main)]">{item.action}: {item.fromStatus} → {item.toStatus}</span><span className="text-[var(--color-text-sub)]">{getUserDisplayName(users.find((user) => user.id === item.actorId))} · {new Date(item.createdAt).toLocaleString()}</span></li>)}</ol> : <p className="text-sm text-[var(--color-text-sub)]">{t('pmSchedule.history.empty')}</p>}</section>;
}

function ApprovedScheduleTable({ rows, users, emptyLabel, t }: { rows: Array<PmScheduleRow & { projectId: string; projectName: string; planTitle: string }>; users: UserOption[]; emptyLabel: string; t: TFunction }) {
  return <div className="overflow-x-auto border border-[var(--color-border)] bg-[var(--color-surface)]"><table className="w-full min-w-[800px] text-sm"><thead><tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-left text-xs text-[var(--color-text-sub)]"><th className="px-3 py-3">{t('pmSchedule.all.project')}</th><th className="px-3 py-3">{t('pmSchedule.row.assignee')}</th><th className="px-3 py-3">{t('pmSchedule.row.scope')}</th><th className="px-3 py-3">{t('pmSchedule.all.period')}</th><th className="px-3 py-3">{t('pmSchedule.row.people')}</th><th className="px-3 py-3">{t('pmSchedule.row.totalDays')}</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.projectId}-${row.id}`} className="border-b border-[var(--color-border)] last:border-b-0"><td className="px-3 py-3"><span className="block font-semibold text-[var(--color-text-main)]">{row.projectName}</span><span className="font-mono text-[10px] text-[var(--color-text-sub)]">{row.projectId}</span></td><td className="px-3 py-3">{getUserDisplayName(users.find((user) => user.id === row.assigneeId))}</td><td className="px-3 py-3">{row.scope || '-'}</td><td className="px-3 py-3">{row.startDate} ~ {row.endDate}</td><td className="px-3 py-3">{row.people}</td><td className="px-3 py-3">{row.totalDays}</td></tr>)}</tbody></table>{!rows.length && <p className="p-8 text-center text-sm text-[var(--color-text-sub)]">{emptyLabel}</p>}</div>;
}
