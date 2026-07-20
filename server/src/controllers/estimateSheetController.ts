import { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/db';
import {
  ESTIMATE_TEMPLATE_META,
  ESTIMATE_TEMPLATE_TYPES,
  EstimateTemplateType,
  ESTIMATE_SUBMISSION_STATUSES,
  assertVersion,
  nextEstimateSheetStatus,
  submissionIsDecisionReady,
} from '../domain/estimateSheet';

const cellSchema = z.object({
  value: z.union([z.string(), z.number(), z.null()]).optional(),
  formula: z.string().optional(),
  userFormula: z.boolean().optional(),
}).passthrough();

const stateSchema = z.object({
  type: z.enum(ESTIMATE_TEMPLATE_TYPES),
  cells: z.record(z.string(), cellSchema),
  maxRow: z.number().int().min(1).max(500),
  maxCol: z.number().int().min(1).max(100),
  rowHeights: z.array(z.number().positive()).max(500),
  colWidths: z.array(z.number().positive()).max(100),
  merges: z.array(z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()])).max(1000),
}).passthrough();

const createSchema = z.object({
  templateType: z.enum(ESTIMATE_TEMPLATE_TYPES),
  templateHash: z.string().length(64),
  state: stateSchema,
});

const saveSchema = z.object({
  expectedVersion: z.number().int().positive(),
  templateHash: z.string().length(64),
  state: stateSchema,
});

const sentSchema = z.object({ expectedVersion: z.number().int().positive() });
const submissionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  recipient: z.string().trim().max(240).nullable().optional(),
  deliveryChannel: z.string().trim().max(80).nullable().optional(),
});
const revisionSchema = z.object({ expectedVersion: z.number().int().positive() });
const exportSchema = z.object({
  version: z.number().int().positive(),
  format: z.enum(['XLSX', 'PDF']),
  fileName: z.string().trim().min(1).max(255),
});

const include = {
  template: true,
  versions: { orderBy: { version: 'desc' as const } },
  exports: { orderBy: { createdAt: 'desc' as const } },
  submissions: { orderBy: { submittedAt: 'desc' as const } },
};

const serialize = (sheet: any) => sheet ? ({
  ...sheet,
  versions: sheet.versions.map((version: any) => ({
    ...version,
    state: JSON.parse(version.stateJson),
    stateJson: undefined,
  })),
  submissions: (sheet.submissions || []).map((submission: any) => ({
    ...submission,
    summary: JSON.parse(submission.summaryJson),
    summaryJson: undefined,
  })),
}) : null;

const cellText = (state: any, key: string) => {
  const cell = state?.cells?.[key];
  const value = cell?.value;
  return value === null || value === undefined ? '' : String(value);
};

const submissionSnapshot = (request: any, sheet: any, version: any) => {
  const state = JSON.parse(version.stateJson);
  return {
    requestNo: request.requestNo,
    projectName: cellText(state, '6:2') || request.projectName,
    company: cellText(state, '5:2') || request.company || request.client || '',
    serviceDescription: cellText(state, '7:2'),
    total: cellText(state, '10:2'),
    templateType: sheet.templateType,
    version: version.version,
  };
};

const serializeSubmissionListItem = (submission: any) => ({
  id: submission.id,
  estimateSheetId: submission.estimateSheetId,
  estimateRequestId: submission.estimateSheet.estimateRequestId,
  requestNo: submission.estimateSheet.estimateRequest.requestNo,
  projectName: submission.estimateSheet.estimateRequest.projectName,
  company: submission.estimateSheet.estimateRequest.company || submission.estimateSheet.estimateRequest.client,
  ownerId: submission.estimateSheet.estimateRequest.ownerId,
  departmentId: submission.estimateSheet.estimateRequest.departmentId,
  requestStatus: submission.estimateSheet.estimateRequest.status,
  templateType: submission.estimateSheet.templateType,
  version: submission.version,
  status: submission.status,
  submittedAt: submission.submittedAt,
  submittedBy: submission.submittedBy,
  sentAt: submission.sentAt,
  sentBy: submission.sentBy,
  recipient: submission.recipient,
  deliveryChannel: submission.deliveryChannel,
  documentHash: submission.documentHash,
  summary: JSON.parse(submission.summaryJson),
  decisionReady: submissionIsDecisionReady(submission.status),
});

