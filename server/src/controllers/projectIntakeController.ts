import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db';
import { emptyPmAssignment, emptyPmPlan, emptyPmRequestTargets } from '../domain/projectPmSchedule';
import { OTHER_COST_CATEGORIES, PROFIT_CATEGORIES } from '../domain/projectProfit';
import {
  buildProjectIntakeDraft,
  canEditProjectIntake,
  canReviewProjectIntake,
  evaluateProjectIntakeCompleteness,
  projectIntakeDraftSchema,
  ProjectIntakeActor,
  ProjectIntakeDraft,
} from '../domain/projectIntake';

const listQuerySchema = z.object({
  status: z.enum(['DRAFT', 'REVIEWED', 'ACCEPTED']).optional(),
  q: z.string().trim().max(200).optional(),
  departmentId: z.string().trim().max(100).optional(),
}).strict();

const saveSchema = z.object({
  expectedVersion: z.number().int().positive(),
  draft: projectIntakeDraftSchema,
}).strict();

const reviewSchema = z.object({
  expectedVersion: z.number().int().positive(),
  draft: projectIntakeDraftSchema,
  note: z.string().trim().max(10000).default(''),
}).strict();

const acceptSchema = z.object({
  expectedVersion: z.number().int().positive(),
  note: z.string().trim().max(10000).default(''),
}).strict();

const intakeInclude = {
  estimateRequest: true,
  commercialDecision: true,
  project: true,
  histories: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ProjectIntakeInclude;

type IntakeWithRelations = Prisma.ProjectIntakeGetPayload<{ include: typeof intakeInclude }>;

type HttpError = Error & { status?: number };
const httpError = (message: string, status: number): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
};

const parseSnapshot = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const parseDraft = (intake: {
  draftJson: string | null;
  sourceSnapshotJson: string;
  projectId: string;
  commercialDecisionId: string;
  projectNo: string;
}): ProjectIntakeDraft => {
  if (intake.draftJson) {
    const parsed = projectIntakeDraftSchema.safeParse(parseSnapshot(intake.draftJson));
    if (parsed.success) return parsed.data;
  }
  return buildProjectIntakeDraft(parseSnapshot(intake.sourceSnapshotJson), intake);
};

const actorScope = (actor: ProjectIntakeActor, intake: IntakeWithRelations) => ({
  actor,
  scope: {
    ownerId: intake.estimateRequest.ownerId,
    departmentId: intake.estimateRequest.departmentId,
  },
});

const serializeIntake = (intake: IntakeWithRelations, actor: ProjectIntakeActor) => {
  const draft = parseDraft(intake);
  const { scope } = actorScope(actor, intake);
  return {
    ...intake,
    commercialDecision: {
      ...intake.commercialDecision,
      agreedAmount: intake.commercialDecision.agreedAmount?.toString() ?? null,
    },
    draft,
    completeness: {
      missing: evaluateProjectIntakeCompleteness(draft),
    },
    permissions: {
      canEdit: canEditProjectIntake(actor, scope) && intake.status !== 'ACCEPTED',
      canReview: canReviewProjectIntake(actor, scope) && intake.status !== 'ACCEPTED',
    },
  };
};

const loadIntake = async (id: string) => prisma.projectIntake.findUniqueOrThrow({
  where: { id },
  include: intakeInclude,
});

const handleError = (res: Response, error: unknown, label: string) => {
  const status = (error as HttpError).status;
  if (status) return res.status(status).json({ error: (error as Error).message });
  console.error(`${label} error:`, error);
  return res.status(500).json({ error: 'Internal Server Error' });
};

export const listProjectIntakes = async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project intake filters' });
  try {
    const actor = req.user!;
    const where: Prisma.ProjectIntakeWhereInput = {};
    if (parsed.data.status) where.status = parsed.data.status;
    const requestFilter: Prisma.EstimateRequestWhereInput = {};
    if (parsed.data.departmentId) requestFilter.departmentId = parsed.data.departmentId;
    if (parsed.data.q) {
      requestFilter.OR = [
        { projectName: { contains: parsed.data.q, mode: 'insensitive' } },
        { company: { contains: parsed.data.q, mode: 'insensitive' } },
        { client: { contains: parsed.data.q, mode: 'insensitive' } },
        { requestNo: { contains: parsed.data.q, mode: 'insensitive' } },
      ];
    }
    if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) {
      if (Object.keys(requestFilter).length) where.estimateRequest = requestFilter;
    } else if (actor.role === 'DEPARTMENT_MANAGER') {
      where.estimateRequest = { ...requestFilter, departmentId: actor.departmentId };
    } else if (actor.role === 'PM') {
      where.AND = [
        Object.keys(requestFilter).length ? { estimateRequest: requestFilter } : {},
        {
          OR: [
            { estimateRequest: { ownerId: actor.personnelId } },
            { estimateRequest: { departmentId: actor.departmentId } },
          ],
        },
      ];
    } else {
      return res.status(403).json({ error: 'Forbidden: project intake list is outside your scope' });
    }
    const intakes = await prisma.projectIntake.findMany({
      where,
      include: intakeInclude,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(intakes.map((intake) => serializeIntake(intake, actor)));
  } catch (error) {
    handleError(res, error, 'List project intakes');
  }
};

