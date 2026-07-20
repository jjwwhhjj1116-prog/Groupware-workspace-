import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db';
import {
  ESTIMATE_REQUEST_ACTIVITY_KINDS,
  ESTIMATE_REQUEST_STATUSES,
  buildRequestNumber,
  canCreateEstimateRequest,
  canViewEstimateRequest,
  normalizeEstimateRequestStatus,
} from '../domain/estimateRequest';

const nullableText = z.string().trim().max(5000).nullable().optional();
const requestFields = {
  projectName: z.string().trim().min(1).max(240),
  company: nullableText,
  client: nullableText,
  contact: nullableText,
  contactDepartment: nullableText,
  phone: nullableText,
  email: z.string().trim().email().nullable().optional().or(z.literal('')),
  ownerId: z.string().trim().nullable().optional(),
  departmentId: z.string().trim().min(1).optional(),
  requestDate: z.coerce.date().optional(),
  memo: nullableText,
  rawMemo: nullableText,
  firstDelivery: nullableText,
  secondDelivery: nullableText,
  thirdDelivery: nullableText,
  finalDelivery: nullableText,
  expectedStartDate: nullableText,
  areaPy: nullableText,
  floors: nullableText,
  scope: nullableText,
  usage: nullableText,
  buildingCount: nullableText,
  unitWork: nullableText,
  bidDate: nullableText,
  estimateType: nullableText,
  estimateId: nullableText,
};

const createSchema = z.object({
  ...requestFields,
  requestNo: z.string().trim().min(1).max(80).optional(),
  status: z.enum(ESTIMATE_REQUEST_STATUSES).optional(),
});

const updateSchema = createSchema
  .omit({ requestNo: true, status: true })
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict();

const statusSchema = z.object({
  status: z.enum(ESTIMATE_REQUEST_STATUSES),
  version: z.number().int().positive(),
});

const activitySchema = z.object({
  kind: z.enum(ESTIMATE_REQUEST_ACTIVITY_KINDS),
  content: z.string().trim().min(1).max(10000),
  occurredAt: z.coerce.date().optional(),
});

const attachmentSchema = z.object({
  category: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  originalName: z.string().trim().min(1).max(255),
  size: z.number().int().min(0).max(2_147_483_647),
  mimeType: z.string().trim().max(160).nullable().optional(),
  memo: nullableText,
  storageKey: z.string().trim().max(500).nullable().optional(),
});

const detailInclude = {
  owner: true,
  project: true,
  activities: { orderBy: { occurredAt: 'desc' as const } },
  attachments: { orderBy: { createdAt: 'desc' as const } },
  histories: { orderBy: { createdAt: 'desc' as const } },
};

const audit = (actorId: string, action: string, entityId: string, details: unknown) => ({
  action,
  entityType: 'EstimateRequest',
  entityId,
  actorId,
  details: JSON.stringify(details),
});

const changedFields = (before: Record<string, unknown>, updates: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(updates).filter(([key, value]) => before[key] !== value));