const validateTemplate = (type: EstimateTemplateType, hash: string) => {
  const expected = ESTIMATE_TEMPLATE_META[type].sourceHash;
  if (hash !== expected) {
    const error = new Error('Template source hash does not match the approved legacy baseline') as Error & { status?: number };
    error.status = 400;
    throw error;
  }
};

const sendError = (res: Response, error: unknown, label: string) => {
  console.error(label, error);
  const status = (error as any)?.status || 500;
  res.status(status).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
};

export const getEstimateSheet = async (req: Request, res: Response) => {
  try {
    const sheet = await prisma.estimateSheet.findUnique({
      where: { estimateRequestId: String(req.params.id) },
      include,
    });
    res.status(200).json(serialize(sheet));
  } catch (error) {
    sendError(res, error, 'Get estimate sheet error:');
  }
};

export const createEstimateSheet = async (req: Request, res: Response) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid estimate sheet input', details: parsed.error.issues });
    const actor = (req as any).user;
    const estimateRequest = (req as any).estimateRequest;
    const { templateType, templateHash, state } = parsed.data;
    validateTemplate(templateType, templateHash);
    if (state.type !== templateType) return res.status(400).json({ error: 'Template type and state type must match' });

    const idempotencyKey = String(req.header('Idempotency-Key') || '').trim() || null;
    if (idempotencyKey) {
      const existing = await prisma.estimateSheet.findUnique({ where: { idempotencyKey }, include });
      if (existing && existing.estimateRequestId !== estimateRequest.id) {
        return res.status(409).json({ error: 'Idempotency key belongs to another estimate request' });
      }
      if (existing) return res.status(200).json(serialize(existing));
    }

    const sheet = await prisma.$transaction(async (tx) => {
      const existing = await tx.estimateSheet.findUnique({ where: { estimateRequestId: estimateRequest.id }, include });
      if (existing) return existing;
      const meta = ESTIMATE_TEMPLATE_META[templateType];
      const template = await tx.estimateTemplate.upsert({
        where: { type: templateType },
        create: { type: templateType, sheetName: meta.sheetName, sourceHash: meta.sourceHash },
        update: { sheetName: meta.sheetName, sourceHash: meta.sourceHash, active: true },
      });
      const created = await tx.estimateSheet.create({
        data: {
          estimateRequestId: estimateRequest.id,
          templateId: template.id,
          templateType,
          idempotencyKey,
          createdBy: actor.personnelId,
          updatedBy: actor.personnelId,
          versions: {
            create: {
              version: 1,
              templateVersion: template.version,
              templateHash,
              stateJson: JSON.stringify(state),
              createdBy: actor.personnelId,
            },
          },
        },
        include,
      });
      await tx.estimateRequest.update({
        where: { id: estimateRequest.id },
        data: {
          estimateId: created.id,
          estimateType: templateType,
          status: estimateRequest.status === 'REQUEST_MEMO' ? 'ESTIMATE_DRAFTING' : estimateRequest.status,
          version: { increment: 1 },
          updatedBy: actor.personnelId,
        },
      });
      await tx.estimateRequestHistory.create({
        data: { estimateRequestId: estimateRequest.id, action: 'ESTIMATE_SHEET_CREATED', changes: JSON.stringify({ estimateSheetId: created.id, templateType }), actorId: actor.personnelId },
      });
      await tx.auditLog.create({ data: { action: 'ESTIMATE_SHEET_CREATED', entityType: 'EstimateSheet', entityId: created.id, actorId: actor.personnelId, details: JSON.stringify({ estimateRequestId: estimateRequest.id, templateType, version: 1 }) } });
      return created;
    });
    res.status(201).json(serialize(sheet));
  } catch (error) {
    sendError(res, error, 'Create estimate sheet error:');
  }
};

