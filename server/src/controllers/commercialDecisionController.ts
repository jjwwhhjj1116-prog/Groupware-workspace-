import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db';
import {
  COMMERCIAL_DECISIONS,
  assertCommercialDecisionTransition,
  buildProjectIntakeSnapshot,
  commercialDecisionRequiresSentSubmission,
  normalizeAgreedAmount,
} from '../domain/commercialDecision';
import { buildProjectIntakeDraft } from '../domain/projectIntake';

const nullableText = z.string().trim().max(10000).nullable().optional();
const decisionSchema = z.object({
  decision: z.enum(COMMERCIAL_DECISIONS),
  expectedVersion: z.number().int().positive(),
  reason: nullableText,
  agreedAmount: z.union([z.string(), z.number()]).nullable().optional(),
  agreedScope: nullableText,
  agreedSchedule: nullableText,
  startCondition: nullableText,
}).strict();

const requestInclude = {
  owner: true,
  project: true,
  activities: { orderBy: { occurredAt: 'desc' as const } },
  attachments: { orderBy: { createdAt: 'desc' as const } },
  histories: { orderBy: { createdAt: 'desc' as const } },
  commercialDecisions: { orderBy: { decidedAt: 'desc' as const } },
  projectIntake: true,
  estimateSheet: {
    include: { submissions: { orderBy: { sentAt: 'desc' as const } } },
  },
};

type HttpError = Error & { status?: number };

const httpError = (message: string, status: number): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
};

const serializeDecision = <T extends { agreedAmount: { toString(): string } | null }>(decision: T) => ({
  ...decision,
  agreedAmount: decision.agreedAmount?.toString() ?? null,
});

async function loadOutcome(estimateRequestId: string, decisionId: string, idempotent: boolean) {
  const [request, decision, intake] = await Promise.all([
    prisma.estimateRequest.findUniqueOrThrow({ where: { id: estimateRequestId }, include: requestInclude }),
    prisma.commercialDecision.findUniqueOrThrow({ where: { id: decisionId }, include: { project: true } }),
    prisma.projectIntake.findUnique({ where: { commercialDecisionId: decisionId } }),
  ]);
  return { request, decision: serializeDecision(decision), intake, project: decision.project, idempotent };
}

