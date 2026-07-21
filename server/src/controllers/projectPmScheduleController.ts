import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db';
import {
  assertPmScheduleTransition,
  assignmentIds,
  canAssignProjectPmSchedule,
  canEditProjectPmSchedule,
  canReviewProjectPmSchedule,
  canViewProjectPmSchedule,
  emptyPmAssignment,
  emptyPmPlan,
  emptyPmRequestTargets,
  evaluatePmScheduleCompleteness,
  findPmScheduleConflicts,
  pmAssignmentSchema,
  pmRequestTargetsSchema,
  pmSchedulePlanSchema,
  PmAssignment,
  PmRequestTargets,
  PmSchedulePlan,
  ProjectPmScheduleActor,
  ProjectPmScheduleScope,
  ProjectPmScheduleStatus,
  PROJECT_PM_SCHEDULE_STATUSES,
} from '../domain/projectPmSchedule';

const listQuerySchema = z.object({
  status: z.enum(PROJECT_PM_SCHEDULE_STATUSES).optional(),
  q: z.string().trim().max(200).optional(),
}).strict();

const assignmentInputSchema = z.object({ expectedVersion: z.number().int().positive(), assignment: pmAssignmentSchema }).strict();
const requestInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
  targets: pmRequestTargetsSchema,
  memo: z.string().trim().max(10000).default(''),
}).strict();
const draftInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
  plan1: pmSchedulePlanSchema,
  plan2: pmSchedulePlanSchema,
}).strict();
const approveInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
  selectedProposal: z.enum(['plan1', 'plan2']),
}).strict();
const rejectInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(1).max(10000),
}).strict();

const scheduleInclude = {
  project: { include: { manager: true, pm: true, projectIntake: true } },
  histories: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ProjectPmScheduleInclude;

type ScheduleWithRelations = Prisma.ProjectPmScheduleGetPayload<{ include: typeof scheduleInclude }>;
type HttpError = Error & { status?: number; details?: unknown };
const httpError = (message: string, status: number, details?: unknown): HttpError => Object.assign(new Error(message), { status, details });
const parseJson = (value: string): unknown => { try { return JSON.parse(value); } catch { return {}; } };

const parseAssignment = (value: string): PmAssignment => {
  const parsed = pmAssignmentSchema.safeParse(parseJson(value));
  return parsed.success ? parsed.data : emptyPmAssignment();
};
const parseTargets = (value: string): PmRequestTargets => {
  const parsed = pmRequestTargetsSchema.safeParse(parseJson(value));
  return parsed.success ? parsed.data : emptyPmRequestTargets();
};
const parsePlan = (value: string, id: 'plan1' | 'plan2'): PmSchedulePlan => {
  const parsed = pmSchedulePlanSchema.safeParse(parseJson(value));
  return parsed.success ? parsed.data : emptyPmPlan(id);
};

const profitCategory = (category: PmSchedulePlan['rows'][number]['category']) => category === 'FINISH' ? 'FINISH' : category === 'CIVIL' ? 'CIVIL' : 'STRUCTURE';
const profitGrade = (rank: string | null, companyId: string | null) => {
  if (companyId === 'VIET_QS') return 'VIETNAM';
  return ({ CEO: 'DIRECTOR', COO: 'DIRECTOR', VICE_PRESIDENT: 'DIRECTOR', MANAGER: 'MANAGER', PM: 'TEAM_LEADER', TEAM_LEADER: 'TEAM_LEADER', DEPUTY_TEAM_LEADER: 'PART_LEADER', STAFF: 'PROFESSIONAL', TRAINEE: 'PROFESSIONAL' } as Record<string, string>)[rank || ''] || 'PRINCIPAL';
};
const profitWorkDates = (startDate: string, workDays: number) => {
  const result: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  if (!Number.isFinite(cursor.getTime())) return result;
  for (let index = 0; index < Math.min(62, Math.max(1, workDays)); index += 1) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
};

const scopeFor = (schedule: ScheduleWithRelations): ProjectPmScheduleScope => {
  const assignment = parseAssignment(schedule.assignmentsJson);
  const plan1 = parsePlan(schedule.plan1Json, 'plan1');
  const plan2 = parsePlan(schedule.plan2Json, 'plan2');
  return {
    managerId: schedule.project.managerId,
    managerDepartmentId: schedule.project.manager.departmentId,
    pmId: schedule.project.pmId,
    assignmentIds: assignmentIds(assignment),
    rowAssigneeIds: [...new Set([...plan1.rows, ...plan2.rows].map((row) => row.assigneeId))],
  };
};

const serialize = (schedule: ScheduleWithRelations, actor: ProjectPmScheduleActor) => {
  const assignment = parseAssignment(schedule.assignmentsJson);
  const plan1 = parsePlan(schedule.plan1Json, 'plan1');
  const plan2 = parsePlan(schedule.plan2Json, 'plan2');
  const scope = scopeFor(schedule);
  return {
    ...schedule,
    assignment,
    requestTargets: parseTargets(schedule.requestTargetsJson),
    plan1,
    plan2,
    completeness: { missing: evaluatePmScheduleCompleteness(plan1, plan2) },
    permissions: {
      canView: canViewProjectPmSchedule(actor, scope),
      canAssign: canAssignProjectPmSchedule(actor, scope) && schedule.status !== 'APPROVED',
      canEdit: canEditProjectPmSchedule(actor, scope) && schedule.status !== 'APPROVED',
      canReview: canReviewProjectPmSchedule(actor, scope) && schedule.status === 'SUBMITTED',
    },
  };
};

const loadSchedule = (projectId: string) => prisma.projectPmSchedule.findUniqueOrThrow({
  where: { projectId },
  include: scheduleInclude,
});

const handleError = (res: Response, error: unknown, label: string) => {
  const typed = error as HttpError;
  if (typed.status) return res.status(typed.status).json({ error: typed.message, details: typed.details });
  console.error(`${label} error:`, error);
  return res.status(500).json({ error: 'Internal Server Error' });
};

const historyAndAudit = async (
  tx: Prisma.TransactionClient,
  scheduleId: string,
  projectId: string,
  actorId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  details: Record<string, unknown>,
) => {
  await tx.projectPmScheduleHistory.create({
    data: { projectPmScheduleId: scheduleId, action, fromStatus, toStatus, detailsJson: JSON.stringify(details), actorId },
  });
  await tx.auditLog.create({
    data: { action: `PROJECT_PM_SCHEDULE_${action}`, entityType: 'ProjectPmSchedule', entityId: scheduleId, actorId, details: JSON.stringify({ projectId, ...details }) },
  });
};

export const listProjectPmSchedules = async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid PM schedule filters' });
  try {
    const actor = req.user!;
    const where: Prisma.ProjectPmScheduleWhereInput = {};
    if (parsed.data.status) where.status = parsed.data.status;
    if (parsed.data.q) where.project = { name: { contains: parsed.data.q, mode: 'insensitive' } };
    const schedules = await prisma.projectPmSchedule.findMany({ where, include: scheduleInclude, orderBy: { updatedAt: 'desc' } });
    res.json(schedules.filter((schedule) => canViewProjectPmSchedule(actor, scopeFor(schedule))).map((schedule) => serialize(schedule, actor)));
  } catch (error) {
    handleError(res, error, 'List project PM schedules');
  }
};

