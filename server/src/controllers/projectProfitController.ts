import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import {
  PROFIT_CATEGORIES,
  PROFIT_GRADES,
  analysisStatus,
  calculateProjectProfit,
  canEditProjectProfit,
  canManageUnitPrices,
  canViewUnitPrices,
  projectProfitUpdateSchema,
  unitPriceTableSchema,
} from '../domain/projectProfit';
import { projectProfitScope } from '../middlewares/projectProfitGuards';

const include = {
  project: { include: { manager: true, pm: true, pmSchedule: true, projectIntake: { include: { commercialDecision: true } } } },
  unitPriceTable: { include: { entries: { orderBy: { grade: 'asc' as const } } } },
  contractAmounts: { orderBy: { category: 'asc' as const } },
  rounds: { include: { members: { orderBy: [{ category: 'asc' as const }, { name: 'asc' as const }] }, otherCosts: { orderBy: { category: 'asc' as const } } }, orderBy: { roundNo: 'asc' as const } },
  histories: { orderBy: { createdAt: 'desc' as const }, take: 100 },
} satisfies Prisma.ProjectProfitAnalysisInclude;
type Analysis = Prisma.ProjectProfitAnalysisGetPayload<{ include: typeof include }>;
type HttpError = Error & { status?: number; details?: unknown };
type Actor = NonNullable<Request['user']>;

const httpError = (message: string, status: number, details?: unknown): HttpError => Object.assign(new Error(message), { status, details });
const parse = <T>(value: string | null, fallback: T): T => { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
const amount = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value).toFixed(2);
const dateValue = (value: Date | '' | null | undefined) => value instanceof Date ? value : null;
const handleError = (res: Response, error: unknown, label: string) => {
  const typed = error as HttpError;
  if (typed.status) return res.status(typed.status).json({ error: typed.message, details: typed.details });
  console.error(`${label} error:`, error);
  return res.status(500).json({ error: 'Internal Server Error' });
};
const load = (projectId: string) => prisma.projectProfitAnalysis.findUniqueOrThrow({ where: { projectId }, include });
const activeTable = () => prisma.unitPriceTable.findFirst({ where: { active: true }, include: { entries: true }, orderBy: [{ effectiveDate: 'desc' }, { version: 'desc' }] });
const claimVersion = async (tx: Prisma.TransactionClient, projectId: string, expectedVersion: number, actorId: string) => {
  const claimed = await tx.projectProfitAnalysis.updateMany({ where: { projectId, version: expectedVersion }, data: { version: { increment: 1 }, updatedBy: actorId } });
  if (claimed.count !== 1) throw httpError('Project profit analysis was changed by another user', 409);
};
const history = (tx: Prisma.TransactionClient, projectId: string, action: string, actorId: string, details: Record<string, unknown>) => tx.projectProfitHistory.create({ data: { projectProfitAnalysisId: projectId, action, actorId, detailsJson: JSON.stringify(details) } });
const audit = (tx: Prisma.TransactionClient, action: string, projectId: string, actorId: string, details: Record<string, unknown>) => tx.auditLog.create({ data: { action, entityType: 'ProjectProfitAnalysis', entityId: projectId, actorId, details: JSON.stringify(details) } });

const formulaInput = (analysis: Analysis, table: { entries: Array<{ grade: string; unitPrice: Prisma.Decimal }> } | null) => ({
  contractAmounts: analysis.contractAmounts.map((row) => ({ category: row.category as typeof PROFIT_CATEGORIES[number], amount: amount(row.amount) })),
  rounds: analysis.rounds.map((round) => ({
    roundNo: round.roundNo,
    members: round.members.map((member) => ({ category: member.category as 'STRUCTURE' | 'FINISH' | 'CIVIL', grade: member.grade as typeof PROFIT_GRADES[number], workDates: parse<string[]>(member.workDatesJson, []) })),
    otherCosts: round.otherCosts.map((row) => ({ category: row.category as 'MECHANICAL' | 'ELECTRICAL' | 'OUTSOURCING' | 'AS', amount: amount(row.amount) })),
  })),
  unitPrices: (table?.entries || []).map((entry) => ({ grade: entry.grade as typeof PROFIT_GRADES[number], unitPrice: amount(entry.unitPrice) })),
});

