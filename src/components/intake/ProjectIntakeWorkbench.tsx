'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  History,
  KeyRound,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useTranslation } from '@/lib/localization';
import { buildProjectIntakeDraft, evaluateProjectIntakeCompleteness } from '@/lib/projectIntake';
import { useProjectIntakeStore } from '@/store/projectIntakeStore';
import {
  PersonnelCard,
  ProjectIntakeContact,
  ProjectIntakeDraft,
  ProjectIntakeMaterial,
  ProjectIntakeSecretReference,
  ProjectIntakeStatus,
} from '@/types/models';

type Translate = ReturnType<typeof useTranslation>;
type Props = { currentUser: PersonnelCard; t: Translate };

const STATUSES: ProjectIntakeStatus[] = ['DRAFT', 'REVIEWED', 'ACCEPTED'];
const MATERIAL_STATUSES: ProjectIntakeMaterial['status'][] = ['NOT_RECEIVED', 'PARTIAL', 'RECEIVED', 'CONFIRMED'];
const inputClass = 'w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60';
const iconButtonClass = 'inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-sub)] hover:bg-[var(--color-bg-sub)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';

const statusClass: Record<ProjectIntakeStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  REVIEWED: 'bg-blue-50 text-blue-700 border-blue-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const makeContact = (): ProjectIntakeContact => ({
  id: `contact-${crypto.randomUUID()}`,
  name: '',
  role: '',
  department: '',
  telephone: '',
  mobile: '',
  email: '',
});

const makeMaterial = (): ProjectIntakeMaterial => ({
  id: `material-${crypto.randomUUID()}`,
  category: 'other',
  label: '',
  memo: '',
  status: 'NOT_RECEIVED',
  comment: '',
  confirmedBy: '',
  originalName: '',
  size: null,
  mimeType: '',
  storageKey: '',
});

const makeSecretReference = (): ProjectIntakeSecretReference => ({
  id: `secret-reference-${crypto.randomUUID()}`,
  label: '',
  provider: '',
  reference: 'vault://',
  note: '',
});