export const saveEstimateSheetVersion = async (req: Request, res: Response) => {
  try {
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid estimate sheet version input', details: parsed.error.issues });
    const actor = (req as any).user;
    const { expectedVersion, templateHash, state } = parsed.data;
    const current = await prisma.estimateSheet.findUnique({ where: { estimateRequestId: String(req.params.id) }, include: { template: true } });
    if (!current) return res.status(404).json({ error: 'Estimate sheet not found' });
    assertVersion(expectedVersion, current.currentVersion);
    if (current.status !== 'DRAFT') return res.status(409).json({ error: 'Sent estimate sheets are immutable' });
    if (state.type !== current.templateType) return res.status(400).json({ error: 'Template type cannot change after creation' });
    validateTemplate(state.type, templateHash);

    const nextVersion = current.currentVersion + 1;
    const sheet = await prisma.$transaction(async (tx) => {
      const claimed = await tx.estimateSheet.updateMany({
        where: { id: current.id, currentVersion: expectedVersion, status: 'DRAFT' },
        data: { currentVersion: nextVersion, updatedBy: actor.personnelId },
      });
      if (claimed.count !== 1) {
        const error = new Error('Version conflict while saving estimate sheet') as Error & { status?: number };
        error.status = 409;
        throw error;
      }
      await tx.estimateSheetVersion.create({ data: {
        estimateSheetId: current.id,
        version: nextVersion,
        templateVersion: current.template.version,
        templateHash,
        stateJson: JSON.stringify(state),
        createdBy: actor.personnelId,
      } });
      const updated = await tx.estimateSheet.findUniqueOrThrow({ where: { id: current.id }, include });
      await tx.auditLog.create({ data: { action: 'ESTIMATE_SHEET_VERSION_CREATED', entityType: 'EstimateSheet', entityId: current.id, actorId: actor.personnelId, details: JSON.stringify({ version: nextVersion }) } });
      return updated;
    });
    res.status(200).json(serialize(sheet));
  } catch (error) {
    sendError(res, error, 'Save estimate sheet version error:');
  }
};

export const listEstimateSubmissions = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!['PM', 'DEPARTMENT_MANAGER', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) {
      return res.status(403).json({ error: 'Forbidden: estimate submissions are not available for this role' });
    }
    const status = String(req.query.status || '').trim();
    const templateType = String(req.query.templateType || '').trim();
    const q = String(req.query.q || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    if (status && !(ESTIMATE_SUBMISSION_STATUSES as readonly string[]).includes(status)) {
      return res.status(400).json({ error: 'Invalid estimate submission status' });
    }
    const privileged = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
    const requestScope = privileged ? {} : {
      OR: [{ departmentId: actor.departmentId }, { ownerId: actor.personnelId }],
    };
    const submittedAt: { gte?: Date; lte?: Date } = {};
    if (from) submittedAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) submittedAt.lte = new Date(`${to}T23:59:59.999Z`);
    if ((submittedAt.gte && Number.isNaN(submittedAt.gte.getTime())) || (submittedAt.lte && Number.isNaN(submittedAt.lte.getTime()))) {
      return res.status(400).json({ error: 'Invalid submission date range' });
    }
    const requestSearch = q ? {
      OR: [
        { requestNo: { contains: q, mode: 'insensitive' as const } },
        { projectName: { contains: q, mode: 'insensitive' as const } },
        { company: { contains: q, mode: 'insensitive' as const } },
        { client: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {};
    const submissions = await prisma.estimateSubmission.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(Object.keys(submittedAt).length ? { submittedAt } : {}),
        estimateSheet: {
          ...(templateType ? { templateType } : {}),
          estimateRequest: { AND: [requestScope, requestSearch] },
        },
      },
      include: { estimateSheet: { include: { estimateRequest: true } } },
      orderBy: { submittedAt: 'desc' },
    });
    res.status(200).json(submissions.map(serializeSubmissionListItem));
  } catch (error) {
    sendError(res, error, 'List estimate submissions error:');
  }
};