const serialize = async (analysis: Analysis, actor: Actor) => {
  const scope = await projectProfitScope(analysis.projectId);
  if (!scope) throw httpError('Project not found', 404);
  const table = analysis.unitPriceTable || await activeTable();
  const summary = calculateProjectProfit(formulaInput(analysis, table));
  const priceMap = new Map((table?.entries || []).map((entry) => [entry.grade, amount(entry.unitPrice)]));
  const showPrices = canViewUnitPrices(actor, scope);
  return {
    ...analysis,
    project: { id: analysis.project.id, name: analysis.project.name, status: analysis.project.status, departmentId: analysis.project.manager.departmentId, managerId: analysis.project.managerId, pmId: analysis.project.pmId },
    unitPriceTable: table ? { id: table.id, version: table.version, effectiveDate: table.effectiveDate, active: table.active, entries: showPrices ? table.entries.map((entry) => ({ ...entry, unitPrice: amount(entry.unitPrice) })) : [] } : null,
    contractAmounts: analysis.contractAmounts.map((row) => ({ ...row, amount: amount(row.amount) })),
    rounds: analysis.rounds.map((round) => ({ ...round, members: round.members.map((member) => {
      const workDates = parse<string[]>(member.workDatesJson, []);
      const unitPrice = priceMap.get(member.grade) || '0.00';
      const memberSummary = calculateProjectProfit({ contractAmounts: [], unitPrices: [{ grade: member.grade as typeof PROFIT_GRADES[number], unitPrice }], rounds: [{ roundNo: 1, members: [{ category: member.category as 'STRUCTURE' | 'FINISH' | 'CIVIL', grade: member.grade as typeof PROFIT_GRADES[number], workDates }], otherCosts: [] }] });
      return { ...member, workDates, days: new Set(workDates).size, cost: memberSummary.costTotal, ...(showPrices ? { unitPrice } : {}) };
    }), otherCosts: round.otherCosts.map((row) => ({ ...row, amount: amount(row.amount) })) })),
    histories: analysis.histories.map((row) => ({ ...row, details: parse(row.detailsJson, {}) })),
    sourceTrace: { canonicalProjectId: analysis.projectId, commercialDecisionId: analysis.sourceCommercialDecisionId, agreedAmount: analysis.project.projectIntake?.commercialDecision.agreedAmount?.toString() ?? null, unitPriceTableId: table?.id ?? null, unitPriceTableVersion: table?.version ?? null },
    summary,
    permissions: { canView: true, canEdit: canEditProjectProfit(actor, scope), canViewUnitPrices: showPrices, canManageUnitPrices: canManageUnitPrices(actor) },
  };
};

export const getProjectProfit = async (req: Request, res: Response) => {
  try { res.json(await serialize(await load(String(req.params.projectId)), req.user!)); }
  catch (error) { handleError(res, error, 'Get project profit analysis'); }
};

