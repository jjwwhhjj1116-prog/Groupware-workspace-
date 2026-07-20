import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db';
import {
  ESTIMATE_TEMPLATE_META,
  ESTIMATE_TEMPLATE_TYPES,
  EstimateTemplateType,
  assertVersion,
  nextEstimateSheetStatus,
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
const exportSchema = z.object({
  version: z.number().int().positive(),
  format: z.enum(['XLSX', 'PDF']),
  fileName: z.string().trim().min(1).max(255),
});

const include = {
  template: true,
  versions: { orderBy: { version: 'desc' as const } },
  exports: { orderBy: { createdAt: 'desc' as const } },
};

const serialize = (sheet: any) => sheet ? ({
  ...sheet,
  versions: sheet.versions.map((version: any) => ({
    ...version,
    state: JSON.parse(version.stateJson),
    stateJson: undefined,
  })),
}) : null;

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

export const markEstimateSheetSent = async (req: Request, res: Response) => {
  try {
    const parsed = sentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid estimate sheet state input', details: parsed.error.issues });
    const actor = (req as any).user;
    const current = await prisma.estimateSheet.findUnique({ where: { estimateRequestId: String(req.params.id) } });
    if (!current) return res.status(404).json({ error: 'Estimate sheet not found' });
    assertVersion(parsed.data.expectedVersion, current.currentVersion);
    const status = nextEstimateSheetStatus(current.status, 'SENT');
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
