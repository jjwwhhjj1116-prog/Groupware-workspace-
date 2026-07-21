import { z } from 'zod';
import { ProjectOperationActor, ProjectOperationScope, canViewProjectOperation } from './projectOperation';

export const PROFIT_CATEGORIES = ['STRUCTURE', 'FINISH', 'CIVIL', 'MECHANICAL', 'ELECTRICAL', 'OUTSOURCING', 'AS'] as const;
export const LABOR_CATEGORIES = ['STRUCTURE', 'FINISH', 'CIVIL'] as const;
export const OTHER_COST_CATEGORIES = ['MECHANICAL', 'ELECTRICAL', 'OUTSOURCING', 'AS'] as const;
export const PROFIT_GRADES = ['DIRECTOR', 'MANAGER', 'TEAM_LEADER', 'PART_LEADER', 'PRINCIPAL', 'RESPONSIBLE', 'SENIOR', 'PROFESSIONAL', 'VIETNAM'] as const;

export type ProfitCategory = typeof PROFIT_CATEGORIES[number];
export type ProfitGrade = typeof PROFIT_GRADES[number];
export type MoneyInput = string | number;

const amount = z.union([
  z.string().trim().regex(/^\d{1,16}(?:\.\d{1,2})?$/),
  z.number().finite().min(0).max(99_999_999_999_999.99),
]);
const nullableDate = z.union([z.literal(''), z.coerce.date(), z.null()]).optional();
const workDate = z.string().date();

export const unitPriceTableSchema = z.object({
  effectiveDate: z.coerce.date(),
  entries: z.array(z.object({ grade: z.enum(PROFIT_GRADES), unitPrice: amount }).strict()).length(PROFIT_GRADES.length),
}).strict().superRefine((value, context) => {
  if (new Set(value.entries.map((entry) => entry.grade)).size !== PROFIT_GRADES.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['entries'], message: 'Every grade must appear exactly once' });
  }
});

export const projectProfitUpdateSchema = z.object({
  expectedVersion: z.number().int().positive(),
  unitPriceTableId: z.string().uuid().nullable().optional(),
  contractAmounts: z.array(z.object({
    category: z.enum(PROFIT_CATEGORIES), amount, sourceType: z.enum(['COMMERCIAL_DECISION', 'MANUAL']), sourceRef: z.string().trim().max(200).nullable().optional(),
  }).strict()).length(PROFIT_CATEGORIES.length),
  rounds: z.array(z.object({
    roundNo: z.number().int().min(1).max(3), startDate: nullableDate, endDate: nullableDate,
    members: z.array(z.object({
      personnelId: z.string().trim().max(200).nullable().optional(), sourceScheduleRowId: z.string().trim().max(200).nullable().optional(),
      category: z.enum(LABOR_CATEGORIES), grade: z.enum(PROFIT_GRADES), name: z.string().trim().min(1).max(200),
      workDates: z.array(workDate).max(62),
    }).strict()).max(200),
    otherCosts: z.array(z.object({
      category: z.enum(OTHER_COST_CATEGORIES), amount, sourceType: z.enum(['ESTIMATE_DATABASE', 'MANUAL']), sourceRef: z.string().trim().max(200).nullable().optional(),
    }).strict()).length(OTHER_COST_CATEGORIES.length),
  }).strict()).length(3),
}).strict().superRefine((value, context) => {
  if (new Set(value.contractAmounts.map((row) => row.category)).size !== PROFIT_CATEGORIES.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['contractAmounts'], message: 'Contract categories must be unique' });
  }
  if (new Set(value.rounds.map((round) => round.roundNo)).size !== 3) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['rounds'], message: 'Rounds 1, 2, and 3 are required' });
  }
  value.rounds.forEach((round, index) => {
    if (new Set(round.otherCosts.map((row) => row.category)).size !== OTHER_COST_CATEGORIES.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['rounds', index, 'otherCosts'], message: 'Other-cost categories must be unique' });
    }
    if (round.startDate instanceof Date && round.endDate instanceof Date && round.startDate > round.endDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['rounds', index, 'endDate'], message: 'Round end date must be on or after its start date' });
    }
  });
});