export const submitEstimateSheet = async (req: Request, res: Response) => {
  try {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid estimate submission input', details: parsed.error.issues });
    const actor = (req as any).user;
    const estimateRequest = (req as any).estimateRequest;
    if (['WON', 'LOST', 'CANCELLED'].includes(estimateRequest.status)) {
      return res.status(409).json({ error: 'A terminal estimate request cannot be submitted' });
    }
    const current = await prisma.estimateSheet.findUnique({
      where: { estimateRequestId: String(req.params.id) },
      include: { versions: true, submissions: true },
    });
    if (!current) return res.status(404).json({ error: 'Estimate sheet not found' });
    assertVersion(parsed.data.expectedVersion, current.currentVersion);
    const existing = current.submissions.find((item) => item.version === current.currentVersion);
    if (existing) {
      const sheet = await prisma.estimateSheet.findUniqueOrThrow({ where: { id: current.id }, include });
      return res.status(200).json(serialize(sheet));
    }
    const status = nextEstimateSheetStatus(current.status, 'SUBMITTED');
    const version = current.versions.find((item) => item.version === current.currentVersion);
    if (!version) return res.status(409).json({ error: 'Current estimate sheet version is missing' });
    const summary = submissionSnapshot(estimateRequest, current, version);
    const documentHash = createHash('sha256').update(version.stateJson).digest('hex');
    const sheet = await prisma.$transaction(async (tx) => {
      const claimed = await tx.estimateSheet.updateMany({
        where: { id: current.id, currentVersion: parsed.data.expectedVersion, status: 'DRAFT' },
        data: { status, updatedBy: actor.personnelId },
      });
      if (claimed.count !== 1) {
        const error = new Error('Version conflict while submitting estimate sheet') as Error & { status?: number };
        error.status = 409;
        throw error;
      }
      await tx.estimateSubmission.create({ data: {
        estimateSheetId: current.id,
        version: current.currentVersion,
        submittedBy: actor.personnelId,
        recipient: parsed.data.recipient || summary.company || null,
        deliveryChannel: parsed.data.deliveryChannel || null,
        documentHash,
        summaryJson: JSON.stringify(summary),
      } });
      await tx.estimateRequestHistory.create({ data: { estimateRequestId: current.estimateRequestId, action: 'ESTIMATE_SHEET_SUBMITTED', changes: JSON.stringify({ estimateSheetId: current.id, version: current.currentVersion, documentHash }), actorId: actor.personnelId } });
      await tx.auditLog.create({ data: { action: 'ESTIMATE_SHEET_SUBMITTED', entityType: 'EstimateSheet', entityId: current.id, actorId: actor.personnelId, details: JSON.stringify({ version: current.currentVersion, documentHash }) } });
      return tx.estimateSheet.findUniqueOrThrow({ where: { id: current.id }, include });
    });
    res.status(201).json(serialize(sheet));
  } catch (error) {
    sendError(res, error, 'Submit estimate sheet error:');
  }
};

export const sendEstimateSubmission = async (req: Request, res: Response) => {
  try {
    const parsed = sentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid estimate submission send input', details: parsed.error.issues });
    const actor = (req as any).user;
    const estimateRequest = (req as any).estimateRequest;
    if (['WON', 'LOST', 'CANCELLED'].includes(estimateRequest.status)) {
      return res.status(409).json({ error: 'A terminal estimate request cannot be sent' });
    }
    const current = await prisma.estimateSheet.findUnique({
      where: { estimateRequestId: String(req.params.id) },
      include: { submissions: true },
    });
    if (!current) return res.status(404).json({ error: 'Estimate sheet not found' });
    assertVersion(parsed.data.expectedVersion, current.currentVersion);
    const submission = current.submissions.find((item) => item.id === String(req.params.submissionId));
    if (!submission || submission.version !== current.currentVersion) {
      return res.status(404).json({ error: 'Current estimate submission not found' });
    }
    if (submission.status === 'SENT' && current.status === 'SENT') {
      const sheet = await prisma.estimateSheet.findUniqueOrThrow({ where: { id: current.id }, include });
      return res.status(200).json(serialize(sheet));
    }
    const status = nextEstimateSheetStatus(current.status, 'SENT');
    const sentAt = new Date();
    const sheet = await prisma.$transaction(async (tx) => {
      const claimedSheet = await tx.estimateSheet.updateMany({
        where: { id: current.id, currentVersion: parsed.data.expectedVersion, status: 'SUBMITTED' },
        data: { status, updatedBy: actor.personnelId },
      });
      const claimedSubmission = await tx.estimateSubmission.updateMany({
        where: { id: submission.id, estimateSheetId: current.id, version: current.currentVersion, status: 'SUBMITTED' },
        data: { status: 'SENT', sentAt, sentBy: actor.personnelId },
      });
      if (claimedSheet.count !== 1 || claimedSubmission.count !== 1) {
        const error = new Error('Version conflict while sending estimate submission') as Error & { status?: number };
        error.status = 409;
        throw error;
      }
      await tx.estimateRequest.update({ where: { id: current.estimateRequestId }, data: { status: 'WAITING', version: { increment: 1 }, updatedBy: actor.personnelId } });
      await tx.estimateRequestHistory.create({ data: { estimateRequestId: current.estimateRequestId, action: 'ESTIMATE_SHEET_SENT', changes: JSON.stringify({ estimateSheetId: current.id, version: current.currentVersion, submissionId: submission.id }), actorId: actor.personnelId } });
      await tx.auditLog.create({ data: { action: 'ESTIMATE_SHEET_SENT', entityType: 'EstimateSubmission', entityId: submission.id, actorId: actor.personnelId, details: JSON.stringify({ estimateSheetId: current.id, version: current.currentVersion }) } });
      return tx.estimateSheet.findUniqueOrThrow({ where: { id: current.id }, include });
    });
    res.status(200).json(serialize(sheet));
  } catch (error) {
    sendError(res, error, 'Send estimate submission error:');
  }
};