export const recordCommercialDecision = async (req: Request, res: Response) => {
  const idempotencyKey = String(req.header('Idempotency-Key') || '').trim();
  if (!idempotencyKey) return res.status(400).json({ error: 'Idempotency-Key header is required' });
  const parsed = decisionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid commercial decision input', details: parsed.error.issues });
  if (['LOST', 'CANCELLED'].includes(parsed.data.decision) && !parsed.data.reason) {
    return res.status(400).json({ error: 'A reason is required for lost or cancelled decisions' });
  }

  try {
    const requestId = String(req.params.id);
    const actor = req.user!;
    const existing = await prisma.commercialDecision.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.estimateRequestId !== requestId) return res.status(409).json({ error: 'Idempotency key belongs to another estimate request' });
      return res.status(200).json(await loadOutcome(requestId, existing.id, true));
    }

    const agreedAmount = normalizeAgreedAmount(parsed.data.agreedAmount);
    const decisionId = randomUUID();
    const decidedAt = new Date();
    const created = await prisma.$transaction(async (tx) => {
      const current = await tx.estimateRequest.findUnique({ where: { id: requestId }, include: requestInclude });
      if (!current) throw httpError('Estimate request not found', 404);
      if (current.version !== parsed.data.expectedVersion) throw httpError('Estimate request was changed by another user', 409);
      assertCommercialDecisionTransition(current.status, parsed.data.decision, current.projectId);
      if (parsed.data.decision === 'WON' && !current.ownerId) throw httpError('An owner must be assigned before marking the request as won', 400);

      const sentSubmission = current.estimateSheet?.submissions.find((item) => item.status === 'SENT' && item.sentAt) ?? null;
      if (commercialDecisionRequiresSentSubmission(parsed.data.decision) && !sentSubmission) {
        throw httpError('A sent estimate submission is required before this decision', 409);
      }

      let project = null;
      if (parsed.data.decision === 'WON') {
        const owner = await tx.personnelCard.findUnique({ where: { id: current.ownerId! } });
        if (!owner) throw httpError('Assigned owner no longer exists', 409);
        const maxOrder = await tx.project.aggregate({ _max: { orderIndex: true } });
        project = await tx.project.create({
          data: {
            companyId: owner.companyId || 'CON_COST',
            name: current.projectName,
            status: 'INTAKE_RECEIVED',
            managerId: actor.role === 'DEPARTMENT_MANAGER' ? actor.personnelId : current.ownerId!,
            pmId: current.ownerId!,
            orderIndex: (maxOrder._max.orderIndex || 0) + 1,
          },
        });
      }

      const decision = await tx.commercialDecision.create({
        data: {
          id: decisionId,
          estimateRequestId: current.id,
          estimateSheetId: current.estimateSheet?.id ?? null,
          estimateSubmissionId: sentSubmission?.id ?? null,
          projectId: project?.id ?? null,
          idempotencyKey,
          decision: parsed.data.decision,
          reason: parsed.data.reason ?? null,
          agreedAmount,
          agreedScope: parsed.data.agreedScope ?? null,
          agreedSchedule: parsed.data.agreedSchedule ?? null,
          startCondition: parsed.data.startCondition ?? null,
          decidedAt,
          decidedBy: actor.personnelId,
        },
      });

      let intake = null;
      if (project) {
        const snapshot = buildProjectIntakeSnapshot(current, {
          decision: parsed.data.decision,
          decisionId: decision.id,
          estimateSheetId: current.estimateSheet?.id ?? null,
          estimateSubmissionId: sentSubmission?.id ?? null,
          documentHash: sentSubmission?.documentHash ?? null,
          reason: parsed.data.reason ?? null,
          agreedAmount,
          agreedScope: parsed.data.agreedScope ?? null,
          agreedSchedule: parsed.data.agreedSchedule ?? null,
          startCondition: parsed.data.startCondition ?? null,
          decidedAt,
          decidedBy: actor.personnelId,
        });
        intake = await tx.projectIntake.create({
          data: {
            estimateRequestId: current.id,
            commercialDecisionId: decision.id,
            projectId: project.id,
            projectNo: current.requestNo,
            sourceSnapshotJson: JSON.stringify(snapshot),
            draftJson: JSON.stringify(buildProjectIntakeDraft(snapshot, {
              projectId: project.id,
              commercialDecisionId: decision.id,
              projectNo: current.requestNo,
            })),
            createdBy: actor.personnelId,
            updatedBy: actor.personnelId,
            histories: {
              create: {
                action: 'CREATED_FROM_COMMERCIAL_DECISION',
                toStatus: 'DRAFT',
                changesJson: JSON.stringify({ estimateRequestId: current.id, commercialDecisionId: decision.id, projectId: project.id }),
                actorId: actor.personnelId,
              },
            },
          },
        });
      }

      const claimed = await tx.estimateRequest.updateMany({
        where: { id: current.id, version: parsed.data.expectedVersion, projectId: current.projectId },
        data: {
          status: parsed.data.decision,
          projectId: project?.id ?? null,
          updatedBy: actor.personnelId,
          version: { increment: 1 },
        },
      });
      if (claimed.count !== 1) throw httpError('Estimate request was changed by another user', 409);

      const changes = {
        decisionId: decision.id,
        projectId: project?.id ?? null,
        projectIntakeId: intake?.id ?? null,
        estimateSheetId: current.estimateSheet?.id ?? null,
        estimateSubmissionId: sentSubmission?.id ?? null,
        reason: parsed.data.reason ?? null,
      };
      await tx.estimateRequestHistory.create({
        data: {
          estimateRequestId: current.id,
          action: 'COMMERCIAL_DECISION_RECORDED',
          fromStatus: current.status,
          toStatus: parsed.data.decision,
          changes: JSON.stringify(changes),
          actorId: actor.personnelId,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'COMMERCIAL_DECISION_RECORDED',
          entityType: 'EstimateRequest',
          entityId: current.id,
          actorId: actor.personnelId,
          details: JSON.stringify(changes),
        },
      });
      if (project) {
        await tx.auditLog.create({
          data: {
            action: 'ESTIMATE_REQUEST_CONVERTED_TO_PROJECT',
            entityType: 'Project',
            entityId: project.id,
            actorId: actor.personnelId,
            details: JSON.stringify({ estimateRequestId: current.id, commercialDecisionId: decision.id, projectIntakeId: intake!.id }),
          },
        });
      }
      return { decisionId: decision.id };
    });

    res.status(201).json(await loadOutcome(requestId, created.decisionId, false));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const duplicate = await prisma.commercialDecision.findUnique({ where: { idempotencyKey } });
      if (duplicate && duplicate.estimateRequestId === String(req.params.id)) {
        return res.status(200).json(await loadOutcome(duplicate.estimateRequestId, duplicate.id, true));
      }
      return res.status(409).json({ error: 'Commercial decision conflicts with an existing conversion' });
    }
    const status = (error as HttpError).status;
    if (status) return res.status(status).json({ error: (error as Error).message });
    if (error instanceof Error && /already|terminal|on hold/.test(error.message)) {
      return res.status(409).json({ error: error.message });
    }
    if (error instanceof Error && /Agreed amount/.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Record commercial decision error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
