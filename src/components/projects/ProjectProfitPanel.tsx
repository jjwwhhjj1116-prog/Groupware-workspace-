'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, CalendarDays, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import { getUserDisplayName, useTranslation } from '@/lib/localization';
import { PROFIT_CATEGORIES, PROFIT_GRADES, PROFIT_LABOR_CATEGORIES, PROFIT_OTHER_CATEGORIES, calculateLocalProjectProfit } from '@/lib/projectProfit';
import { ProjectProfitUpdateInput } from '@/lib/projectProfitApi';
import { useAuthStore } from '@/store/authStore';
import { useProjectProfitStore } from '@/store/projectProfitStore';
import { useTranslationStore } from '@/store/translationStore';
import { ProfitGrade, ProfitLaborCategory, ProjectProfitAnalysis, ProjectProfitRound, UnitPriceEntry } from '@/types/models';

type Props = { projectId: string };
const inputClass = 'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60';
const buttonClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const dateOnly = (value?: string | null) => value ? value.slice(0, 10) : '';
const dateRange = (start?: string | null, end?: string | null) => {
  if (!start || !end || start > end) return [];
  const result: string[] = []; const cursor = new Date(`${start.slice(0, 10)}T00:00:00.000Z`); const limit = new Date(`${end.slice(0, 10)}T00:00:00.000Z`);
  while (cursor <= limit && result.length < 62) { result.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); }
  return result;
};
const normalizeDraft = (analysis: ProjectProfitAnalysis): ProjectProfitAnalysis => clone(analysis);

export function ProjectProfitPanel({ projectId }: Props) {
  const { currentUser } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { analyses, loading, error, sync } = useProjectProfitStore();
  const analysis = analyses.find((item) => item.projectId === projectId);
  useEffect(() => {
    if (!currentUser) return;
    void sync(projectId, { id: currentUser.id, role: currentUser.role, departmentId: currentUser.departmentId });
  }, [currentUser, projectId, sync]);

  if (!currentUser) return null;
  if (loading && !analysis) return <p className="py-12 text-center text-sm text-[var(--color-text-sub)]">{t('projectProfit.loading')}</p>;
  if (!analysis) return <p className="py-12 text-center text-sm text-red-600">{error || t('projectProfit.empty')}</p>;

  return <ProjectProfitEditor key={`${analysis.id}:${analysis.version}:${analysis.updatedAt}`} projectId={projectId} analysis={analysis} />;
}