export const moneyToMinor = (value: MoneyInput): bigint => {
  const normalized = String(value ?? 0).replace(/,/g, '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error(`Invalid non-negative amount: ${value}`);
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
};

export const minorToMoney = (value: bigint): string => {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
};

export type ProfitFormulaInput = {
  contractAmounts: Array<{ category: ProfitCategory; amount: MoneyInput }>;
  rounds: Array<{
    roundNo: number;
    members: Array<{ category: typeof LABOR_CATEGORIES[number]; grade: ProfitGrade; workDates: string[] }>;
    otherCosts: Array<{ category: typeof OTHER_COST_CATEGORIES[number]; amount: MoneyInput }>;
  }>;
  unitPrices: Array<{ grade: ProfitGrade; unitPrice: MoneyInput }>;
};

export const calculateProjectProfit = (input: ProfitFormulaInput) => {
  const prices = new Map(input.unitPrices.map((entry) => [entry.grade, moneyToMinor(entry.unitPrice)]));
  const contracts = new Map(input.contractAmounts.map((entry) => [entry.category, moneyToMinor(entry.amount)]));
  const roundCosts = input.rounds.map((round) => {
    const byCategory = new Map<ProfitCategory, bigint>(PROFIT_CATEGORIES.map((category) => [category, 0n]));
    round.members.forEach((member) => {
      const days = new Set(member.workDates).size;
      byCategory.set(member.category, (byCategory.get(member.category) || 0n) + BigInt(days) * (prices.get(member.grade) || 0n));
    });
    round.otherCosts.forEach((cost) => byCategory.set(cost.category, moneyToMinor(cost.amount)));
    const total = [...byCategory.values()].reduce((sum, value) => sum + value, 0n);
    return { roundNo: round.roundNo, total, byCategory };
  });
  const byCategory = PROFIT_CATEGORIES.map((category) => {
    const costs = roundCosts.map((round) => round.byCategory.get(category) || 0n);
    const totalCost = costs.reduce((sum, value) => sum + value, 0n);
    return { category, contractAmount: minorToMoney(contracts.get(category) || 0n), roundCosts: costs.map(minorToMoney), totalCost: minorToMoney(totalCost) };
  });
  const contractTotal = [...contracts.values()].reduce((sum, value) => sum + value, 0n);
  const costTotal = roundCosts.reduce((sum, round) => sum + round.total, 0n);
  return {
    formula: 'RESULT = SUM(CONTRACT_AMOUNTS) - SUM(MEMBER_WORK_DAYS * GRADE_UNIT_PRICE + OTHER_COSTS)',
    contractTotal: minorToMoney(contractTotal), costTotal: minorToMoney(costTotal), result: minorToMoney(contractTotal - costTotal),
    roundTotals: roundCosts.map((round) => ({ roundNo: round.roundNo, amount: minorToMoney(round.total) })), byCategory,
  };
};

const isAdmin = (actor: ProjectOperationActor) => ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
const isManager = (actor: ProjectOperationActor, scope: ProjectOperationScope) => actor.role === 'DEPARTMENT_MANAGER'
  && (actor.personnelId === scope.managerId || actor.departmentId === scope.managerDepartmentId);

export const canViewProjectProfit = canViewProjectOperation;
export const canEditProjectProfit = (actor: ProjectOperationActor, scope: ProjectOperationScope) => isAdmin(actor)
  || isManager(actor, scope) || (actor.role === 'PM' && actor.personnelId === scope.pmId);
export const canViewUnitPrices = (actor: ProjectOperationActor, scope?: ProjectOperationScope) => isAdmin(actor) || Boolean(scope && isManager(actor, scope));
export const canManageUnitPrices = (actor: ProjectOperationActor) => isAdmin(actor);
export const analysisStatus = (summary: { contractTotal: string; costTotal: string }) => moneyToMinor(summary.contractTotal) > 0n || moneyToMinor(summary.costTotal) > 0n ? 'ANALYZED' : 'OPEN';