export const getProjectIntake = async (req: Request, res: Response) => {
  try {
    const intake = await loadIntake(String(req.params.id));
    res.json(serializeIntake(intake, req.user!));
  } catch (error) {
    handleError(res, error, 'Get project intake');
  }
};

export const saveProjectIntakeDraft = async (req: Request, res: Response) => {
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project intake draft', details: parsed.error.issues });
  try {
    const id = String(req.params.id);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectIntake.findUnique({ where: { id } });
      if (!current) throw httpError('Project intake not found', 404);
      if (current.status === 'ACCEPTED') throw httpError('An accepted project intake is immutable', 409);
      const claimed = await tx.projectIntake.updateMany({
        where: { id, version: parsed.data.expectedVersion },
        data: {
          draftJson: JSON.stringify(parsed.data.draft),
          projectNo: parsed.data.draft.projectNo,
          updatedBy: actor.personnelId,
          version: { increment: 1 },
        },
      });
      if (claimed.count !== 1) throw httpError('Project intake was changed by another user', 409);
      const changes = {
        version: parsed.data.expectedVersion + 1,
        completenessMissing: evaluateProjectIntakeCompleteness(parsed.data.draft),
        contactCount: parsed.data.draft.contacts.length,
        materialCount: parsed.data.draft.materials.length,
        secretReferenceCount: parsed.data.draft.secretReferences.length,
      };
      await tx.projectIntakeHistory.create({
        data: { projectIntakeId: id, action: 'DRAFT_SAVED', fromStatus: current.status, toStatus: current.status, changesJson: JSON.stringify(changes), actorId: actor.personnelId },
      });
      await tx.auditLog.create({
        data: { action: 'PROJECT_INTAKE_DRAFT_SAVED', entityType: 'ProjectIntake', entityId: id, actorId: actor.personnelId, details: JSON.stringify(changes) },
      });
    });
    res.json(serializeIntake(await loadIntake(id), actor));
  } catch (error) {
    handleError(res, error, 'Save project intake draft');
  }
};

export const reviewProjectIntake = async (req: Request, res: Response) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project intake review', details: parsed.error.issues });
  const missing = evaluateProjectIntakeCompleteness(parsed.data.draft);
  if (missing.length) return res.status(422).json({ error: 'Project intake is incomplete', missing });
  try {
    const id = String(req.params.id);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectIntake.findUnique({ where: { id } });
      if (!current) throw httpError('Project intake not found', 404);
      if (current.status === 'ACCEPTED') throw httpError('An accepted project intake is immutable', 409);
      const reviewedAt = new Date();
      const claimed = await tx.projectIntake.updateMany({
        where: { id, version: parsed.data.expectedVersion },
        data: {
          status: 'REVIEWED',
          projectNo: parsed.data.draft.projectNo,
          draftJson: JSON.stringify(parsed.data.draft),
          reviewNote: parsed.data.note,
          reviewedBy: actor.personnelId,
          reviewedAt,
          updatedBy: actor.personnelId,
          version: { increment: 1 },
        },
      });
      if (claimed.count !== 1) throw httpError('Project intake was changed by another user', 409);
      const changes = { version: parsed.data.expectedVersion + 1, note: parsed.data.note, reviewedAt };
      await tx.projectIntakeHistory.create({
        data: { projectIntakeId: id, action: 'REVIEWED', fromStatus: current.status, toStatus: 'REVIEWED', changesJson: JSON.stringify(changes), actorId: actor.personnelId },
      });
      await tx.auditLog.create({
        data: { action: 'PROJECT_INTAKE_REVIEWED', entityType: 'ProjectIntake', entityId: id, actorId: actor.personnelId, details: JSON.stringify(changes) },
      });
    });
    res.json(serializeIntake(await loadIntake(id), actor));
  } catch (error) {
    handleError(res, error, 'Review project intake');
  }
};

