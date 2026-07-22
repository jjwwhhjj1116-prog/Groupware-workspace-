import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db';
import {
  canApproveProjectOperation,
  canEditProjectOperation,
  canViewProjectOperation,
  dateValue,
  projectOperationActivitySchema,
  projectOperationMilestoneSchema,
  projectStartApprovalSchema,
  ProjectOperationActor,
  ProjectOperationScope,
} from '../domain/projectOperation';

const listQuerySchema = z.object({ q: z.string().trim().max(200).optional() }).strict();
const deleteSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();
const operationInclude = {
  project: {
    include: {
      manager: true,
      pm: true,
      projectIntake: { include: { estimateRequest: true, commercialDecision: true } },
      pmSchedule: true,
    },
  },
  activities: { where: { deletedAt: null }, orderBy: { occurredAt: 'desc' as const } },
} satisfies Prisma.ProjectOperationInclude;
type OperationWithRelations = Prisma.ProjectOperationGetPayload<{ include: typeof operationInclude }>;
type HttpError = Error & { status?: number; details?: unknown };

const httpError = (message: string, status: number, details?: unknown): HttpError => Object.assign(new Error(message), { status, details });
const parse = (value: string | null): Record<string, unknown> => { try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; } };
const rowsFrom = (value: string) => {
  const parsed = parse(value);
  return Array.isArray(parsed.rows) ? parsed.rows : [];
};
const assignmentsFrom = (operation: OperationWithRelations) => {
  const schedule = operation.project.pmSchedule;
  if (!schedule) return { assignment: {}, rows: [] };
  const assignment = parse(schedule.assignmentsJson);
  const rows = schedule.approvedPlan === 'plan2' ? rowsFrom(schedule.plan2Json) : rowsFrom(schedule.plan1Json);
  return { assignment, rows };
};
const scopeFor = (operation: OperationWithRelations): ProjectOperationScope => {
  const assignments = assignmentsFrom(operation);
  const assignmentIds = Object.values(assignments.assignment).filter((value): value is string => typeof value === 'string' && Boolean(value));
  const rowIds = assignments.rows.map((row) => typeof row === 'object' && row && 'assigneeId' in row ? String(row.assigneeId) : '').filter(Boolean);
  return {
    managerId: operation.project.managerId,
    managerDepartmentId: operation.project.manager.departmentId,
    pmId: operation.project.pmId,
    assignmentIds: [...new Set([...assignmentIds, ...rowIds])],
  };
};
const serialize = (operation: OperationWithRelations, actor: ProjectOperationActor) => {
  const scope = scopeFor(operation);
  const intake = operation.project.projectIntake;
  return {
    ...operation,
    project: { ...operation.project, departmentId: operation.project.manager.departmentId },
    activities: operation.activities.map((activity) => ({ ...activity, metadata: parse(activity.metadataJson) })),
    assignments: assignmentsFrom(operation),
    sourceTrace: {
      canonicalProjectId: operation.projectId,
      projectIntakeId: intake?.id ?? null,
      estimateRequestId: intake?.estimateRequestId ?? null,
      requestNo: intake?.estimateRequest.requestNo ?? null,
      commercialDecisionId: intake?.commercialDecisionId ?? null,
    },
    permissions: {
      canView: canViewProjectOperation(actor, scope),
      canEdit: canEditProjectOperation(actor, scope),
      canApprove: canApproveProjectOperation(actor, scope),
    },
  };
};
const loadOperation = (projectId: string) => prisma.projectOperation.findUniqueOrThrow({ where: { projectId }, include: operationInclude });
const handleError = (res: Response, error: unknown, label: string) => {
  const typed = error as HttpError;
  if (typed.status) return res.status(typed.status).json({ error: typed.message, details: typed.details });
  console.error(`${label} error:`, error);
  return res.status(500).json({ error: 'Internal Server Error' });
};
const claimVersion = async (tx: Prisma.TransactionClient, projectId: string, expectedVersion: number, actorId: string, data: Prisma.ProjectOperationUpdateManyMutationInput = {}) => {
  const claimed = await tx.projectOperation.updateMany({
    where: { projectId, version: expectedVersion },
    data: { ...data, updatedBy: actorId, version: { increment: 1 } },
  });
  if (claimed.count !== 1) throw httpError('Project operation was changed by another user', 409);
};
const audit = (tx: Prisma.TransactionClient, action: string, operationId: string, actorId: string, details: Record<string, unknown>) => tx.auditLog.create({
  data: { action, entityType: 'ProjectOperation', entityId: operationId, actorId, details: JSON.stringify(details) },
});

export const listProjectOperations = async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project operation filters' });
  try {
    const operations = await prisma.projectOperation.findMany({
      where: parsed.data.q ? { project: { name: { contains: parsed.data.q, mode: 'insensitive' } } } : undefined,
      include: operationInclude,
      orderBy: { updatedAt: 'desc' },
    });
    const actor = req.user!;
    res.json(operations.filter((operation) => canViewProjectOperation(actor, scopeFor(operation))).map((operation) => serialize(operation, actor)));
  } catch (error) { handleError(res, error, 'List project operations'); }
};