export const getProjectPmSchedule = async (req: Request, res: Response) => {
  try {
    res.json(serialize(await loadSchedule(String(req.params.projectId)), req.user!));
  } catch (error) {
    handleError(res, error, 'Get project PM schedule');
  }
};

export const assignProjectPmSchedule = async (req: Request, res: Response) => {
  const parsed = assignmentInputSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.assignment.primaryPmId) return res.status(400).json({ error: 'A primary PM assignment is required' });
  try {
    const projectId = String(req.params.projectId);
    const actor = req.user!;
    const ids = assignmentIds(parsed.data.assignment);
    const personnel = await prisma.personnelCard.findMany({ where: { id: { in: ids }, isActive: true } });
    if (personnel.length !== ids.length) throw httpError('One or more assigned PMs are unavailable', 409);
    const primary = personnel.find((item) => item.id === parsed.data.assignment.primaryPmId);
    if (!primary || !['PM', 'DEPARTMENT_MANAGER', 'SUPER_ADMIN'].includes(primary.role)) throw httpError('Primary assignee must have PM authority', 422);
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectPmSchedule.findUnique({ where: { projectId } });
      if (!current) throw httpError('Project PM schedule not found', 404);
      const target = assertPmScheduleTransition(current.status as ProjectPmScheduleStatus, 'assign');
      const claimed = await tx.projectPmSchedule.updateMany({
        where: { projectId, version: parsed.data.expectedVersion },
        data: { status: target, assignmentsJson: JSON.stringify(parsed.data.assignment), updatedBy: actor.personnelId, version: { increment: 1 } },
      });
      if (claimed.count !== 1) throw httpError('PM schedule was changed by another user', 409);
      await tx.project.update({ where: { id: projectId }, data: { pmId: parsed.data.assignment.primaryPmId, status: 'PM_ASSIGNED' } });
      await historyAndAudit(tx, current.id, projectId, actor.personnelId, 'ASSIGNED', current.status, target, { assignment: parsed.data.assignment });
    });
    res.json(serialize(await loadSchedule(projectId), actor));
  } catch (error) { handleError(res, error, 'Assign project PM schedule'); }
};

