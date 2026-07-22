'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { BookOpen, Copy, Download, History, Paperclip, Plus, Search, Send, Trash2, X } from 'lucide-react';
import { projectQcCsv } from '@/lib/projectQc';
import { ProjectQcAttachmentInput } from '@/lib/projectQcApi';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { useAuthStore } from '@/store/authStore';
import { useProjectQcStore } from '@/store/projectQcStore';
import { useTranslationStore } from '@/store/translationStore';
import { ProjectQcCheck, ProjectQcItem } from '@/types/models';

type Props = { projectId: string };
type Draft = {
  group: string;
  middleCategory: string;
  subCategory: string;
  trade: string;
  serialNo: string;
  item: string;
  method: string;
  targets: string;
  comment: string;
  attachments: ProjectQcAttachmentInput[];
};

const groups = [
  'PROJECT_INITIAL',
  'QC_TEAM_NOTES',
  'PM_NOTES',
  'SUBMISSION_REVIEW',
  'FINAL_REVIEW',
  'QUESTION_1',
  'QUESTION_2',
  'QUESTION_3',
  'QUESTION_4',
  'QUESTION_5',
  'QUESTION_6',
  'ESTIMATE_CONDITIONS',
] as const;
type QcGroup = typeof groups[number];
const inputClass = 'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';
const iconButton = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40';
const actionButton = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40';
const blankDraft = (): Draft => ({ group: groups[0], middleCategory: '', subCategory: '', trade: '', serialNo: '', item: '', method: '', targets: 'PM', comment: '', attachments: [] });

