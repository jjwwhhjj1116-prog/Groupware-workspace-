'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Ban,
  CircleOff,
  Database,
  FileSpreadsheet,
  FileCheck2,
  FileText,
  History,
  Mail,
  MessageSquareText,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  PauseCircle,
  Trash2,
  UserRound,
} from 'lucide-react';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { useEstimateRequestStore } from '@/store/estimateRequestStore';
import {
  CommercialDecisionInput,
  CommercialDecisionType,
  EstimateRequest,
  EstimateRequestActivityKind,
  EstimateRequestStatus,
  PersonnelCard,
} from '@/types/models';

type Translate = ReturnType<typeof useTranslation>;

const STATUSES: EstimateRequestStatus[] = [
  'REQUEST_MEMO',
  'ESTIMATE_DRAFTING',
  'WAITING',
  'WON',
  'LOST',
  'CANCELLED',
  'ON_HOLD',
  'OTHER',
];

const OPERATIONAL_STATUSES: EstimateRequestStatus[] = [
  'REQUEST_MEMO',
  'ESTIMATE_DRAFTING',
  'WAITING',
  'OTHER',
];

const DECISIONS: Array<{ value: CommercialDecisionType; icon: typeof BadgeCheck }> = [
  { value: 'WON', icon: BadgeCheck },
  { value: 'LOST', icon: CircleOff },
  { value: 'CANCELLED', icon: Ban },
  { value: 'ON_HOLD', icon: PauseCircle },
];

const ACTIVITY_ICONS = {
  CONSULTATION: MessageSquareText,
  CALL: Phone,
  EMAIL: Mail,
  NOTE: FileText,
};

const statusText = (t: Translate, status: EstimateRequestStatus) => t(`estimateRequest.status.${status}` as Parameters<Translate>[0]);
const activityText = (t: Translate, kind: EstimateRequestActivityKind) => t(`estimateRequest.activity.${kind}` as Parameters<Translate>[0]);

type Props = {
  currentUser: PersonnelCard;
  users: PersonnelCard[];
  t: Translate;
};

const emptyDraft = {
  projectName: '',
  company: '',
  client: '',
  contact: '',
  contactDepartment: '',
  phone: '',
  email: '',
  ownerId: '',
  memo: '',
  scope: '',
  usage: '',
  areaPy: '',
  floors: '',
  firstDelivery: '',
};