export const updateProjectProfit = async (req: Request, res: Response) => {
  const parsed = projectProfitUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project profit analysis', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId); const actor = req.user!;
    const selectedTable = parsed.data.unitPriceTableId ? await prisma.unitPriceTable.findUnique({ where: { id: parsed.data.unitPriceTableId }, include: { entries: true } }) : await activeTable();
    if (parsed.data.unitPriceTableId && !selectedTable) throw httpError('Unit price table not found', 422);
    const summary = calculateProjectProfit({
      contractAmounts: parsed.data.contractAmounts,
      rounds: parsed.data.rounds.map((round) => ({ ...round, members: round.members, otherCosts: round.otherCosts })),
      unitPrices: (selectedTable?.entries || []).map((entry) => ({ grade: entry.grade as typeof PROFIT_GRADES[number], unitPrice: amount(entry.unitPrice) })),
    });
    await prisma.$transaction(async (tx) => {
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      await tx.profitContractAmount.deleteMany({ where: { projectProfitAnalysisId: projectId } });
      await tx.projectProfitRound.deleteMany({ where: { projectProfitAnalysisId: projectId } });
      await tx.projectProfitAnalysis.update({ where: { id: projectId }, data: { unitPriceTableId: selectedTable?.id ?? null, status: analysisStatus(summary) } });
      await tx.profitContractAmount.createMany({ data: parsed.data.contractAmounts.map((row) => ({ projectProfitAnalysisId: projectId, category: row.category, amount: new Prisma.Decimal(row.amount), sourceType: row.sourceType, sourceRef: row.sourceRef })) });
      for (const round of parsed.data.rounds) {
        await tx.projectProfitRound.create({ data: {
          projectProfitAnalysisId: projectId, roundNo: round.roundNo, startDate: dateValue(round.startDate), endDate: dateValue(round.endDate),
          members: { create: round.members.map((member) => ({ personnelId: member.personnelId, sourceScheduleRowId: member.sourceScheduleRowId, category: member.category, grade: member.grade, name: member.name, workDatesJson: JSON.stringify([...new Set(member.workDates)].sort()) })) },
          otherCosts: { create: round.otherCosts.map((row) => ({ category: row.category, amount: new Prisma.Decimal(row.amount), sourceType: row.sourceType, sourceRef: row.sourceRef })) },
        } });
      }
      await history(tx, projectId, 'ANALYSIS_UPDATED', actor.personnelId, { unitPriceTableId: selectedTable?.id ?? null, contractTotal: summary.contractTotal, costTotal: summary.costTotal, result: summary.result });
      await audit(tx, 'PROJECT_PROFIT_UPDATED', projectId, actor.personnelId, { version: parsed.data.expectedVersion + 1, contractTotal: summary.contractTotal, costTotal: summary.costTotal, result: summary.result });
    });
    res.json(await serialize(await load(projectId), actor));
  } catch (error) { handleError(res, error, 'Update project profit analysis'); }
};

export const listUnitPriceTables = async (req: Request, res: Response) => {
  if (!['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'].includes(req.user!.role)) return res.status(403).json({ error: 'Forbidden: unit prices require management access' });
  try {
    const tables = await prisma.unitPriceTable.findMany({ include: { entries: { orderBy: { grade: 'asc' } } }, orderBy: { version: 'desc' } });
    res.json(tables.map((table) => ({ ...table, entries: table.entries.map((entry) => ({ ...entry, unitPrice: amount(entry.unitPrice) })) })));
  } catch (error) { handleError(res, error, 'List unit price tables'); }
};

export const createUnitPriceTable = async (req: Request, res: Response) => {
  if (!canManageUnitPrices(req.user!)) return res.status(403).json({ error: 'Forbidden: only administrators can manage unit prices' });
  const parsed = unitPriceTableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid unit price table', details: parsed.error.issues });
  try {
    const actor = req.user!;
    const table = await prisma.$transaction(async (tx) => {
      const latest = await tx.unitPriceTable.aggregate({ _max: { version: true } });
      await tx.unitPriceTable.updateMany({ where: { active: true }, data: { active: false } });
      const created = await tx.unitPriceTable.create({ data: { version: (latest._max.version || 0) + 1, effectiveDate: parsed.data.effectiveDate, createdBy: actor.personnelId, entries: { create: parsed.data.entries.map((entry) => ({ grade: entry.grade, unitPrice: new Prisma.Decimal(entry.unitPrice) })) } }, include: { entries: true } });
      await tx.auditLog.create({ data: { action: 'UNIT_PRICE_TABLE_CREATED', entityType: 'UnitPriceTable', entityId: created.id, actorId: actor.personnelId, details: JSON.stringify({ version: created.version, effectiveDate: created.effectiveDate }) } });
      return created;
    });
    res.status(201).json({ ...table, entries: table.entries.map((entry) => ({ ...entry, unitPrice: amount(entry.unitPrice) })) });
  } catch (error) { handleError(res, error, 'Create unit price table'); }
};