export const requestProjectPmScheduleDraft = async (req: Request, res: Response) => {
  const parsed = requestInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid PM schedule request', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectPmSchedule.findUnique({ where: { projectId } });
      if (!current) throw httpError('Project PM schedule not found', 404);
      const target = assertPmScheduleTransition(current.status as ProjectPmScheduleStatus, 'request');
      const requestedAt = new Date();
      const claimed = await tx.projectPmSchedule.updateMany({
        where: { projectId, version: parsed.data.expectedVersion },
        data: { status: target, requestTargetsJson: JSON.stringify(parsed.data.targets), requestMemo: parsed.data.memo, requestedBy: actor.personnelId, requestedAt, updatedBy: actor.personnelId, version: { increment: 1 } },
      });
      if (claimed.count !== 1) throw httpError('PM schedule was changed by another user', 409);
      await tx.project.update({ where: { id: projectId }, data: { status: 'SCHEDULE_DRAFTING' } });
      await historyAndAudit(tx, current.id, projectId, actor.personnelId, 'DRAFT_REQUESTED', current.status, target, { targets: parsed.data.targets, memo: parsed.data.memo });
    });
    res.json(serialize(await loadSchedule(projectId), actor));
  } catch (error) { handleError(res, error, 'Request project PM schedule draft'); }
};

const savePlans = async (req: Request, res: Response, submit: boolean) => {
  const parsed = draftInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid PM schedule plans', details: parsed.error.issues });
  const missing = evaluatePmScheduleCompleteness(parsed.data.plan1, parsed.data.plan2);
  if (submit && missing.length) return res.status(422).json({ error: 'Both PM schedule proposals are required', missing });
  try {
    const projectId = String(req.params.projectId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectPmSchedule.findUnique({ where: { projectId } });
      if (!current) throw httpError('Project PM schedule not found', 404);
      const action = submit ? 'submit' : 'save';
      const target = assertPmScheduleTransition(current.status as ProjectPmScheduleStatus, action);
      const submittedAt = submit ? new Date() : undefined;
      const claimed = await tx.projectPmSchedule.updateMany({
        where: { projectId, version: parsed.data.expectedVersion },
        data: {
          status: target,
          plan1Json: JSON.stringify(parsed.data.plan1),
          plan2Json: JSON.stringify(parsed.data.plan2),
          submittedBy: submit ? actor.personnelId : current.submittedBy,
          submittedAt: submit ? submittedAt : current.submittedAt,
          rejectReason: submit ? null : current.rejectReason,
          updatedBy: actor.personnelId,
          version: { increment: 1 },
        },
      });
      if (claimed.count !== 1) throw httpError('PM schedule was changed by another user', 409);
      await tx.project.update({ where: { id: projectId }, data: { status: submit ? 'SCHEDULE_PENDING_APPROVAL' : 'SCHEDULE_DRAFTING' } });
      await historyAndAudit(tx, current.id, projectId, actor.personnelId, submit ? 'SUBMITTED' : 'DRAFT_SAVED', current.status, target, { plan1Rows: parsed.data.plan1.rows.length, plan2Rows: parsed.data.plan2.rows.length });
    });
    res.json(serialize(await loadSchedule(projectId), actor));
  } catch (error) { handleError(res, error, submit ? 'Submit project PM schedule' : 'Save project PM schedule'); }
};

export const saveProjectPmScheduleDraft = (req: Request, res: Response) => savePlans(req, res, false);
export const submitProjectPmSchedule = (req: Request, res: Response) => savePlans(req, res, true);