export const createEstimateSheetRevision = async (req: Request, res: Response) => {
  try {
    const parsed = revisionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid estimate revision input', details: parsed.error.issues });
    const actor = (req as any).user;
    const estimateRequest = (req as any).estimateRequest;
    if (['WON', 'LOST', 'CANCELLED'].includes(estimateRequest.status)) {
      return res.status(409).json({ error: 'A terminal estimate request cannot start a revision' });
    }
    const current = await prisma.estimateSheet.findUnique({
      where: { estimateRequestId: String(req.params.id) },
      include: { versions: true },
    });
    if (!current) return res.status(404).json({ error: 'Estimate sheet not found' });
    assertVersion(parsed.data.expectedVersion, current.currentVersion);
    if (current.status !== 'SENT') return res.status(409).json({ error: 'A new send version can only start from a sent estimate sheet' });
    const source = current.versions.find((item) => item.version === current.currentVersion);
    if (!source) return res.status(409).json({ error: 'Current estimate sheet version is missing' });
    const nextVersion = current.currentVersion + 1;
    const sheet = await prisma.$transaction(async (tx) => {
      const claimed = await tx.estimateSheet.updateMany({
        where: { id: current.id, currentVersion: parsed.data.expectedVersion, status: 'SENT' },
        data: { status: 'DRAFT', currentVersion: nextVersion, updatedBy: actor.personnelId },
      });
      if (claimed.count !== 1) {
        const error = new Error('Version conflict while creating estimate revision') as Error & { status?: number };
        error.status = 409;
        throw error;
      }
      await tx.estimateSheetVersion.create({ data: {
        estimateSheetId: current.id,
        version: nextVersion,
        templateVersion: source.templateVersion,
        templateHash: source.templateHash,
        stateJson: source.stateJson,
        createdBy: actor.personnelId,
      } });
      await tx.estimateRequest.update({ where: { id: current.estimateRequestId }, data: { status: 'ESTIMATE_DRAFTING', version: { increment: 1 }, updatedBy: actor.personnelId } });
      await tx.estimateRequestHistory.create({ data: { estimateRequestId: current.estimateRequestId, action: 'ESTIMATE_SHEET_REVISION_STARTED', changes: JSON.stringify({ estimateSheetId: current.id, fromVersion: current.currentVersion, toVersion: nextVersion }), actorId: actor.personnelId } });
      await tx.auditLog.create({ data: { action: 'ESTIMATE_SHEET_REVISION_STARTED', entityType: 'EstimateSheet', entityId: current.id, actorId: actor.personnelId, details: JSON.stringify({ fromVersion: current.currentVersion, toVersion: nextVersion }) } });
      return tx.estimateSheet.findUniqueOrThrow({ where: { id: current.id }, include });
    });
    res.status(201).json(serialize(sheet));
  } catch (error) {
    sendError(res, error, 'Create estimate sheet revision error:');
  }
};