function ProjectProfitEditor({ projectId, analysis }: Props & { analysis: ProjectProfitAnalysis }) {
  const { currentUser, users } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const { unitPriceTables, save, createUnitPrices } = useProjectProfitStore();
  const initialTable = unitPriceTables.find((table) => table.id === analysis.unitPriceTableId) || analysis.unitPriceTable || null;
  const [draft, setDraft] = useState<ProjectProfitAnalysis>(() => normalizeDraft(analysis));
  const [activeRound, setActiveRound] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberCategory, setMemberCategory] = useState<ProfitLaborCategory>('STRUCTURE');
  const [memberGrade, setMemberGrade] = useState<ProfitGrade>('PROFESSIONAL');
  const [priceDate, setPriceDate] = useState(dateOnly(initialTable?.effectiveDate) || new Date().toISOString().slice(0, 10));
  const [priceEntries, setPriceEntries] = useState<UnitPriceEntry[]>(() => initialTable?.entries.length ? clone(initialTable.entries) : PROFIT_GRADES.map((grade) => ({ grade, unitPrice: '0' })));

  const actor = currentUser ? { id: currentUser.id, role: currentUser.role, departmentId: currentUser.departmentId } : null;
  const selectedTable = unitPriceTables.find((table) => table.id === draft?.unitPriceTableId) || draft?.unitPriceTable || null;
  const selectUnitPriceTable = (tableId: string) => {
    const table = unitPriceTables.find((item) => item.id === tableId) || null;
    setDraft((current) => ({ ...current, unitPriceTableId: table?.id || null, unitPriceTable: table }));
    if (table) {
      setPriceDate(dateOnly(table.effectiveDate));
      setPriceEntries(clone(table.entries));
    }
  };

  const summary = useMemo(() => draft ? calculateLocalProjectProfit(draft, selectedTable) : null, [draft, selectedTable]);
  const round = draft?.rounds.find((item) => item.roundNo === activeRound);
  const dates = dateRange(round?.startDate, round?.endDate);
  const money = (value: string) => new Intl.NumberFormat(settings.uiLanguage === 'vi' ? 'vi-VN' : 'ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(Number(value || 0));
  const userName = (id?: string | null) => { const user = users.find((item) => item.id === id); return user ? getUserDisplayName(user) : id || t('unset'); };
  const run = async (work: () => Promise<unknown>, success: string) => { setBusy(true); setMessage(''); try { await work(); setMessage(success); } catch (caught) { setMessage(caught instanceof Error ? caught.message : t('projectProfit.error.generic')); } finally { setBusy(false); } };
  const changeRound = (updater: (value: ProjectProfitRound) => ProjectProfitRound) => setDraft((current) => current ? { ...current, rounds: current.rounds.map((item) => item.roundNo === activeRound ? updater(item) : item) } : current);
  const updateContract = (category: string, amount: string) => setDraft((current) => current ? { ...current, contractAmounts: current.contractAmounts.map((row) => row.category === category ? { ...row, amount, sourceType: 'MANUAL', sourceRef: null } : row) } : current);
  const updateOther = (category: string, amount: string) => changeRound((current) => ({ ...current, otherCosts: current.otherCosts.map((row) => row.category === category ? { ...row, amount, sourceType: 'MANUAL', sourceRef: null } : row) }));
  const toggleDate = (memberKey: string, date: string) => changeRound((current) => ({ ...current, members: current.members.map((member) => member.id === memberKey ? { ...member, workDates: member.workDates.includes(date) ? member.workDates.filter((item) => item !== date) : [...member.workDates, date].sort() } : member) }));
  const addMember = () => {
    const user = users.find((item) => item.id === memberId); if (!user) return;
    changeRound((current) => ({ ...current, members: [...current.members, { id: `profit-member-${globalThis.crypto?.randomUUID?.() || Date.now()}`, personnelId: user.id, sourceScheduleRowId: null, category: memberCategory, grade: memberGrade, name: getUserDisplayName(user), workDates: [], days: 0, cost: '0.00' }] }));
    setMemberId('');
  };
  const saveDraft = () => {
    if (!actor || !draft) return;
    const input: ProjectProfitUpdateInput = { unitPriceTableId: draft.unitPriceTableId || selectedTable?.id || null, contractAmounts: draft.contractAmounts.map(({ category, amount, sourceType, sourceRef }) => ({ category, amount: amount || '0', sourceType, sourceRef })), rounds: draft.rounds.map((item) => ({ roundNo: item.roundNo, startDate: dateOnly(item.startDate) || null, endDate: dateOnly(item.endDate) || null, members: item.members.map(({ personnelId, sourceScheduleRowId, category, grade, name, workDates }) => ({ personnelId, sourceScheduleRowId, category, grade, name, workDates })), otherCosts: item.otherCosts.map(({ category, amount, sourceType, sourceRef }) => ({ category, amount: amount || '0', sourceType, sourceRef })) })) };
    void run(() => save(projectId, input, actor), t('projectProfit.message.saved'));
  };
  const savePrices = () => actor && void run(async () => { const table = await createUnitPrices({ effectiveDate: priceDate, entries: priceEntries.map(({ grade, unitPrice }) => ({ grade, unitPrice: unitPrice || '0' })) }, actor); setDraft((current) => current ? { ...current, unitPriceTableId: table.id, unitPriceTable: table } : current); }, t('projectProfit.message.priceSaved'));

  if (!currentUser || !summary || !round) return null;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
      <div><h3 className="flex items-center gap-2 font-bold text-[var(--color-text-main)]"><Calculator className="h-4 w-4" />{t('projectProfit.title')}</h3><p className="mt-1 text-xs text-[var(--color-text-sub)]">{t('projectProfit.formula')}</p></div>
      <span className="rounded border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text-sub)]">{t(`projectProfit.status.${draft.status}`)}</span>
    </header>
    {message && <div role="status" className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</div>}

    <section aria-label={t('projectProfit.summary.title')}>
      <div className="grid gap-3 sm:grid-cols-3"><Metric label={t('projectProfit.summary.contract')} value={money(summary.contractTotal)} /><Metric label={t('projectProfit.summary.cost')} value={money(summary.costTotal)} /><Metric label={t('projectProfit.summary.result')} value={money(summary.result)} emphasis={Number(summary.result) >= 0 ? 'positive' : 'negative'} /></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-y border-[var(--color-border)] bg-[var(--color-bg)]"><tr><th className="p-2">{t('projectProfit.category')}</th><th className="p-2 text-right">{t('projectProfit.summary.contract')}</th>{[1, 2, 3].map((value) => <th key={value} className="p-2 text-right">{t('projectProfit.round.short', { no: String(value) })}</th>)}<th className="p-2 text-right">{t('projectProfit.summary.cost')}</th></tr></thead><tbody>{PROFIT_CATEGORIES.map((category) => { const row = summary.byCategory.find((item) => item.category === category)!; const contract = draft.contractAmounts.find((item) => item.category === category)!; return <tr key={category} className="border-b border-[var(--color-border)]"><td className="p-2 font-semibold">{t(`projectProfit.category.${category}`)}</td><td className="p-2"><input type="number" min="0" step="1" disabled={!draft.permissions.canEdit} value={contract.amount} onChange={(event) => updateContract(category, event.target.value)} className={`${inputClass} ml-auto max-w-40 text-right`} aria-label={`${t(`projectProfit.category.${category}`)} ${t('projectProfit.summary.contract')}`} /><p className="mt-1 text-right text-[10px] text-[var(--color-text-sub)]">{t(`projectProfit.source.${contract.sourceType}`)}</p></td>{row.roundCosts.map((value, index) => <td key={index} className="p-2 text-right font-mono">{money(value)}</td>)}<td className="p-2 text-right font-mono font-bold">{money(row.totalCost)}</td></tr>; })}</tbody></table></div>
    </section>

    <section className="border-t border-[var(--color-border)] pt-5">
      <div className="flex overflow-x-auto border-b border-[var(--color-border)]" role="tablist" aria-label={t('projectProfit.round.tabs')}>{[1, 2, 3].map((value) => <button key={value} type="button" role="tab" aria-selected={activeRound === value} onClick={() => setActiveRound(value)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] ${activeRound === value ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-sub)]'}`}>{t('projectProfit.round.title', { no: String(value) })}</button>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={t('projectProfit.round.start')}><input type="date" disabled={!draft.permissions.canEdit} value={dateOnly(round.startDate)} onChange={(event) => changeRound((current) => ({ ...current, startDate: event.target.value || null }))} className={inputClass} /></Field><Field label={t('projectProfit.round.end')}><input type="date" disabled={!draft.permissions.canEdit} value={dateOnly(round.endDate)} onChange={(event) => changeRound((current) => ({ ...current, endDate: event.target.value || null }))} className={inputClass} /></Field></div>
      {draft.permissions.canEdit && <div className="mt-4 grid gap-2 border-y border-[var(--color-border)] py-4 sm:grid-cols-[minmax(0,1fr)_180px_180px_auto]"><select value={memberId} onChange={(event) => setMemberId(event.target.value)} className={inputClass}><option value="">{t('projectProfit.member.select')}</option>{users.filter((user) => user.isActive !== false).map((user) => <option key={user.id} value={user.id}>{getUserDisplayName(user)}</option>)}</select><select value={memberCategory} onChange={(event) => setMemberCategory(event.target.value as ProfitLaborCategory)} className={inputClass}>{PROFIT_LABOR_CATEGORIES.map((category) => <option key={category} value={category}>{t(`projectProfit.category.${category}`)}</option>)}</select><select value={memberGrade} onChange={(event) => setMemberGrade(event.target.value as ProfitGrade)} className={inputClass}>{PROFIT_GRADES.map((grade) => <option key={grade} value={grade}>{t(`projectProfit.grade.${grade}`)}</option>)}</select><button type="button" disabled={!memberId} onClick={addMember} className={`${buttonClass} bg-[var(--color-primary)] text-white`}><Plus className="h-4 w-4" />{t('projectProfit.member.add')}</button></div>}
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead className="border-y border-[var(--color-border)] bg-[var(--color-bg)]"><tr><th className="p-2">{t('projectProfit.member.name')}</th><th className="p-2">{t('projectProfit.member.grade')}</th><th className="p-2">{t('projectProfit.member.category')}</th><th className="p-2 text-right">{t('projectProfit.member.days')}</th><th className="p-2 text-right">{t('projectProfit.member.cost')}</th>{dates.map((date) => <th key={date} className="p-1 text-center font-normal"><span className="block whitespace-nowrap">{date.slice(5)}</span></th>)}<th className="w-9" /></tr></thead><tbody>{round.members.map((member) => <tr key={member.id} className="border-b border-[var(--color-border)]"><td className="p-2 font-semibold">{member.name || userName(member.personnelId)}</td><td className="p-2">{t(`projectProfit.grade.${member.grade}`)}</td><td className="p-2">{t(`projectProfit.category.${member.category}`)}</td><td className="p-2 text-right">{member.workDates.length}</td><td className="p-2 text-right font-mono">{money(String(member.workDates.length * Number(selectedTable?.entries.find((entry) => entry.grade === member.grade)?.unitPrice || 0)))}</td>{dates.map((date) => <td key={date} className="p-1 text-center"><input type="checkbox" checked={member.workDates.includes(date)} disabled={!draft.permissions.canEdit} onChange={() => toggleDate(member.id, date)} aria-label={`${member.name} ${date}`} className="h-4 w-4 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></td>)}<td>{draft.permissions.canEdit && <button type="button" aria-label={t('projectProfit.member.remove')} onClick={() => changeRound((current) => ({ ...current, members: current.members.filter((item) => item.id !== member.id) }))} className="rounded p-1.5 text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><Trash2 className="h-4 w-4" /></button>}</td></tr>)}</tbody></table></div>
      {!round.members.length && <p className="border-b border-dashed border-[var(--color-border)] py-6 text-center text-sm text-[var(--color-text-sub)]">{t('projectProfit.member.empty')}</p>}
      {!dates.length && <p className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-sub)]"><CalendarDays className="h-4 w-4" />{t('projectProfit.round.periodRequired')}</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{PROFIT_OTHER_CATEGORIES.map((category) => { const row = round.otherCosts.find((item) => item.category === category)!; return <Field key={category} label={t(`projectProfit.category.${category}`)}><input type="number" min="0" step="1" disabled={!draft.permissions.canEdit} value={row.amount} onChange={(event) => updateOther(category, event.target.value)} className={`${inputClass} text-right`} /></Field>; })}</div>
    </section>

    {draft.permissions.canViewUnitPrices && <section className="border-t border-[var(--color-border)] pt-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="flex items-center gap-2 text-sm font-bold"><Settings2 className="h-4 w-4" />{t('projectProfit.price.title')}</h4><p className="mt-1 text-xs text-[var(--color-text-sub)]">{selectedTable ? t('projectProfit.price.version', { version: String(selectedTable.version), date: dateOnly(selectedTable.effectiveDate) }) : t('projectProfit.price.none')}</p></div>{unitPriceTables.length > 0 && <select value={draft.unitPriceTableId || selectedTable?.id || ''} onChange={(event) => selectUnitPriceTable(event.target.value)} className={`${inputClass} max-w-60`}>{unitPriceTables.map((table) => <option key={table.id} value={table.id}>v{table.version} · {dateOnly(table.effectiveDate)}</option>)}</select>}</div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{priceEntries.map((entry) => <Field key={entry.grade} label={t(`projectProfit.grade.${entry.grade}`)}><input type="number" min="0" step="1" disabled={!draft.permissions.canManageUnitPrices} value={entry.unitPrice} onChange={(event) => setPriceEntries((items) => items.map((item) => item.grade === entry.grade ? { ...item, unitPrice: event.target.value } : item))} className={`${inputClass} text-right`} /></Field>)}</div>{draft.permissions.canManageUnitPrices && <div className="mt-3 flex flex-wrap justify-end gap-2"><input type="date" value={priceDate} onChange={(event) => setPriceDate(event.target.value)} className={`${inputClass} max-w-44`} /><button type="button" disabled={busy || !priceDate} onClick={savePrices} className={`${buttonClass} border border-[var(--color-border)]`}><Save className="h-4 w-4" />{t('projectProfit.price.save')}</button></div>}</section>}

    <section className="border-t border-[var(--color-border)] pt-5"><h4 className="text-sm font-bold">{t('projectProfit.trace.title')}</h4><dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">{Object.entries(draft.sourceTrace).map(([key, value]) => <div key={key} className="flex justify-between gap-3 border-b border-[var(--color-border)] py-2"><dt className="text-[var(--color-text-sub)]">{key}</dt><dd className="truncate font-mono">{value ?? t('unset')}</dd></div>)}</dl></section>
    {draft.permissions.canEdit && <div className="sticky bottom-0 flex justify-end border-t border-[var(--color-border)] bg-[var(--color-surface)] py-3"><button type="button" disabled={busy} onClick={saveDraft} className={`${buttonClass} bg-[var(--color-primary)] text-white`}><Save className="h-4 w-4" />{t('projectProfit.action.save')}</button></div>}
  </div>;
}

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: 'positive' | 'negative' }) { return <div className="border-y border-[var(--color-border)] py-3"><p className="text-xs font-semibold text-[var(--color-text-sub)]">{label}</p><p className={`mt-1 text-lg font-bold ${emphasis === 'positive' ? 'text-green-700' : emphasis === 'negative' ? 'text-red-700' : 'text-[var(--color-text-main)]'}`}>{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-[var(--color-text-sub)]">{label}<span className="mt-1 block">{children}</span></label>; }