const fileMetadata = (file: File): ProjectQcAttachmentInput => ({ originalName: file.name, mimeType: file.type || 'application/octet-stream', size: file.size });
const safeFileName = (value: string) => value.replace(/[\\/:*?"<>|]+/g, '-');
const download = (name: string, body: string, type: string) => {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function ProjectQcPanel({ projectId }: Props) {
  const { currentUser, users } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { checklists, terms, loading, error, sync, createItem, updateItem, duplicateItem, deleteItem, addAttachment, removeAttachment, sendCategory, upsertTerm } = useProjectQcStore();
  const checklist = checklists.find((entry) => entry.projectId === projectId);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [targetFilter, setTargetFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');

  const actor = currentUser ? { id: currentUser.id, role: currentUser.role, departmentId: currentUser.departmentId } : null;
  useEffect(() => { if (actor) void sync(projectId, actor); }, [projectId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const targets = useMemo(() => [...new Set(checklist?.items.flatMap((item) => item.targets) || [])], [checklist?.items]);
  const filteredItems = useMemo(() => (checklist?.items || []).filter((item) => {
    const query = search.trim().toLowerCase();
    return (groupFilter === 'ALL' || item.group === groupFilter)
      && (targetFilter === 'ALL' || item.targets.includes(targetFilter))
      && (statusFilter === 'ALL' || item.status === statusFilter)
      && (!query || [item.serialNo, item.item, item.method, item.trade, item.comment, item.middleCategory, item.subCategory].some((value) => String(value || '').toLowerCase().includes(query)));
  }), [checklist?.items, groupFilter, search, statusFilter, targetFilter]);
  const userName = (id: string) => {
    const user = users.find((entry) => entry.id === id);
    return user ? getUserDisplayName(user) : id;
  };
  const groupLabel = (group: string) => groups.includes(group as QcGroup) ? t(`projectQc.group.${group as QcGroup}`) : group;
  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage('');
    try { await work(); setMessage(success); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : t('projectQc.error.generic')); }
    finally { setBusy(false); }
  };

  const submit = () => {
    if (!actor || !draft.item.trim() || !draft.method.trim()) return;
    const serialNo = draft.serialNo.trim() || `QC-${String((checklist?.items.length || 0) + 1).padStart(3, '0')}`;
    void run(async () => {
      await createItem(projectId, {
        ...draft,
        serialNo,
        targets: draft.targets.split(',').map((value) => value.trim()).filter(Boolean),
      }, actor);
      setDraft(blankDraft());
      setShowForm(false);
    }, t('projectQc.message.created'));
  };

  const updateCheck = (item: ProjectQcItem, target: string, key: 'done' | 'na', checked: boolean) => {
    if (!actor) return;
    const checks: ProjectQcCheck[] = item.checks.map((entry) => entry.target === target ? {
      ...entry,
      [key]: checked,
      ...(checked ? { [key === 'done' ? 'na' : 'done']: false, checkedBy: actor.id, checkedAt: new Date().toISOString() } : {}),
    } : entry);
    void run(() => updateItem(projectId, item.id, { checks }, actor), t('projectQc.message.updated'));
  };

  const onDraftFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).map(fileMetadata);
    setDraft((current) => ({ ...current, attachments: [...current.attachments, ...files] }));
    event.target.value = '';
  };
  const onItemFile = (itemId: string, event: ChangeEvent<HTMLInputElement>) => {
    if (!actor) return;
    const file = event.target.files?.[0];
    if (file) void run(() => addAttachment(projectId, itemId, fileMetadata(file), actor), t('projectQc.message.attachmentAdded'));
    event.target.value = '';
  };

  if (!currentUser) return null;
  if (loading && !checklist) return <p className="py-12 text-center text-sm text-[var(--color-text-sub)]">{t('projectQc.loading')}</p>;
  if (!checklist) return <p className="py-12 text-center text-sm text-red-600">{error || t('projectQc.empty')}</p>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-[var(--color-text-main)]">{t('projectQc.title')}</h3>
          <span className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-sub)]">{t(`projectQc.checklist.${checklist.status}`)}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-sub)]">{t('projectQc.projectLink', { id: checklist.projectId })}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${actionButton} border border-[var(--color-border)]`} onClick={() => download(`${safeFileName(checklist.project.name)}-QC.json`, JSON.stringify(checklist, null, 2), 'application/json')}><Download className="h-4 w-4" />{t('projectQc.action.exportAll')}</button>
        <button type="button" className={`${actionButton} border border-[var(--color-border)]`} onClick={() => download(`${safeFileName(checklist.project.name)}-QC.csv`, projectQcCsv(filteredItems), 'text/csv;charset=utf-8')}><Download className="h-4 w-4" />{t('projectQc.action.exportClient')}</button>
        {checklist.permissions.canEdit && <button type="button" className={`${actionButton} bg-[var(--color-primary)] text-white`} onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" />{t('projectQc.action.add')}</button>}
      </div>
    </div>

    {message && <div role="status" className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</div>}

    {showForm && <section className="border-b border-[var(--color-border)] pb-5" aria-label={t('projectQc.form.title')}>
      <div className="mb-3 flex items-center justify-between"><h4 className="font-bold text-[var(--color-text-main)]">{t('projectQc.form.title')}</h4><button type="button" className={iconButton} aria-label={t('common.close')} onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button></div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Field label={t('projectQc.field.group')}><select className={inputClass} value={draft.group} onChange={(event) => setDraft({ ...draft, group: event.target.value })}>{groups.map((group) => <option key={group} value={group}>{groupLabel(group)}</option>)}</select></Field>
        <Field label={t('projectQc.field.middle')}><input className={inputClass} value={draft.middleCategory} onChange={(event) => setDraft({ ...draft, middleCategory: event.target.value })} /></Field>
        <Field label={t('projectQc.field.sub')}><input className={inputClass} value={draft.subCategory} onChange={(event) => setDraft({ ...draft, subCategory: event.target.value })} /></Field>
        <Field label={t('projectQc.field.trade')}><input className={inputClass} value={draft.trade} onChange={(event) => setDraft({ ...draft, trade: event.target.value })} /></Field>
        <Field label={t('projectQc.field.serial')}><input className={inputClass} value={draft.serialNo} onChange={(event) => setDraft({ ...draft, serialNo: event.target.value })} placeholder="QC-001" /></Field>
        <Field label={t('projectQc.field.targets')}><input className={inputClass} value={draft.targets} onChange={(event) => setDraft({ ...draft, targets: event.target.value })} placeholder="PM, QC" /></Field>
        <Field label={t('projectQc.field.item')} wide><textarea className={`${inputClass} min-h-20 resize-y`} value={draft.item} onChange={(event) => setDraft({ ...draft, item: event.target.value })} /></Field>
        <Field label={t('projectQc.field.method')} wide><textarea className={`${inputClass} min-h-20 resize-y`} value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value })} /></Field>
        <Field label={t('projectQc.field.comment')} wide><textarea className={`${inputClass} min-h-20 resize-y`} value={draft.comment} onChange={(event) => setDraft({ ...draft, comment: event.target.value })} /></Field>
        <Field label={t('projectQc.field.attachments')} wide><input className={inputClass} type="file" multiple onChange={onDraftFiles} />{draft.attachments.length > 0 && <p className="mt-1 text-xs text-[var(--color-text-sub)]">{draft.attachments.map((file) => file.originalName).join(', ')}</p>}</Field>
      </div>
      <div className="mt-3 flex justify-end"><button type="button" disabled={busy || !draft.item.trim() || !draft.method.trim()} className={`${actionButton} bg-[var(--color-primary)] text-white`} onClick={submit}>{t('projectQc.action.save')}</button></div>
    </section>}

    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label className="relative"><span className="sr-only">{t('projectQc.filter.search')}</span><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-sub)]" /><input className={`${inputClass} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('projectQc.filter.search')} /></label>
      <select aria-label={t('projectQc.filter.group')} className={inputClass} value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="ALL">{t('projectQc.filter.allGroups')}</option>{groups.map((group) => <option key={group} value={group}>{groupLabel(group)}</option>)}</select>
      <select aria-label={t('projectQc.filter.target')} className={inputClass} value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}><option value="ALL">{t('projectQc.filter.allTargets')}</option>{targets.map((target) => <option key={target} value={target}>{userName(target)}</option>)}</select>
      <select aria-label={t('projectQc.filter.status')} className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">{t('projectQc.filter.allStatuses')}</option>{(['PENDING', 'PARTIAL', 'CONFIRMED', 'SENT'] as const).map((status) => <option key={status} value={status}>{t(`projectQc.status.${status}`)}</option>)}</select>
    </div>

    <div className="space-y-5">
      {filteredItems.map((item) => <QcRow key={`${item.id}-${item.updatedAt}`} item={item} canEdit={checklist.permissions.canEdit} busy={busy} t={t} groupLabel={groupLabel} userName={userName} onCheck={updateCheck} onComment={(comment) => actor && void run(() => updateItem(projectId, item.id, { comment }, actor), t('projectQc.message.updated'))} onDuplicate={() => actor && void run(() => duplicateItem(projectId, item.id, actor), t('projectQc.message.duplicated'))} onDelete={() => actor && void run(() => deleteItem(projectId, item.id, actor), t('projectQc.message.deleted'))} onFile={(event) => onItemFile(item.id, event)} onRemoveFile={(attachmentId) => actor && void run(() => removeAttachment(projectId, item.id, attachmentId, actor), t('projectQc.message.attachmentRemoved'))} />)}
      {!filteredItems.length && <p className="border-y border-dashed border-[var(--color-border)] py-10 text-center text-sm text-[var(--color-text-sub)]">{t('projectQc.items.empty')}</p>}
    </div>

    {checklist.permissions.canSend && checklist.items.length > 0 && <section className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4"><p className="text-sm text-[var(--color-text-sub)]">{t('projectQc.send.hint')}</p><select aria-label={t('projectQc.field.group')} className={`${inputClass} max-w-xs`} value={groupFilter === 'ALL' ? checklist.items[0].group : groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>{[...new Set(checklist.items.map((item) => item.group))].map((group) => <option key={group} value={group}>{groupLabel(group)}</option>)}</select><button type="button" disabled={busy} className={`${actionButton} bg-green-600 text-white hover:bg-green-700`} onClick={() => actor && void run(() => sendCategory(projectId, groupFilter === 'ALL' ? checklist.items[0].group : groupFilter, actor), t('projectQc.message.sent'))}><Send className="h-4 w-4" />{t('projectQc.action.send')}</button></section>}

    <details className="border-t border-[var(--color-border)] pt-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><BookOpen className="h-4 w-4" />{t('projectQc.terms.title')} <span className="text-xs text-[var(--color-text-sub)]">{terms.length}</span></summary><div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]"><ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">{terms.map((entry) => <li key={entry.id} className="py-2 text-sm"><strong className="text-[var(--color-text-main)]">{entry.term}</strong><span className="ml-2 text-[var(--color-text-sub)]">{entry.definition}</span></li>)}</ul>{['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'].includes(currentUser.role) && <div className="space-y-2"><input className={inputClass} value={term} onChange={(event) => setTerm(event.target.value)} placeholder={t('projectQc.terms.term')} /><textarea className={`${inputClass} min-h-20`} value={definition} onChange={(event) => setDefinition(event.target.value)} placeholder={t('projectQc.terms.definition')} /><button type="button" disabled={busy || !term.trim() || !definition.trim()} className={`${actionButton} w-full bg-[var(--color-primary)] text-white`} onClick={() => actor && void run(async () => { await upsertTerm(term.trim(), definition.trim(), actor); setTerm(''); setDefinition(''); }, t('projectQc.message.termSaved'))}>{t('projectQc.terms.save')}</button></div>}</div></details>
  </div>;
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`block text-xs font-semibold text-[var(--color-text-sub)] ${wide ? 'md:col-span-2' : ''}`}>{label}<div className="mt-1">{children}</div></label>;
}