export function ProjectIntakeWorkbench({ currentUser, t }: Props) {
  const {
    intakes,
    persistenceMode,
    loading,
    error: syncError,
    sync,
    saveDraft,
    review,
    accept,
  } = useProjectIntakeStore();
  const actor = useMemo(() => ({ id: currentUser.id, role: currentUser.role, departmentId: currentUser.departmentId }), [currentUser]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectIntakeStatus | 'ALL'>('ALL');
  const [draft, setDraft] = useState<ProjectIntakeDraft | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => { void sync(actor); }, [actor, sync]);

  const filtered = useMemo(() => intakes.filter((intake) => {
    if (statusFilter !== 'ALL' && intake.status !== statusFilter) return false;
    const search = query.trim().toLowerCase();
    if (!search) return true;
    const candidate = intake.draft || buildProjectIntakeDraft(intake);
    return [candidate.projectName, candidate.projectNo, candidate.company, candidate.client]
      .some((value) => value.toLowerCase().includes(search));
  }), [intakes, query, statusFilter]);

  const selected = intakes.find((item) => item.id === selectedId) || filtered[0] || null;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!selected) {
        setSelectedId('');
        setDraft(null);
        return;
      }
      if (selected.id !== selectedId) setSelectedId(selected.id);
      setDraft(buildProjectIntakeDraft(selected));
      setReviewNote(selected.reviewNote || '');
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [selected, selectedId]);

  const missing = draft ? evaluateProjectIntakeCompleteness(draft) : [];
  const readOnly = !selected?.permissions?.canEdit || selected.status === 'ACCEPTED';

  const updateDraft = <K extends keyof ProjectIntakeDraft>(key: K, value: ProjectIntakeDraft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const run = async (action: 'save' | 'review' | 'accept') => {
    if (!selected || !draft) return;
    setBusy(true);
    setMessage('');
    setActionError('');
    try {
      if (action === 'save') await saveDraft(selected.id, draft, actor);
      if (action === 'review') await review(selected.id, draft, reviewNote, actor);
      if (action === 'accept') await accept(selected.id, reviewNote, actor);
      setMessage(t(`projectIntake.message.${action}` as Parameters<Translate>[0]));
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('projectIntake.error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const updateContact = (index: number, patch: Partial<ProjectIntakeContact>) => {
    if (!draft) return;
    updateDraft('contacts', draft.contacts.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const updateMaterial = (index: number, patch: Partial<ProjectIntakeMaterial>) => {
    if (!draft) return;
    updateDraft('materials', draft.materials.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const updateSecret = (index: number, patch: Partial<ProjectIntakeSecretReference>) => {
    if (!draft) return;
    updateDraft('secretReferences', draft.secretReferences.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)]">{t('projectIntake.title')}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-sub)]">{t('projectIntake.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-sub)]">
          <span className="border border-[var(--color-border)] bg-[var(--color-bg-sub)] px-2 py-1">
            {persistenceMode === 'SERVER' ? t('projectIntake.persistence.server') : t('projectIntake.persistence.local')}
          </span>
          <button type="button" title={t('common.refresh')} className={iconButtonClass} onClick={() => void sync(actor)} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-[var(--color-border)] pb-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="relative block">
          <span className="sr-only">{t('projectIntake.search')}</span>
          <Search size={16} className="absolute left-3 top-2.5 text-[var(--color-text-sub)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-9`} placeholder={t('projectIntake.search')} />
        </label>
        <select aria-label={t('projectIntake.statusFilter')} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ProjectIntakeStatus | 'ALL')} className={inputClass}>
          <option value="ALL">{t('projectIntake.status.ALL')}</option>
          {STATUSES.map((status) => <option key={status} value={status}>{t(`projectIntake.status.${status}` as Parameters<Translate>[0])}</option>)}
        </select>
      </div>

      {(syncError || actionError || message) && (
        <div role="status" className={`border px-3 py-2 text-sm ${actionError || syncError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {actionError || syncError || message}
        </div>
      )}

      <div className="grid min-w-0 min-h-[640px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--color-border)] bg-[var(--color-bg)] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-text-main)]">{t('projectIntake.list')}</span>
            <span className="text-xs text-[var(--color-text-sub)]">{filtered.length}</span>
          </div>
          <div className="max-h-72 overflow-y-auto lg:max-h-[690px]">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--color-text-sub)]">{t('projectIntake.empty')}</p>
            ) : filtered.map((intake) => {
              const itemDraft = intake.draft || buildProjectIntakeDraft(intake);
              return (
                <button
                  key={intake.id}
                  type="button"
                  onClick={() => { setSelectedId(intake.id); setMessage(''); setActionError(''); }}
                  className={`w-full border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] ${selected?.id === intake.id ? 'bg-[var(--color-surface)]' : 'hover:bg-[var(--color-bg-sub)]'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text-main)]">{itemDraft.projectName || t('projectIntake.untitled')}</span>
                    <span className={`shrink-0 border px-2 py-0.5 text-[11px] font-semibold ${statusClass[intake.status]}`}>
                      {t(`projectIntake.status.${intake.status}` as Parameters<Translate>[0])}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--color-text-sub)]">{itemDraft.projectNo} · {itemDraft.client || itemDraft.company || '-'}</p>
                  <p className="mt-2 text-[11px] text-[var(--color-text-sub)]">{t('projectIntake.version', { version: String(intake.version) })}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0">
          {!selected || !draft ? (
            <div className="flex min-h-[420px] items-center justify-center p-8 text-center text-sm text-[var(--color-text-sub)]">{t('projectIntake.selectPrompt')}</div>
          ) : (
            <div>
              <header className="border-b border-[var(--color-border)] px-4 py-4 md:px-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileCheck2 size={18} className="text-[var(--color-primary)]" />
                      <h2 className="truncate text-lg font-bold text-[var(--color-text-main)]">{draft.projectName || t('projectIntake.untitled')}</h2>
                      <span className={`border px-2 py-0.5 text-xs font-semibold ${statusClass[selected.status]}`}>{t(`projectIntake.status.${selected.status}` as Parameters<Translate>[0])}</span>
                    </div>
                    <p className="mt-2 break-all text-xs text-[var(--color-text-sub)]">
                      {t('projectIntake.sourceTrace')}: {draft.source.estimateRequestId} → {draft.source.commercialDecisionId} → {draft.source.projectId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.permissions?.canEdit && selected.status !== 'ACCEPTED' && (
                      <button type="button" onClick={() => void run('save')} disabled={busy} className="inline-flex items-center gap-2 bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-60">
                        <Save size={16} />{t('projectIntake.action.save')}
                      </button>
                    )}
                    {selected.permissions?.canReview && selected.status !== 'ACCEPTED' && (
                      <button type="button" onClick={() => void run('review')} disabled={busy || missing.length > 0} className="inline-flex items-center gap-2 border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
                        <ClipboardCheck size={16} />{t('projectIntake.action.review')}
                      </button>
                    )}
                    {selected.permissions?.canReview && selected.status === 'REVIEWED' && (
                      <button type="button" onClick={() => void run('accept')} disabled={busy || missing.length > 0} className="inline-flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50">
                        <CheckCircle2 size={16} />{t('projectIntake.action.accept')}
                      </button>
                    )}
                  </div>
                </div>
                <div className={`mt-4 border px-3 py-2 text-xs ${missing.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  {missing.length ? `${t('projectIntake.completeness.missing')}: ${missing.map((key) => t(`projectIntake.missing.${key}` as Parameters<Translate>[0])).join(', ')}` : t('projectIntake.completeness.complete')}
                </div>
              </header>

              <div className="divide-y divide-[var(--color-border)]">
                <section className="p-4 md:p-6">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-text-main)]"><FileText size={16} />{t('projectIntake.section.basic')}</h3>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {([
                      ['projectName', 'projectIntake.field.projectName'], ['projectNo', 'projectIntake.field.projectNo'],
                      ['company', 'projectIntake.field.company'], ['client', 'projectIntake.field.client'],
                      ['usage', 'projectIntake.field.usage'], ['area', 'projectIntake.field.area'],
                      ['buildings', 'projectIntake.field.buildings'], ['floors', 'projectIntake.field.floors'],
                      ['bidDate', 'projectIntake.field.bidDate'], ['unitPrice', 'projectIntake.field.unitPrice'],
                      ['expectedStartDate', 'projectIntake.field.expectedStartDate'], ['firstDelivery', 'projectIntake.field.firstDelivery'],
                      ['secondDelivery', 'projectIntake.field.secondDelivery'], ['thirdDelivery', 'projectIntake.field.thirdDelivery'],
                      ['finalDelivery', 'projectIntake.field.finalDelivery'],
                    ] as Array<[keyof ProjectIntakeDraft, string]>).map(([key, label]) => (
                      <label key={key} className="block text-xs font-medium text-[var(--color-text-sub)]">
                        <span className="mb-1 block">{t(label as Parameters<Translate>[0])}</span>
                        <input disabled={readOnly} value={String(draft[key] ?? '')} onChange={(event) => updateDraft(key, event.target.value as never)} className={inputClass} />
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block text-xs font-medium text-[var(--color-text-sub)]">
                      <span className="mb-1 block">{t('projectIntake.field.businessTypes')}</span>
                      <input disabled={readOnly} value={draft.businessTypes.join(', ')} onChange={(event) => updateDraft('businessTypes', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} className={inputClass} />
                    </label>
                    <label className="block text-xs font-medium text-[var(--color-text-sub)]">
                      <span className="mb-1 block">{t('projectIntake.field.scopes')}</span>
                      <input disabled={readOnly} value={draft.scopes.join(', ')} onChange={(event) => updateDraft('scopes', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} className={inputClass} />
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {(['workContent', 'notes', 'request'] as const).map((key) => (
                      <label key={key} className="block text-xs font-medium text-[var(--color-text-sub)]">
                        <span className="mb-1 block">{t(`projectIntake.field.${key}` as Parameters<Translate>[0])}</span>
                        <textarea disabled={readOnly} value={draft[key]} onChange={(event) => updateDraft(key, event.target.value)} rows={4} className={inputClass} />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="p-4 md:p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-main)]"><UserRound size={16} />{t('projectIntake.section.contacts')}</h3>
                    {!readOnly && <button type="button" title={t('projectIntake.action.addContact')} className={iconButtonClass} onClick={() => updateDraft('contacts', [...draft.contacts, makeContact()])}><Plus size={16} /></button>}
                  </div>
                  <div className="space-y-3">
                    {draft.contacts.map((contact, index) => (
                      <div key={contact.id} className="grid gap-2 border border-[var(--color-border)] bg-[var(--color-bg)] p-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]">
                        {(['name', 'role', 'department', 'telephone', 'mobile', 'email'] as const).map((key) => (
                          <label key={key} className="text-[11px] text-[var(--color-text-sub)]">
                            <span className="mb-1 block">{t(`projectIntake.contact.${key}` as Parameters<Translate>[0])}</span>
                            <input type={key === 'email' ? 'email' : 'text'} disabled={readOnly} value={contact[key]} onChange={(event) => updateContact(index, { [key]: event.target.value })} className={inputClass} />
                          </label>
                        ))}
                        {!readOnly && <button type="button" title={t('common.delete')} className={`${iconButtonClass} self-end text-red-600`} onClick={() => updateDraft('contacts', draft.contacts.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="p-4 md:p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-main)]"><FileCheck2 size={16} />{t('projectIntake.section.materials')}</h3>
                    {!readOnly && <button type="button" title={t('projectIntake.action.addMaterial')} className={iconButtonClass} onClick={() => updateDraft('materials', [...draft.materials, makeMaterial()])}><Plus size={16} /></button>}
                  </div>
                  <div className="max-w-full overflow-x-auto border border-[var(--color-border)] overscroll-x-contain">
                    <table className="w-full min-w-[850px] text-left text-xs">
                      <thead className="bg-[var(--color-bg)] text-[var(--color-text-sub)]"><tr><th className="p-2">{t('projectIntake.material.label')}</th><th className="p-2">{t('projectIntake.material.status')}</th><th className="p-2">{t('projectIntake.material.file')}</th><th className="p-2">{t('projectIntake.material.memo')}</th><th className="p-2">{t('projectIntake.material.comment')}</th><th className="w-12 p-2"></th></tr></thead>
                      <tbody>
                        {draft.materials.map((material, index) => (
                          <tr key={material.id} className="border-t border-[var(--color-border)] align-top">
                            <td className="p-2"><input disabled={readOnly} value={material.label} onChange={(event) => updateMaterial(index, { label: event.target.value })} className={inputClass} /></td>
                            <td className="p-2"><select disabled={readOnly} value={material.status} onChange={(event) => updateMaterial(index, { status: event.target.value as ProjectIntakeMaterial['status'] })} className={inputClass}>{MATERIAL_STATUSES.map((status) => <option key={status} value={status}>{t(`projectIntake.materialStatus.${status}` as Parameters<Translate>[0])}</option>)}</select></td>
                            <td className="max-w-44 break-all p-2 text-[var(--color-text-sub)]">{material.originalName || '-'}</td>
                            <td className="p-2"><input disabled={readOnly} value={material.memo} onChange={(event) => updateMaterial(index, { memo: event.target.value })} className={inputClass} /></td>
                            <td className="p-2"><input disabled={readOnly} value={material.comment} onChange={(event) => updateMaterial(index, { comment: event.target.value })} className={inputClass} /></td>
                            <td className="p-2">{!readOnly && <button type="button" title={t('common.delete')} className={`${iconButtonClass} text-red-600`} onClick={() => updateDraft('materials', draft.materials.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="p-4 md:p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-main)]"><KeyRound size={16} />{t('projectIntake.section.secrets')}</h3>
                      <p className="mt-1 text-xs text-[var(--color-text-sub)]">{t('projectIntake.secrets.notice')}</p>
                    </div>
                    {!readOnly && <button type="button" title={t('projectIntake.action.addSecret')} className={iconButtonClass} onClick={() => updateDraft('secretReferences', [...draft.secretReferences, makeSecretReference()])}><Plus size={16} /></button>}
                  </div>
                  <div className="space-y-2">
                    {draft.secretReferences.length === 0 && <p className="border border-dashed border-[var(--color-border)] px-3 py-5 text-center text-xs text-[var(--color-text-sub)]">{t('projectIntake.secrets.empty')}</p>}
                    {draft.secretReferences.map((secret, index) => (
                      <div key={secret.id} className="grid gap-2 border border-[var(--color-border)] bg-[var(--color-bg)] p-3 md:grid-cols-[1fr_1fr_2fr_2fr_auto]">
                        {(['label', 'provider', 'reference', 'note'] as const).map((key) => (
                          <label key={key} className="text-[11px] text-[var(--color-text-sub)]"><span className="mb-1 block">{t(`projectIntake.secret.${key}` as Parameters<Translate>[0])}</span><input disabled={readOnly} value={secret[key]} onChange={(event) => updateSecret(index, { [key]: event.target.value })} className={inputClass} placeholder={key === 'reference' ? 'vault://workspace/project' : ''} /></label>
                        ))}
                        {!readOnly && <button type="button" title={t('common.delete')} className={`${iconButtonClass} self-end text-red-600`} onClick={() => updateDraft('secretReferences', draft.secretReferences.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-text-main)]"><ClipboardCheck size={16} />{t('projectIntake.section.review')}</h3>
                    <textarea disabled={!selected.permissions?.canReview || selected.status === 'ACCEPTED'} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={5} className={inputClass} placeholder={t('projectIntake.review.placeholder')} />
                  </div>
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-text-main)]"><History size={16} />{t('projectIntake.section.history')}</h3>
                    <div className="max-h-40 overflow-y-auto border border-[var(--color-border)]">
                      {(selected.histories || []).length === 0 ? <p className="p-3 text-xs text-[var(--color-text-sub)]">{t('projectIntake.history.empty')}</p> : (selected.histories || []).map((history) => (
                        <div key={history.id} className="border-b border-[var(--color-border)] px-3 py-2 text-xs last:border-b-0">
                          <div className="flex items-center justify-between gap-2"><strong className="text-[var(--color-text-main)]">{history.action}</strong><span className="text-[var(--color-text-sub)]">{new Date(history.createdAt).toLocaleString()}</span></div>
                          <p className="mt-1 text-[var(--color-text-sub)]">{history.actorId}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