export const listEstimateRequests = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!['PM', 'DEPARTMENT_MANAGER', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) {
      return res.status(403).json({ error: 'Forbidden: estimate requests are not available for this role' });
    }

    const status = req.query.status ? normalizeEstimateRequestStatus(req.query.status) : undefined;
    const q = String(req.query.q || '').trim();
    const ownerId = String(req.query.ownerId || '').trim();
    const privileged = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
    const filters: Record<string, unknown>[] = [];
    if (!privileged) filters.push({ OR: [{ departmentId: actor.departmentId }, { ownerId: actor.personnelId }] });
    if (status) filters.push({ status });
    if (ownerId) filters.push({ ownerId });
    if (q) filters.push({
      OR: [
        { requestNo: { contains: q, mode: 'insensitive' as const } },
        { projectName: { contains: q, mode: 'insensitive' as const } },
        { company: { contains: q, mode: 'insensitive' as const } },
        { client: { contains: q, mode: 'insensitive' as const } },
        { contact: { contains: q, mode: 'insensitive' as const } },
      ],
    });

    const requests = await prisma.estimateRequest.findMany({
      where: filters.length ? { AND: filters } : {},
      include: detailInclude,
      orderBy: { updatedAt: 'desc' },
    });
    res.status(200).json(requests);
  } catch (error) {
    console.error('List estimate requests error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getEstimateRequest = async (req: Request, res: Response) => {
  try {
    const request = await prisma.estimateRequest.findUnique({
      where: { id: String(req.params.id) },
      include: detailInclude,
    });
    if (!request) return res.status(404).json({ error: 'Estimate request not found' });
    if (!canViewEstimateRequest((req as any).user, request)) {
      return res.status(403).json({ error: 'Forbidden: estimate request is outside your scope' });
    }
    res.status(200).json(request);
  } catch (error) {
    console.error('Get estimate request error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createEstimateRequest = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!canCreateEstimateRequest(actor)) {
      return res.status(403).json({ error: 'Forbidden: cannot create estimate requests' });
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });

    const idempotencyKey = String(req.header('Idempotency-Key') || '').trim() || null;
    if (idempotencyKey) {
      const existing = await prisma.estimateRequest.findUnique({
        where: { idempotencyKey },
        include: detailInclude,
      });
      if (existing) return res.status(200).json(existing);
    }

    const data = parsed.data;
    const departmentId = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)
      ? data.departmentId || actor.departmentId
      : actor.departmentId;
    const ownerId = data.ownerId ?? (actor.role === 'PM' ? actor.personnelId : null);
    const requestNo = data.requestNo || buildRequestNumber();
    if (ownerId) {
      const owner = await prisma.personnelCard.findUnique({ where: { id: ownerId } });
      if (!owner) return res.status(400).json({ error: 'Assigned owner does not exist' });
      if (!['PM', 'DEPARTMENT_MANAGER'].includes(owner.role)) {
        return res.status(400).json({ error: 'Assigned owner must have a PM-capable role' });
      }
      if (!['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role) && owner.departmentId !== departmentId) {
        return res.status(403).json({ error: 'Forbidden: owner must belong to your department' });
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const request = await tx.estimateRequest.create({
        data: {
          ...data,
          email: data.email || null,
          requestNo,
          idempotencyKey,
          departmentId,
          ownerId,
          status: normalizeEstimateRequestStatus(data.status),
          createdBy: actor.personnelId,
          updatedBy: actor.personnelId,
        },
      });
      await tx.estimateRequestHistory.create({
        data: { estimateRequestId: request.id, action: 'CREATED', toStatus: request.status, actorId: actor.personnelId },
      });
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_REQUEST_CREATE', request.id, { requestNo }) });
      return tx.estimateRequest.findUniqueOrThrow({ where: { id: request.id }, include: detailInclude });
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('Create estimate request error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateEstimateRequest = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const current = (req as any).estimateRequest;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    const { version, ...updates } = parsed.data;
    if (actor.role === 'PM' && updates.ownerId !== undefined && updates.ownerId !== actor.personnelId) {
      return res.status(403).json({ error: 'Forbidden: PM cannot reassign another owner' });
    }
    if (!['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role) && updates.departmentId && updates.departmentId !== actor.departmentId) {
      return res.status(403).json({ error: 'Forbidden: department scope cannot be changed' });
    }
    if (updates.ownerId) {
      const owner = await prisma.personnelCard.findUnique({ where: { id: updates.ownerId } });
      const targetDepartment = updates.departmentId || current.departmentId;
      if (!owner) return res.status(400).json({ error: 'Assigned owner does not exist' });
      if (!['PM', 'DEPARTMENT_MANAGER'].includes(owner.role)) {
        return res.status(400).json({ error: 'Assigned owner must have a PM-capable role' });
      }
      if (!['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role) && owner.departmentId !== targetDepartment) {
        return res.status(403).json({ error: 'Forbidden: owner must belong to the request department' });
      }
    }
    const changes = changedFields(current, updates);
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.estimateRequest.updateMany({
        where: { id: current.id, version },
        data: {
          ...updates,
          ...(updates.email !== undefined ? { email: updates.email || null } : {}),
          updatedBy: actor.personnelId,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) throw new Error('VERSION_CONFLICT');
      await tx.estimateRequestHistory.create({
        data: { estimateRequestId: current.id, action: 'UPDATED', changes: JSON.stringify(changes), actorId: actor.personnelId },
      });
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_REQUEST_UPDATE', current.id, changes) });
      return tx.estimateRequest.findUniqueOrThrow({ where: { id: current.id }, include: detailInclude });
    });
    res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
      return res.status(409).json({ error: 'Estimate request was changed by another user' });
    }
    console.error('Update estimate request error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const changeEstimateRequestStatus = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const current = (req as any).estimateRequest;
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    if (parsed.data.status === 'WON' && !current.ownerId) {
      return res.status(400).json({ error: 'An owner must be assigned before marking the request as won' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let projectId = current.projectId as string | null;
      if (parsed.data.status === 'WON' && !projectId) {
        const owner = await tx.personnelCard.findUniqueOrThrow({ where: { id: current.ownerId } });
        const maxOrder = await tx.project.aggregate({ _max: { orderIndex: true } });
        const project = await tx.project.create({
          data: {
            companyId: owner.companyId || 'CON_COST',
            name: current.projectName,
            status: 'INTAKE_RECEIVED',
            managerId: actor.role === 'DEPARTMENT_MANAGER' ? actor.personnelId : current.ownerId,
            pmId: current.ownerId,
            orderIndex: (maxOrder._max.orderIndex || 0) + 1,
          },
        });
        projectId = project.id;
      }
      const result = await tx.estimateRequest.updateMany({
        where: { id: current.id, version: parsed.data.version },
        data: { status: parsed.data.status, projectId, updatedBy: actor.personnelId, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new Error('VERSION_CONFLICT');
      await tx.estimateRequestHistory.create({
        data: {
          estimateRequestId: current.id,
          action: 'STATUS_CHANGED',
          fromStatus: current.status,
          toStatus: parsed.data.status,
          actorId: actor.personnelId,
        },
      });
      await tx.auditLog.create({
        data: audit(actor.personnelId, 'ESTIMATE_REQUEST_STATUS_CHANGE', current.id, {
          from: current.status,
          to: parsed.data.status,
          projectId,
        }),
      });
      return tx.estimateRequest.findUniqueOrThrow({ where: { id: current.id }, include: detailInclude });
    });
    res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
      return res.status(409).json({ error: 'Estimate request was changed by another user' });
    }
    console.error('Change estimate request status error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const addEstimateRequestActivity = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const current = (req as any).estimateRequest;
    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    const activity = await prisma.$transaction(async (tx) => {
      const created = await tx.estimateRequestActivity.create({
        data: { ...parsed.data, estimateRequestId: current.id, createdBy: actor.personnelId },
      });
      await tx.estimateRequestHistory.create({
        data: { estimateRequestId: current.id, action: `ACTIVITY_${created.kind}`, changes: created.content, actorId: actor.personnelId },
      });
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_REQUEST_ACTIVITY_ADD', current.id, { kind: created.kind }) });
      return created;
    });
    res.status(201).json(activity);
  } catch (error) {
    console.error('Add estimate request activity error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const addEstimateRequestAttachment = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const current = (req as any).estimateRequest;
    const parsed = attachmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    const attachment = await prisma.$transaction(async (tx) => {
      const created = await tx.estimateRequestAttachment.create({
        data: { ...parsed.data, estimateRequestId: current.id, createdBy: actor.personnelId },
      });
      await tx.estimateRequestHistory.create({
        data: { estimateRequestId: current.id, action: 'ATTACHMENT_ADDED', changes: created.originalName, actorId: actor.personnelId },
      });
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_REQUEST_ATTACHMENT_ADD', current.id, { fileName: created.originalName }) });
      return created;
    });
    res.status(201).json(attachment);
  } catch (error) {
    console.error('Add estimate request attachment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const removeEstimateRequestAttachment = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const current = (req as any).estimateRequest;
    const attachmentId = String(req.params.attachmentId);
    const attachment = await prisma.estimateRequestAttachment.findFirst({
      where: { id: attachmentId, estimateRequestId: current.id },
    });
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
    await prisma.$transaction(async (tx) => {
      await tx.estimateRequestAttachment.delete({ where: { id: attachment.id } });
      await tx.estimateRequestHistory.create({
        data: { estimateRequestId: current.id, action: 'ATTACHMENT_REMOVED', changes: attachment.originalName, actorId: actor.personnelId },
      });
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_REQUEST_ATTACHMENT_REMOVE', current.id, { fileName: attachment.originalName }) });
    });
    res.status(204).send();
  } catch (error) {
    console.error('Remove estimate request attachment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