function QcRow({ item, canEdit, busy, t, groupLabel, userName, onCheck, onComment, onDuplicate, onDelete, onFile, onRemoveFile }: {
  item: ProjectQcItem;
  canEdit: boolean;
  busy: boolean;
  t: ReturnType<typeof useTranslation>;
  groupLabel: (value: string) => string;
  userName: (id: string) => string;
  onCheck: (item: ProjectQcItem, target: string, key: 'done' | 'na', checked: boolean) => void;
  onComment: (comment: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (attachmentId: string) => void;
}) {
  const locked = Boolean(item.sentAt);
  return <article className="border-y border-[var(--color-border)] py-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[var(--color-primary)]">{groupLabel(item.group)}</span><span className="text-xs text-[var(--color-text-sub)]">{item.serialNo}</span><span className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs font-semibold">{t(`projectQc.status.${item.status}`)}</span></div><h4 className="mt-2 font-bold text-[var(--color-text-main)]">{item.item}</h4><p className="mt-1 text-sm text-[var(--color-text-sub)]">{item.method}</p>{item.trade && <p className="mt-1 text-xs text-[var(--color-text-sub)]">{t('projectQc.field.trade')}: {item.trade}</p>}</div>
      <div className="flex gap-1"><button type="button" className={iconButton} aria-label={t('projectQc.action.duplicate')} disabled={busy || !canEdit} onClick={onDuplicate}><Copy className="h-4 w-4" /></button><button type="button" className={`${iconButton} text-red-600`} aria-label={t('projectQc.action.delete')} disabled={busy || !canEdit || locked} onClick={onDelete}><Trash2 className="h-4 w-4" /></button></div>
    </div>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-y border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text-sub)]"><tr><th className="p-2">{t('projectQc.field.target')}</th><th className="p-2">{t('projectQc.check.done')}</th><th className="p-2">N/A</th><th className="p-2">{t('projectQc.check.by')}</th></tr></thead><tbody>{item.checks.map((check) => <tr key={check.target} className="border-b border-[var(--color-border)]"><td className="p-2 font-semibold">{userName(check.target)}</td><td className="p-2"><input type="checkbox" aria-label={`${userName(check.target)} ${t('projectQc.check.done')}`} checked={check.done} disabled={busy || !canEdit || locked} onChange={(event) => onCheck(item, check.target, 'done', event.target.checked)} className="h-4 w-4 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></td><td className="p-2"><input type="checkbox" aria-label={`${userName(check.target)} N/A`} checked={check.na} disabled={busy || !canEdit || locked} onChange={(event) => onCheck(item, check.target, 'na', event.target.checked)} className="h-4 w-4 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></td><td className="p-2 text-xs text-[var(--color-text-sub)]">{check.checkedBy ? userName(check.checkedBy) : '-'}</td></tr>)}</tbody></table></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_320px]"><div><label className="text-xs font-semibold text-[var(--color-text-sub)]">{t('projectQc.field.comment')}<textarea className={`${inputClass} mt-1 min-h-20 resize-y`} defaultValue={item.comment} disabled={!canEdit || locked} onBlur={(event) => { if (event.currentTarget.value !== item.comment) onComment(event.currentTarget.value); }} /></label></div><div><p className="mb-1 text-xs font-semibold text-[var(--color-text-sub)]">{t('projectQc.field.attachments')}</p><ul className="space-y-1">{item.attachments.map((file) => <li key={file.id} className="flex items-center gap-2 text-xs"><Paperclip className="h-3.5 w-3.5" /><span className="min-w-0 flex-1 truncate">{file.originalName}</span><span className="text-[var(--color-text-sub)]">{Math.ceil(file.size / 1024)} KB</span>{canEdit && !locked && <button type="button" className="rounded p-1 text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" aria-label={t('projectQc.action.removeAttachment')} onClick={() => onRemoveFile(file.id)}><X className="h-3.5 w-3.5" /></button>}</li>)}</ul>{canEdit && !locked && <label className={`${actionButton} mt-2 cursor-pointer border border-[var(--color-border)]`}><Paperclip className="h-4 w-4" />{t('projectQc.action.attach')}<input type="file" className="sr-only" onChange={onFile} /></label>}</div></div>
    <details className="mt-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-[var(--color-text-sub)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><History className="h-3.5 w-3.5" />{t('projectQc.history.title')} ({item.histories.length})</summary><ul className="mt-2 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">{item.histories.map((history) => <li key={history.id} className="flex flex-wrap justify-between gap-2 py-2 text-xs"><span className="font-semibold text-[var(--color-text-main)]">{history.action}</span><span className="text-[var(--color-text-sub)]">{userName(history.actorId)} · {new Date(history.createdAt).toLocaleString()}</span></li>)}</ul></details>
  </article>;
}