export function EstimateRequestWorkbench({ currentUser, users, t }: Props) {
  const {
    requests,
    persistenceMode,
    loading,
    error,
    sync,
    createRequest,
    updateRequest,
    changeStatus,
    recordDecision,
    addActivity,
    addAttachments,
    removeAttachment,
  } = useEstimateRequestStore();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateRequestStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(() => typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('requestId'));
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [activityKind, setActivityKind] = useState<EstimateRequestActivityKind>('CONSULTATION');
  const [activityContent, setActivityContent] = useState('');
  const [decisionDraft, setDecisionDraft] = useState<CommercialDecisionInput>({
    decision: 'WON',
    reason: '',
    agreedAmount: '',
    agreedScope: '',
    agreedSchedule: '',
    startCondition: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { void sync(); }, [sync]);
  const eligibleOwners = users.filter((user) => {
    if (user.isActive === false || !['PM', 'DEPARTMENT_MANAGER'].includes(user.role)) return false;
    if (currentUser.role === 'PM') return user.id === currentUser.id;
    if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) return true;
    return user.departmentId === currentUser.departmentId;
  });
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
      const haystack = [request.requestNo, request.projectName, request.company, request.client, request.contact]
        .filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && (!normalized || haystack.includes(normalized));
    });
  }, [query, requests, statusFilter]);
  const selected = requests.find((request) => request.id === selectedId) || filtered[0] || null;

  const canManage = (request: EstimateRequest) => {
    if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) return true;
    if (currentUser.role === 'DEPARTMENT_MANAGER') return request.departmentId === currentUser.departmentId;
    return currentUser.role === 'PM' && request.ownerId === currentUser.id;
  };

  const run = async (operation: () => Promise<void>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await operation();
      setMessage(success);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : t('estimateRequest.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const created = await createRequest({
        ...draft,
        ownerId: draft.ownerId || null,
        departmentId: currentUser.departmentId,
        projectName: draft.projectName.trim(),
      }, currentUser.id);
      setSelectedId(created.id);
      setDraft(emptyDraft);
      setShowCreate(false);
    }, t('estimateRequest.created'));
  };

  const handleStatus = async (status: EstimateRequestStatus) => {
    if (!selected) return;
    await run(async () => {
      const updated = await changeStatus(selected.id, status, currentUser.id);
      setSelectedId(updated.id);
    }, t('estimateRequest.statusChanged'));
  };

  const handleDecision = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    await run(async () => {
      const result = await recordDecision(selected.id, decisionDraft, currentUser.id);
      setSelectedId(result.request.id);
      setDecisionDraft({ decision: 'WON', reason: '', agreedAmount: '', agreedScope: '', agreedSchedule: '', startCondition: '' });
    }, decisionDraft.decision === 'WON' ? t('estimateRequest.decisionWon') : t('estimateRequest.decisionSaved'));
  };

  const handleOwner = async (ownerId: string) => {
    if (!selected) return;
    await run(async () => { await updateRequest(selected.id, { ownerId: ownerId || null }, currentUser.id); }, t('estimateRequest.saved'));
  };

  const handleEdit = async (updates: Partial<EstimateRequest>) => {
    if (!selected) return;
    await run(async () => { await updateRequest(selected.id, updates, currentUser.id); }, t('estimateRequest.saved'));
  };

  const handleActivity = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !activityContent.trim()) return;
    await run(async () => {
      await addActivity(selected.id, activityKind, activityContent.trim(), currentUser.id);
      setActivityContent('');
    }, t('estimateRequest.activityAdded'));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!selected || !files?.length) return;
    await run(async () => { await addAttachments(selected.id, 'REFERENCE', Array.from(files), currentUser.id); }, t('estimateRequest.attachmentAdded'));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{t('estimateRequest.title')}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-sub)]">{t('estimateRequest.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${persistenceMode === 'SERVER' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {persistenceMode === 'SERVER' ? t('estimateRequest.serverMode') : t('estimateRequest.localMode')}
          </span>
          <button type="button" title={t('estimateRequest.refresh')} onClick={() => void sync()} disabled={loading}
            className="grid size-9 place-items-center rounded border bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/projects/intake/estimates" className="inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><FileCheck2 className="size-4" />{t('estimateSubmission.openManagement')}</Link>
          {['DEPARTMENT_MANAGER', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role) && <Link href="/projects/intake/database" className="inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><Database className="size-4" />{t('estimateDb.title')}</Link>}
          <button type="button" onClick={() => setShowCreate((value) => !value)}
            className="inline-flex items-center gap-2 rounded bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2">
            <Plus className="size-4" /> {t('estimateRequest.new')}
          </button>
        </div>
      </div>

      {(message || error) && <div role="status" className="border-l-4 border-[var(--color-primary)] bg-[var(--color-bg-sub)] px-4 py-3 text-sm">{message || error}</div>}

      {showCreate && (
        <form onSubmit={handleCreate} className="border-y bg-[var(--color-surface)] py-5">
          <div className="mb-4 flex items-center gap-2"><FileText className="size-5" /><h2 className="font-bold">{t('estimateRequest.createTitle')}</h2></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label={t('estimateRequest.projectName')} required value={draft.projectName} onChange={(value) => setDraft({ ...draft, projectName: value })} />
            <Field label={t('estimateRequest.company')} value={draft.company} onChange={(value) => setDraft({ ...draft, company: value })} />
            <Field label={t('estimateRequest.client')} value={draft.client} onChange={(value) => setDraft({ ...draft, client: value })} />
            <Field label={t('estimateRequest.contact')} value={draft.contact} onChange={(value) => setDraft({ ...draft, contact: value })} />
            <Field label={t('estimateRequest.contactDepartment')} value={draft.contactDepartment} onChange={(value) => setDraft({ ...draft, contactDepartment: value })} />
            <Field label={t('estimateRequest.phone')} value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} />
            <Field label={t('estimateRequest.email')} type="email" value={draft.email} onChange={(value) => setDraft({ ...draft, email: value })} />
            <Field label={t('estimateRequest.firstDelivery')} type="date" value={draft.firstDelivery} onChange={(value) => setDraft({ ...draft, firstDelivery: value })} />
            <Field label={t('estimateRequest.scope')} value={draft.scope} onChange={(value) => setDraft({ ...draft, scope: value })} />
            <Field label={t('estimateRequest.usage')} value={draft.usage} onChange={(value) => setDraft({ ...draft, usage: value })} />
            <Field label={t('estimateRequest.areaPy')} value={draft.areaPy} onChange={(value) => setDraft({ ...draft, areaPy: value })} />
            <Field label={t('estimateRequest.floors')} value={draft.floors} onChange={(value) => setDraft({ ...draft, floors: value })} />
            <label className="text-sm"><span className="mb-1 block font-medium">{t('estimateRequest.owner')}</span>
              <select value={draft.ownerId} onChange={(event) => setDraft({ ...draft, ownerId: event.target.value })} className="w-full rounded border bg-[var(--color-surface)] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                <option value="">{t('estimateRequest.unassigned')}</option>
                {eligibleOwners.map((user) => <option key={user.id} value={user.id}>{getUserDisplayName(user)}</option>)}
              </select>
            </label>
            <label className="text-sm md:col-span-2 xl:col-span-3"><span className="mb-1 block font-medium">{t('estimateRequest.memo')}</span>
              <textarea rows={2} value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} className="w-full rounded border bg-[var(--color-surface)] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{t('common.cancel')}</button>
            <button type="submit" disabled={busy || !draft.projectName.trim()} className="inline-flex items-center gap-2 rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50"><Save className="size-4" />{t('common.save')}</button>
          </div>
        </form>
      )}

      <div className="grid min-h-[560px] gap-5 xl:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
        <section aria-label={t('estimateRequest.listTitle')} className="min-w-0 border-r-0 xl:border-r xl:pr-5">
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_170px]">
            <label className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[var(--color-text-sub)]" />
              <input aria-label={t('estimateRequest.search')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('estimateRequest.search')} className="w-full rounded border bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" />
            </label>
            <select aria-label={t('estimateRequest.statusFilter')} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as EstimateRequestStatus | 'ALL')} className="rounded border bg-[var(--color-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
              <option value="ALL">{t('common.all')}</option>
              {STATUSES.map((status) => <option key={status} value={status}>{statusText(t, status)}</option>)}
            </select>
          </div>
          <div className="overflow-hidden border-y">
            {filtered.length === 0 ? <p className="p-8 text-center text-sm text-[var(--color-text-sub)]">{t('estimateRequest.empty')}</p> : filtered.map((request) => (
              <button key={request.id} type="button" onClick={() => setSelectedId(request.id)} className={`grid w-full grid-cols-[1fr_auto] gap-3 border-b p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] ${selected?.id === request.id ? 'bg-[var(--color-bg-sub)]' : 'bg-[var(--color-surface)] hover:bg-[var(--color-bg)]'}`}>
                <span className="min-w-0"><span className="block truncate font-semibold">{request.projectName}</span><span className="mt-1 block truncate text-xs text-[var(--color-text-sub)]">{request.requestNo} · {request.company || request.client || '-'}</span></span>
                <span className="self-center text-xs font-semibold text-[var(--color-primary)]">{statusText(t, request.status)}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label={t('estimateRequest.detailTitle')} className="min-w-0">
          {!selected ? <p className="p-8 text-center text-sm text-[var(--color-text-sub)]">{t('estimateRequest.selectPrompt')}</p> : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                <div><p className="text-xs font-semibold text-[var(--color-primary)]">{selected.requestNo}</p><h2 className="mt-1 text-xl font-bold">{selected.projectName}</h2><p className="mt-1 text-sm text-[var(--color-text-sub)]">{selected.company || selected.client || '-'}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/projects/intake/estimate?requestId=${encodeURIComponent(selected.id)}`} className="inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><FileSpreadsheet className="size-4" />{t('estimateSheet.open')}</Link>
                  {OPERATIONAL_STATUSES.includes(selected.status) ? (
                    <select aria-label={t('estimateRequest.changeStatus')} value={selected.status} disabled={!canManage(selected) || busy} onChange={(event) => void handleStatus(event.target.value as EstimateRequestStatus)} className="rounded border bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50">
                      {OPERATIONAL_STATUSES.map((status) => <option key={status} value={status}>{statusText(t, status)}</option>)}
                    </select>
                  ) : <span className="border px-3 py-2 text-sm font-semibold text-[var(--color-primary)]">{statusText(t, selected.status)}</span>}
                </div>
              </div>

              <div className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
                <Detail label={t('estimateRequest.contact')} value={[selected.contact, selected.contactDepartment].filter(Boolean).join(' / ')} />
                <Detail label={t('estimateRequest.contactInfo')} value={[selected.phone, selected.email].filter(Boolean).join(' / ')} />
                <Detail label={t('estimateRequest.scope')} value={selected.scope} />
                <Detail label={t('estimateRequest.firstDelivery')} value={selected.firstDelivery} />
                <Detail label={t('estimateRequest.memo')} value={selected.memo} wide />
              </div>

              <RequestEditForm key={selected.id} request={selected} disabled={!canManage(selected) || busy} t={t} onSave={handleEdit} />

              <label className="block text-sm"><span className="mb-1 flex items-center gap-2 font-medium"><UserRound className="size-4" />{t('estimateRequest.owner')}</span>
                <select value={selected.ownerId || ''} disabled={!canManage(selected) || busy} onChange={(event) => void handleOwner(event.target.value)} className="w-full rounded border bg-[var(--color-surface)] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50">
                  <option value="">{t('estimateRequest.unassigned')}</option>
                  {eligibleOwners.map((user) => <option key={user.id} value={user.id}>{getUserDisplayName(user)}</option>)}
                </select>
              </label>

              <section aria-labelledby="commercial-decision-title" className="border-y py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 id="commercial-decision-title" className="font-bold">{t('estimateRequest.decisionTitle')}</h3>
                    <p className="mt-1 text-xs text-[var(--color-text-sub)]">{t('estimateRequest.decisionDescription')}</p>
                  </div>
                  {selected.projectId && (
                    <Link href="/projects" className="inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                      <BadgeCheck className="size-4" />{t('estimateRequest.openProject')}
                    </Link>
                  )}
                </div>
                {(selected.projectId || ['WON', 'LOST', 'CANCELLED'].includes(selected.status)) ? (
                  <p className="mt-4 text-sm font-semibold text-[var(--color-primary)]">{t('estimateRequest.decisionLocked')}</p>
                ) : (
                  <form onSubmit={handleDecision} className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {DECISIONS.map(({ value, icon: Icon }) => (
                        <button key={value} type="button" onClick={() => setDecisionDraft({ ...decisionDraft, decision: value })} aria-pressed={decisionDraft.decision === value} className={`inline-flex min-h-10 items-center justify-center gap-2 border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${decisionDraft.decision === value ? 'border-[var(--color-primary)] bg-[var(--color-bg-sub)] text-[var(--color-primary)]' : ''}`}>
                          <Icon className="size-4" />{statusText(t, value)}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium">{t('estimateRequest.decisionReason')}</span><textarea required={['LOST', 'CANCELLED'].includes(decisionDraft.decision)} rows={2} value={decisionDraft.reason || ''} onChange={(event) => setDecisionDraft({ ...decisionDraft, reason: event.target.value })} className="w-full rounded border bg-[var(--color-surface)] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></label>
                      <Field label={t('estimateRequest.agreedAmount')} value={decisionDraft.agreedAmount || ''} onChange={(value) => setDecisionDraft({ ...decisionDraft, agreedAmount: value })} />
                      <Field label={t('estimateRequest.agreedSchedule')} value={decisionDraft.agreedSchedule || ''} onChange={(value) => setDecisionDraft({ ...decisionDraft, agreedSchedule: value })} />
                      <label className="text-sm"><span className="mb-1 block font-medium">{t('estimateRequest.agreedScope')}</span><textarea rows={2} value={decisionDraft.agreedScope || ''} onChange={(event) => setDecisionDraft({ ...decisionDraft, agreedScope: event.target.value })} className="w-full rounded border bg-[var(--color-surface)] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></label>
                      <label className="text-sm"><span className="mb-1 block font-medium">{t('estimateRequest.startCondition')}</span><textarea rows={2} value={decisionDraft.startCondition || ''} onChange={(event) => setDecisionDraft({ ...decisionDraft, startCondition: event.target.value })} className="w-full rounded border bg-[var(--color-surface)] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></label>
                    </div>
                    <div className="flex justify-end"><button type="submit" disabled={busy || !canManage(selected)} className="inline-flex items-center gap-2 rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50"><BadgeCheck className="size-4" />{t('estimateRequest.confirmDecision')}</button></div>
                  </form>
                )}
              </section>

              <div className="border-t pt-4">
                <h3 className="mb-3 flex items-center gap-2 font-bold"><MessageSquareText className="size-4" />{t('estimateRequest.activityTitle')}</h3>
                <form onSubmit={handleActivity} className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
                  <select value={activityKind} onChange={(event) => setActivityKind(event.target.value as EstimateRequestActivityKind)} disabled={!canManage(selected)} className="rounded border bg-[var(--color-surface)] px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                    {(Object.keys(ACTIVITY_ICONS) as EstimateRequestActivityKind[]).map((kind) => <option key={kind} value={kind}>{activityText(t, kind)}</option>)}
                  </select>
                  <input value={activityContent} onChange={(event) => setActivityContent(event.target.value)} disabled={!canManage(selected)} placeholder={t('estimateRequest.activityPlaceholder')} className="rounded border bg-[var(--color-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" />
                  <button type="submit" disabled={busy || !canManage(selected) || !activityContent.trim()} className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50">{t('common.add')}</button>
                </form>
                <div className="mt-3 space-y-2">{selected.activities.map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.kind];
                  return <div key={activity.id} className="flex gap-3 border-b py-2 text-sm"><Icon className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" /><div><strong>{activityText(t, activity.kind)}</strong><p className="mt-0.5 whitespace-pre-wrap text-[var(--color-text-sub)]">{activity.content}</p><time className="text-xs text-[var(--color-text-sub)]">{new Date(activity.occurredAt).toLocaleString()}</time></div></div>;
                })}</div>
              </div>

              <div className="border-t pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-bold"><Paperclip className="size-4" />{t('estimateRequest.attachmentTitle')}</h3>
                  <label className={`cursor-pointer rounded border px-3 py-2 text-sm font-semibold focus-within:ring-2 focus-within:ring-[var(--color-primary)] ${canManage(selected) ? '' : 'pointer-events-none opacity-50'}`}>{t('estimateRequest.addFiles')}<input type="file" multiple disabled={!canManage(selected) || busy} className="sr-only" onChange={(event) => { void handleFiles(event.target.files); event.target.value = ''; }} /></label>
                </div>
                <p className="mb-2 text-xs text-[var(--color-text-sub)]">{t('estimateRequest.metadataOnly')}</p>
                <div className="space-y-2">{selected.attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm"><span className="min-w-0"><strong className="block truncate">{attachment.originalName}</strong><span className="text-xs text-[var(--color-text-sub)]">{attachment.category} · {(attachment.size / 1024).toFixed(1)} KB</span></span><button type="button" title={t('common.delete')} disabled={!canManage(selected)} onClick={() => void run(() => removeAttachment(selected.id, attachment.id, currentUser.id), t('estimateRequest.attachmentRemoved'))} className="grid size-8 place-items-center text-[var(--color-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50"><Trash2 className="size-4" /></button></div>)}</div>
              </div>

              <details className="border-t pt-4"><summary className="flex cursor-pointer items-center gap-2 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><History className="size-4" />{t('estimateRequest.historyTitle')} ({selected.histories.length})</summary><div className="mt-3 space-y-2">{selected.histories.map((history) => <div key={history.id} className="border-l-2 pl-3 text-sm"><strong>{history.action}</strong><p className="text-xs text-[var(--color-text-sub)]">{[history.fromStatus, history.toStatus].filter(Boolean).join(' → ')}</p><time className="text-xs text-[var(--color-text-sub)]">{new Date(history.createdAt).toLocaleString()}</time></div>)}</div></details>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="text-sm"><span className="mb-1 block font-medium">{label}</span><input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border bg-[var(--color-surface)] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></label>;
}

function Detail({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><span className="block text-xs font-semibold text-[var(--color-text-sub)]">{label}</span><p className="mt-1 whitespace-pre-wrap">{value || '-'}</p></div>;
}

function RequestEditForm({ request, disabled, t, onSave }: { request: EstimateRequest; disabled: boolean; t: Translate; onSave: (updates: Partial<EstimateRequest>) => Promise<void> }) {
  const [values, setValues] = useState({
    projectName: request.projectName,
    company: request.company || '',
    client: request.client || '',
    contact: request.contact || '',
    contactDepartment: request.contactDepartment || '',
    phone: request.phone || '',
    email: request.email || '',
    scope: request.scope || '',
    memo: request.memo || '',
    firstDelivery: request.firstDelivery || '',
  });

  return (
    <details className="border-t pt-4">
      <summary className="cursor-pointer font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">{t('estimateRequest.editDetails')}</summary>
      <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void onSave(values); }}>
        <fieldset disabled={disabled} className="contents">
        <Field label={t('estimateRequest.projectName')} required value={values.projectName} onChange={(value) => setValues({ ...values, projectName: value })} />
        <Field label={t('estimateRequest.company')} value={values.company} onChange={(value) => setValues({ ...values, company: value })} />
        <Field label={t('estimateRequest.client')} value={values.client} onChange={(value) => setValues({ ...values, client: value })} />
        <Field label={t('estimateRequest.contact')} value={values.contact} onChange={(value) => setValues({ ...values, contact: value })} />
        <Field label={t('estimateRequest.contactDepartment')} value={values.contactDepartment} onChange={(value) => setValues({ ...values, contactDepartment: value })} />
        <Field label={t('estimateRequest.phone')} value={values.phone} onChange={(value) => setValues({ ...values, phone: value })} />
        <Field label={t('estimateRequest.email')} type="email" value={values.email} onChange={(value) => setValues({ ...values, email: value })} />
        <Field label={t('estimateRequest.firstDelivery')} type="date" value={values.firstDelivery} onChange={(value) => setValues({ ...values, firstDelivery: value })} />
        <Field label={t('estimateRequest.scope')} value={values.scope} onChange={(value) => setValues({ ...values, scope: value })} />
        <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium">{t('estimateRequest.memo')}</span><textarea rows={3} value={values.memo} onChange={(event) => setValues({ ...values, memo: event.target.value })} className="w-full rounded border bg-[var(--color-surface)] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></label>
        <div className="sm:col-span-2 flex justify-end"><button type="submit" disabled={disabled || !values.projectName.trim()} className="inline-flex items-center gap-2 rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50"><Save className="size-4" />{t('estimateRequest.saveDetails')}</button></div>
        </fieldset>
      </form>
    </details>
  );
}