export const acceptProjectIntake = async (req: Request, res: Response) => {
  const parsed = acceptSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project intake acceptance' });
  try {
    const id = String(req.params.id);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectIntake.findUnique({ where: { id } });
      if (!current) throw httpError('Project intake not found', 404);
      if (current.status !== 'REVIEWED') throw httpError('A project intake must be reviewed before acceptance', 409);
      const draft = parseDraft(current);
      const missing = evaluateProjectIntakeCompleteness(draft);
      if (missing.length) throw httpError(`Project intake is incomplete: ${missing.join(', ')}`, 422);
      const acceptedAt = new Date();
      const claimed = await tx.projectIntake.updateMany({
        where: { id, version: parsed.data.expectedVersion, status: 'REVIEWED' },
        data: {
          status: 'ACCEPTED',
          reviewNote: parsed.data.note || current.reviewNote,
          acceptedBy: actor.personnelId,
          acceptedAt,
          updatedBy: actor.personnelId,
          version: { increment: 1 },
        },
      });
      if (claimed.count !== 1) throw httpError('Project intake was changed by another user', 409);
      const project = await tx.project.update({ where: { id: current.projectId }, data: { status: 'MANAGER_REVIEW' } });
      const pmSchedule = await tx.projectPmSchedule.upsert({
        where: { projectId: current.projectId },
        create: {
          projectId: current.projectId,
          status: 'PENDING_ASSIGNMENT',
          assignmentsJson: JSON.stringify(emptyPmAssignment(project.pmId)),
          requestTargetsJson: JSON.stringify(emptyPmRequestTargets()),
          plan1Json: JSON.stringify(emptyPmPlan('plan1')),
          plan2Json: JSON.stringify(emptyPmPlan('plan2')),
          createdBy: actor.personnelId,
          updatedBy: actor.personnelId,
        },
        update: {},
      });
      await tx.projectPmScheduleHistory.create({
        data: {
          projectPmScheduleId: pmSchedule.id,
          action: 'CREATED_FROM_PROJECT_INTAKE',
          fromStatus: 'PENDING_ASSIGNMENT',
          toStatus: pmSchedule.status,
          detailsJson: JSON.stringify({ projectIntakeId: id, canonicalProjectId: current.projectId }),
          actorId: actor.personnelId,
        },
      });
      const expectedCompletionDate = /^\d{4}-\d{2}-\d{2}$/.test(draft.finalDelivery || '')
        ? new Date(`${draft.finalDelivery}T00:00:00.000Z`)
        : null;
      await tx.projectOperation.upsert({
        where: { projectId: current.projectId },
        create: {
          id: current.projectId,
          projectId: current.projectId,
          expectedCompletionDate,
          createdBy: actor.personnelId,
          updatedBy: actor.personnelId,
        },
        update: {},
      });
      await tx.projectQcChecklist.upsert({
        where: { projectId: current.projectId },
        create: {
          id: current.projectId,
          projectId: current.projectId,
          createdBy: actor.personnelId,
          updatedBy: actor.personnelId,
        },
        update: {},
      });
      await tx.projectDeliveryWorkspace.upsert({
        where: { projectId: current.projectId },
        create: {
          id: current.projectId,
          projectId: current.projectId,
          createdBy: actor.personnelId,
          updatedBy: actor.personnelId,
        },
        update: {},
      });
      const [commercialDecision, unitPriceTable] = await Promise.all([
        tx.commercialDecision.findUnique({ where: { id: current.commercialDecisionId } }),
        tx.unitPriceTable.findFirst({ where: { active: true }, orderBy: [{ effectiveDate: 'desc' }, { version: 'desc' }] }),
      ]);
      await tx.projectProfitAnalysis.upsert({
        where: { projectId: current.projectId },
        create: {
          id: current.projectId,
          projectId: current.projectId,
          sourceCommercialDecisionId: current.commercialDecisionId,
          unitPriceTableId: unitPriceTable?.id,
          createdBy: actor.personnelId,
          updatedBy: actor.personnelId,
        },
        update: {},
      });
      await tx.projectProfitRound.createMany({
        data: [1, 2, 3].map((roundNo) => ({ projectProfitAnalysisId: current.projectId, roundNo })),
        skipDuplicates: true,
      });
      await tx.profitContractAmount.createMany({
        data: PROFIT_CATEGORIES.map((category) => ({
          projectProfitAnalysisId: current.projectId,
          category,
          amount: category === 'STRUCTURE' ? commercialDecision?.agreedAmount || 0 : 0,
          sourceType: category === 'STRUCTURE' && commercialDecision?.agreedAmount ? 'COMMERCIAL_DECISION' : 'MANUAL',
          sourceRef: category === 'STRUCTURE' && commercialDecision?.agreedAmount ? current.commercialDecisionId : null,
        })),
        skipDuplicates: true,
      });
      const profitRounds = await tx.projectProfitRound.findMany({ where: { projectProfitAnalysisId: current.projectId } });
      await tx.projectProfitOtherCost.createMany({
        data: profitRounds.flatMap((round) => OTHER_COST_CATEGORIES.map((category) => ({ projectProfitRoundId: round.id, category, amount: 0, sourceType: 'MANUAL' }))),
        skipDuplicates: true,
      });
      const changes = { version: parsed.data.expectedVersion + 1, note: parsed.data.note, acceptedAt, projectStatus: 'MANAGER_REVIEW' };
      await tx.projectIntakeHistory.create({
        data: { projectIntakeId: id, action: 'ACCEPTED', fromStatus: current.status, toStatus: 'ACCEPTED', changesJson: JSON.stringify(changes), actorId: actor.personnelId },
      });
      await tx.auditLog.create({
        data: { action: 'PROJECT_INTAKE_ACCEPTED', entityType: 'ProjectIntake', entityId: id, actorId: actor.personnelId, details: JSON.stringify(changes) },
      });
    });
    res.json(serializeIntake(await loadIntake(id), actor));
  } catch (error) {
    handleError(res, error, 'Accept project intake');
  }
};
