import {
  PersonnelCard,
  ProfitCategory,
  ProfitGrade,
  ProfitLaborCategory,
  ProfitOtherCostCategory,
  Project,
  ProjectIntake,
  ProjectPmSchedule,
  ProjectProfitAnalysis,
  ProjectProfitRound,
  ProjectProfitSummary,
  Role,
  UnitPriceTable,
} from '@/types/models';

export const PROFIT_CATEGORIES: ProfitCategory[] = ['STRUCTURE', 'FINISH', 'CIVIL', 'MECHANICAL', 'ELECTRICAL', 'OUTSOURCING', 'AS'];
export const PROFIT_LABOR_CATEGORIES: ProfitLaborCategory[] = ['STRUCTURE', 'FINISH', 'CIVIL'];
export const PROFIT_OTHER_CATEGORIES: ProfitOtherCostCategory[] = ['MECHANICAL', 'ELECTRICAL', 'OUTSOURCING', 'AS'];
export const PROFIT_GRADES: ProfitGrade[] = ['DIRECTOR', 'MANAGER', 'TEAM_LEADER', 'PART_LEADER', 'PRINCIPAL', 'RESPONSIBLE', 'SENIOR', 'PROFESSIONAL', 'VIETNAM'];
export type ProjectProfitActor = { id: string; role: Role; departmentId: string };

const cents = (value: string | number) => Math.round(Number(value || 0) * 100);
const money = (value: number) => (value / 100).toFixed(2);
const id = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
const now = () => new Date().toISOString();

export const calculateLocalProjectProfit = (analysis: Pick<ProjectProfitAnalysis, 'contractAmounts' | 'rounds'>, table?: UnitPriceTable | null): ProjectProfitSummary => {
  const prices = new Map((table?.entries || []).map((entry) => [entry.grade, cents(entry.unitPrice)]));
  const contracts = new Map(analysis.contractAmounts.map((row) => [row.category, cents(row.amount)]));
  const roundCosts = analysis.rounds.map((round) => {
    const byCategory = new Map<ProfitCategory, number>(PROFIT_CATEGORIES.map((category) => [category, 0]));
    round.members.forEach((member) => byCategory.set(member.category, (byCategory.get(member.category) || 0) + new Set(member.workDates).size * (prices.get(member.grade) || 0)));
    round.otherCosts.forEach((cost) => byCategory.set(cost.category, cents(cost.amount)));
    return { roundNo: round.roundNo, byCategory, total: [...byCategory.values()].reduce((sum, value) => sum + value, 0) };
  });
  const byCategory = PROFIT_CATEGORIES.map((category) => {
    const costs = roundCosts.map((round) => round.byCategory.get(category) || 0);
    const totalCost = costs.reduce((sum, value) => sum + value, 0);
    return { category, contractAmount: money(contracts.get(category) || 0), roundCosts: costs.map(money), totalCost: money(totalCost) };
  });
  const contractTotal = [...contracts.values()].reduce((sum, value) => sum + value, 0);
  const costTotal = roundCosts.reduce((sum, round) => sum + round.total, 0);
  return { formula: 'RESULT = SUM(CONTRACT_AMOUNTS) - SUM(MEMBER_WORK_DAYS * GRADE_UNIT_PRICE + OTHER_COSTS)', contractTotal: money(contractTotal), costTotal: money(costTotal), result: money(contractTotal - costTotal), roundTotals: roundCosts.map((round) => ({ roundNo: round.roundNo, amount: money(round.total) })), byCategory };
};

export const localProfitPermissions = (analysis: Pick<ProjectProfitAnalysis, 'project'>, actor: ProjectProfitActor) => {
  const isAdmin = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
  const isManager = actor.role === 'DEPARTMENT_MANAGER' && (actor.id === analysis.project.managerId || actor.departmentId === analysis.project.departmentId);
  return { canView: isAdmin || isManager || actor.id === analysis.project.pmId, canEdit: isAdmin || isManager || actor.role === 'PM' && actor.id === analysis.project.pmId, canViewUnitPrices: isAdmin || isManager, canManageUnitPrices: isAdmin };
};

const gradeFor = (person?: PersonnelCard): ProfitGrade => {
  if (person?.companyId === 'VIET_QS') return 'VIETNAM';
  return ({ CEO: 'DIRECTOR', COO: 'DIRECTOR', VICE_PRESIDENT: 'DIRECTOR', MANAGER: 'MANAGER', PM: 'TEAM_LEADER', TEAM_LEADER: 'TEAM_LEADER', DEPUTY_TEAM_LEADER: 'PART_LEADER', STAFF: 'PROFESSIONAL', TRAINEE: 'PROFESSIONAL' } as Partial<Record<NonNullable<PersonnelCard['organizationRank']>, ProfitGrade>>)[person?.organizationRank || 'STAFF'] || 'PRINCIPAL';
};
const categoryFor = (value: string): ProfitLaborCategory => value === 'FINISH' ? 'FINISH' : value === 'CIVIL' ? 'CIVIL' : 'STRUCTURE';
const datesFor = (startDate: string, workDays: number) => {
  const dates: string[] = []; const cursor = new Date(`${startDate}T00:00:00.000Z`);
  if (!Number.isFinite(cursor.getTime())) return dates;
  for (let index = 0; index < Math.min(62, Math.max(1, workDays)); index += 1) { dates.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); }
  return dates;
};