export const markEstimateSheetSent = async (req: Request, res: Response) => {
  try {
    const parsed = sentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid estimate sheet state input', details: parsed.error.issues });
    const actor = (req as any).user;
    const estimateRequest = (req as any).estimateRequest;
    if (['WON', 'LOST', 'CANCELLED'].includes(estimateRequest.status)) {
      return res.status(409).json({ error: 'A terminal estimate request cannot be sent' });
    }
    const current = await prisma.estimateSheet.findUnique({ where: { estimateRequestId: String(req.params.id) } });
    if (!current) return res.status(404).json({ error: 'Estimate sheet not found' });
    assertVersion(parsed.data.expectedVersion, current.currentVersion);
    const status = nextEstimateSheetStatus(current.status, 'SENT');
    const version = await prisma.estimateSheetVersion.findUnique({ where: { estimateSheetId_version: { estimateSheetId: current.id, version: current.currentVersion } } });
    if (!version) return res.status(409).json({ error: 'Current estimate sheet version is missing' });
    const summary = submissionSnapshot(estimateRequest, current, version);
    const documentHash = createHash('sha256').update(version.stateJson).digest('hex');
    const sheet = await prisma.$transaction(async (tx) => {
      const claimed = await tx.estimateSheet.updateMany({
        where: { id: current.id, currentVersion: parsed.data.expectedVersion, status: 'DRAFT' },
        data: { status, updatedBy: actor.personnelId },
      });
      if (claimed.count !== 1) {
        const error = new Error('Version conflict while sending estimate sheet') as Error & { status?: number };
        error.status = 409;
        throw error;
      }
      await tx.estimateSubmission.upsert({
        where: { estimateSheetId_version: { estimateSheetId: current.id, version: current.currentVersion } },
        create: {
          estimateSheetId: current.id,
          version: current.currentVersion,
          status: 'SENT',
          submittedBy: actor.personnelId,
          sentAt: new Date(),
          sentBy: actor.personnelId,
          recipient: summary.company || null,
          documentHash,
          summaryJson: JSON.stringify(summary),
        },
        update: { status: 'SENT', sentAt: new Date(), sentBy: actor.personnelId },
      });
      const updated = await tx.estimateSheet.findUniqueOrThrow({ where: { id: current.id }, include });
      await tx.estimateRequest.update({ where: { id: current.estimateRequestId }, data: { status: 'WAITING', version: { increment: 1 }, updatedBy: actor.personnelId } });
      await tx.estimateRequestHistory.create({ data: { estimateRequestId: current.estimateRequestId, action: 'ESTIMATE_SHEET_SENT', changes: JSON.stringify({ estimateSheetId: current.id, version: current.currentVersion }), actorId: actor.personnelId } });
      await tx.auditLog.create({ data: { action: 'ESTIMATE_SHEET_SENT', entityType: 'EstimateSheet', entityId: current.id, actorId: actor.personnelId, details: JSON.stringify({ version: current.currentVersion }) } });
      return updated;
    });
    res.status(200).json(serialize(sheet));
  } catch (error) {
    sendError(res, error, 'Send estimate sheet error:');
  }
};

export const recordEstimateSheetExport = async (req: Request, res: Response) => {
  try {
    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid estimate export input', details: parsed.error.issues });
    const actor = (req as any).user;
    const current = await prisma.estimateSheet.findUnique({ where: { estimateRequestId: String(req.params.id) } });
    if (!current) return res.status(404).json({ error: 'Estimate sheet not found' });
    const version = await prisma.estimateSheetVersion.findUnique({ where: { estimateSheetId_version: { estimateSheetId: current.id, version: parsed.data.version } } });
    if (!version) return res.status(404).json({ error: 'Estimate sheet version not found' });
    const exported = await prisma.$transaction(async (tx) => {
      const record = await tx.estimateSheetExport.create({ data: { estimateSheetId: current.id, ...parsed.data, actorId: actor.personnelId } });
      await tx.auditLog.create({ data: { action: `ESTIMATE_SHEET_EXPORTED_${parsed.data.format}`, entityType: 'EstimateSheet', entityId: current.id, actorId: actor.personnelId, details: JSON.stringify(parsed.data) } });
      return record;
    });
    res.status(201).json(exported);
  } catch (error) {
    sendError(res, error, 'Record estimate sheet export error:');
  }
};