export const approveProjectPmSchedule = async (req: Request, res: Response) => {
  const parsed = approveInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Select plan1 or plan2 for approval' });
  try {
    const projectId = String(req.params.projectId);
    const actor = req.user!;
    const current = await loadSchedule(projectId);
    const selected = parsed.data.selectedProposal === 'plan1' ? parsePlan(current.plan1Json, 'plan1') : parsePlan(current.plan2Json, 'plan2');
    const approved = await prisma.projectPmSchedule.findMany({ where: { status: 'APPROVED', projectId: { not: projectId } }, include: { project: true } });
    const conflictSources = approved.map((schedule) => {
      const planId = schedule.approvedPlan === 'plan2' ? 'plan2' : 'plan1';
      return { projectId: schedule.projectId, projectName: schedule.project.name, rows: parsePlan(planId === 'plan2' ? schedule.plan2Json : schedule.plan1Json, planId).rows };
    });
    const conflicts = findPmScheduleConflicts(projectId, selected.rows, conflictSources);
    if (conflicts.length) throw httpError('Approved schedule conflicts with another project', 409, { conflicts });
    await prisma.$transaction(async (tx) => {
      const target = assertPmScheduleTransition(current.status as ProjectPmScheduleStatus, 'approve');
      const approvedAt = new Date();
      const claimed = await tx.projectPmSchedule.updateMany({
        where: { projectId, version: parsed.data.expectedVersion, status: 'SUBMITTED' },
        data: { status: target, selectedProposal: parsed.data.selectedProposal, approvedPlan: parsed.data.selectedProposal, approvedBy: actor.personnelId, approvedAt, rejectReason: null, updatedBy: actor.personnelId, version: { increment: 1 } },
      });
      if (claimed.count !== 1) throw httpError('PM schedule was changed by another user', 409);
      await tx.project.update({ where: { id: projectId }, data: { status: 'SCHEDULE_APPROVED' } });
      await historyAndAudit(tx, current.id, projectId, actor.personnelId, 'APPROVED', current.status, target, { approvedPlan: parsed.data.selectedProposal, rowCount: selected.rows.length });
      const profit = await tx.projectProfitAnalysis.findUnique({ where: { projectId }, include: { rounds: true } });
      if (profit) {
        const firstRound = profit.rounds.find((round) => round.roundNo === 1) || await tx.projectProfitRound.create({ data: { projectProfitAnalysisId: profit.id, roundNo: 1 } });
        const personnel = await tx.personnelCard.findMany({ where: { id: { in: selected.rows.map((row) => row.assigneeId) } } });
        const people = new Map(personnel.map((person) => [person.id, person]));
        await tx.projectProfitMember.deleteMany({ where: { projectProfitRoundId: firstRound.id, sourceScheduleRowId: { not: null } } });
        if (selected.rows.length) {
          await tx.projectProfitMember.createMany({ data: selected.rows.map((row) => {
            const person = people.get(row.assigneeId);
            return { projectProfitRoundId: firstRound.id, personnelId: row.assigneeId, sourceScheduleRowId: row.id, category: profitCategory(row.category), grade: profitGrade(person?.organizationRank || null, person?.companyId || null), name: person?.displayName || person?.name || row.assigneeId, workDatesJson: JSON.stringify(profitWorkDates(row.startDate, row.workDays)) };
          }) });
        }
        const starts = selected.rows.map((row) => row.startDate).filter(Boolean).sort();
        const ends = selected.rows.map((row) => row.endDate).filter(Boolean).sort();
        await tx.projectProfitRound.update({ where: { id: firstRound.id }, data: { startDate: starts[0] ? new Date(`${starts[0]}T00:00:00.000Z`) : null, endDate: ends.at(-1) ? new Date(`${ends.at(-1)}T00:00:00.000Z`) : null } });
        await tx.projectProfitHistory.create({ data: { projectProfitAnalysisId: profit.id, action: 'PM_SCHEDULE_SYNCED', actorId: actor.personnelId, detailsJson: JSON.stringify({ approvedPlan: parsed.data.selectedProposal, rowCount: selected.rows.length, sourceScheduleId: current.id }) } });
      }
    });
    res.json(serialize(await loadSchedule(projectId), actor));
  } catch (error) { handleError(res, error, 'Approve project PM schedule'); }
};

export const rejectProjectPmSchedule = async (req: Request, res: Response) => {
  const parsed = rejectInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A rejection reason is required' });
  try {
    const projectId = String(req.params.projectId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectPmSchedule.findUnique({ where: { projectId } });
      if (!current) throw httpError('Project PM schedule not found', 404);
      const target = assertPmScheduleTransition(current.status as ProjectPmScheduleStatus, 'reject');
      const claimed = await tx.projectPmSchedule.updateMany({
        where: { projectId, version: parsed.data.expectedVersion, status: 'SUBMITTED' },
        data: { status: target, rejectReason: parsed.data.reason, updatedBy: actor.personnelId, version: { increment: 1 } },
      });
      if (claimed.count !== 1) throw httpError('PM schedule was changed by another user', 409);
      await tx.project.update({ where: { id: projectId }, data: { status: 'SCHEDULE_REJECTED' } });
      await historyAndAudit(tx, current.id, projectId, actor.personnelId, 'REJECTED', current.status, target, { reason: parsed.data.reason });
    });
    res.json(serialize(await loadSchedule(projectId), actor));
  } catch (error) { handleError(res, error, 'Reject project PM schedule'); }
};