export const makeLocalProfitAnalysis = (project: Project, actor: ProjectProfitActor, users: PersonnelCard[], schedule?: ProjectPmSchedule, intake?: ProjectIntake, table?: UnitPriceTable | null): ProjectProfitAnalysis => {
  const timestamp = now();
  const sourceAmount = intake?.commercialDecision?.agreedAmount || intake?.draft?.commercial.agreedAmount || '0';
  const rows = schedule ? (schedule.approvedPlan === 'plan2' ? schedule.plan2.rows : schedule.plan1.rows) : [];
  const round1Members = rows.map((row) => {
    const person = users.find((user) => user.id === row.assigneeId);
    const workDates = datesFor(row.startDate, row.workDays);
    return { id: id('profit-member'), personnelId: row.assigneeId, sourceScheduleRowId: row.id, category: categoryFor(row.category), grade: gradeFor(person), name: person?.displayName || person?.name || row.assigneeId, workDates, days: workDates.length, cost: '0.00' };
  });
  const rounds: ProjectProfitRound[] = [1, 2, 3].map((roundNo) => ({ id: id('profit-round'), roundNo, startDate: roundNo === 1 ? rows.map((row) => row.startDate).filter(Boolean).sort()[0] || null : null, endDate: roundNo === 1 ? rows.map((row) => row.endDate).filter(Boolean).sort().at(-1) || null : null, members: roundNo === 1 ? round1Members : [], otherCosts: PROFIT_OTHER_CATEGORIES.map((category) => ({ category, amount: '0.00', sourceType: 'MANUAL' as const })) }));
  const base: ProjectProfitAnalysis = {
    id: project.id, projectId: project.id, status: Number(sourceAmount) > 0 ? 'ANALYZED' : 'OPEN', unitPriceTableId: table?.id || null, sourceCommercialDecisionId: intake?.commercialDecisionId || null, version: 1,
    createdBy: actor.id, updatedBy: actor.id, createdAt: project.createdAt || timestamp, updatedAt: project.updatedAt || timestamp,
    project: { id: project.id, name: project.title, status: project.status, departmentId: project.departmentId, managerId: project.managerId || '', pmId: project.pmId || '' }, unitPriceTable: table || null,
    contractAmounts: PROFIT_CATEGORIES.map((category) => ({ category, amount: category === 'STRUCTURE' ? String(sourceAmount || 0) : '0.00', sourceType: category === 'STRUCTURE' && Number(sourceAmount) ? 'COMMERCIAL_DECISION' : 'MANUAL', sourceRef: category === 'STRUCTURE' ? intake?.commercialDecisionId || null : null })),
    rounds, histories: [], sourceTrace: { canonicalProjectId: project.id, commercialDecisionId: intake?.commercialDecisionId || null, agreedAmount: String(sourceAmount || 0), unitPriceTableId: table?.id || null, unitPriceTableVersion: table?.version || null },
    summary: { formula: '', contractTotal: '0.00', costTotal: '0.00', result: '0.00', roundTotals: [], byCategory: [] }, permissions: { canView: false, canEdit: false, canViewUnitPrices: false, canManageUnitPrices: false },
  };
  const summary = calculateLocalProjectProfit(base, table);
  return { ...base, summary, permissions: localProfitPermissions(base, actor) };
};

export const refreshLocalProfitAnalysis = (analysis: ProjectProfitAnalysis, actor: ProjectProfitActor, table?: UnitPriceTable | null) => {
  const selected = table || analysis.unitPriceTable || null;
  const summary = calculateLocalProjectProfit(analysis, selected);
  const permissions = localProfitPermissions(analysis, actor);
  const priceMap = new Map((selected?.entries || []).map((entry) => [entry.grade, Number(entry.unitPrice)]));
  const rounds = analysis.rounds.map((round) => ({ ...round, members: round.members.map((member) => ({ ...member, days: new Set(member.workDates).size, cost: (new Set(member.workDates).size * (priceMap.get(member.grade) || 0)).toFixed(2), ...(permissions.canViewUnitPrices ? { unitPrice: (priceMap.get(member.grade) || 0).toFixed(2) } : {}) })) }));
  const next = { ...analysis, rounds, unitPriceTableId: selected?.id || null, unitPriceTable: selected, status: Number(summary.contractTotal) || Number(summary.costTotal) ? 'ANALYZED' as const : 'OPEN' as const, version: analysis.version + 1, updatedBy: actor.id, updatedAt: now(), summary };
  return { ...next, permissions };
};