export const getProjectOperation = async (req: Request, res: Response) => {
  try { res.json(serialize(await loadOperation(String(req.params.projectId)), req.user!)); }
  catch (error) { handleError(res, error, 'Get project operation'); }
};

export const addProjectOperationActivity = async (req: Request, res: Response) => {
  const parsed = projectOperationActivitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project operation activity', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const activity = await tx.projectOperationActivity.create({ data: {
        projectOperationId: projectId,
        kind: parsed.data.kind,
        occurredAt: parsed.data.occurredAt,
        title: parsed.data.title,
        body: parsed.data.body,
        metadataJson: JSON.stringify(parsed.data.metadata),
        createdBy: actor.personnelId,
      } });
      await audit(tx, 'PROJECT_OPERATION_ACTIVITY_ADDED', projectId, actor.personnelId, { activityId: activity.id, kind: activity.kind });
    });
    res.json(serialize(await loadOperation(projectId), actor));
  } catch (error) { handleError(res, error, 'Add project operation activity'); }
};

export const updateProjectOperationMilestones = async (req: Request, res: Response) => {
  const parsed = projectOperationMilestoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project operation milestones', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectOperation.findUnique({ where: { projectId } });
      if (!current) throw httpError('Project operation not found', 404);
      const updates: Prisma.ProjectOperationUpdateManyMutationInput = {};
      if (parsed.data.awardDate !== undefined) updates.awardDate = dateValue(parsed.data.awardDate);
      if (parsed.data.expectedCompletionDate !== undefined) updates.expectedCompletionDate = dateValue(parsed.data.expectedCompletionDate);
      if (parsed.data.actualCompletionDate !== undefined) updates.actualCompletionDate = dateValue(parsed.data.actualCompletionDate);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId, updates);
      const changes = {
        awardDate: parsed.data.awardDate === undefined ? undefined : { from: current.awardDate, to: dateValue(parsed.data.awardDate) },
        expectedCompletionDate: parsed.data.expectedCompletionDate === undefined ? undefined : { from: current.expectedCompletionDate, to: dateValue(parsed.data.expectedCompletionDate) },
        actualCompletionDate: parsed.data.actualCompletionDate === undefined ? undefined : { from: current.actualCompletionDate, to: dateValue(parsed.data.actualCompletionDate) },
        reason: parsed.data.reason,
      };
      const kind = parsed.data.actualCompletionDate !== undefined ? 'COMPLETED' : parsed.data.awardDate !== undefined ? 'AWARD' : 'COMPLETION_CHANGED';
      await tx.projectOperationActivity.create({ data: { projectOperationId: projectId, kind, occurredAt: new Date(), title: kind, body: parsed.data.reason, metadataJson: JSON.stringify(changes), createdBy: actor.personnelId } });
      await audit(tx, 'PROJECT_OPERATION_MILESTONES_UPDATED', projectId, actor.personnelId, changes);
    });
    res.json(serialize(await loadOperation(projectId), actor));
  } catch (error) { handleError(res, error, 'Update project operation milestones'); }
};

export const reviewProjectOperationStart = async (req: Request, res: Response) => {
  const parsed = projectStartApprovalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project start decision', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectOperation.findUnique({ where: { projectId } });
      if (!current) throw httpError('Project operation not found', 404);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId, {
        startApprovalStatus: parsed.data.decision,
        startApprovedBy: actor.personnelId,
        startApprovedAt: new Date(),
      });
      await tx.projectOperationActivity.create({ data: { projectOperationId: projectId, kind: 'START_APPROVAL', occurredAt: new Date(), title: parsed.data.decision, body: parsed.data.note, metadataJson: JSON.stringify({ from: current.startApprovalStatus, to: parsed.data.decision }), createdBy: actor.personnelId } });
      await audit(tx, 'PROJECT_OPERATION_START_REVIEWED', projectId, actor.personnelId, { decision: parsed.data.decision, note: parsed.data.note });
    });
    res.json(serialize(await loadOperation(projectId), actor));
  } catch (error) { handleError(res, error, 'Review project operation start'); }
};

export const deleteProjectOperationActivity = async (req: Request, res: Response) => {
  const parsed = deleteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Expected version is required' });
  try {
    const projectId = String(req.params.projectId);
    const activityId = String(req.params.activityId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const deleted = await tx.projectOperationActivity.updateMany({ where: { id: activityId, projectOperationId: projectId, deletedAt: null }, data: { deletedAt: new Date(), deletedBy: actor.personnelId } });
      if (deleted.count !== 1) throw httpError('Project operation activity not found', 404);
      await audit(tx, 'PROJECT_OPERATION_ACTIVITY_DELETED', projectId, actor.personnelId, { activityId });
    });
    res.json(serialize(await loadOperation(projectId), actor));
  } catch (error) { handleError(res, error, 'Delete project operation activity'); }
};
