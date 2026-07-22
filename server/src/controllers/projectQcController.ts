import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import {
  buildProjectQcCsv,
  canEditProjectQc,
  canManageProjectQcTerms,
  canSendProjectQc,
  canViewProjectQc,
  deriveProjectQcStatus,
  projectQcAttachmentSchema,
  projectQcItemCreateSchema,
  projectQcItemUpdateSchema,
  projectQcSendSchema,
  projectQcTermSchema,
  projectQcVersionSchema,
  ProjectQcCheck,
} from '../domain/projectQc';
import { ProjectOperationActor, ProjectOperationScope } from '../domain/projectOperation';

const checklistInclude = {
  project: { include: { manager: true, pm: true, pmSchedule: true } },
  items: {
    where: { deletedAt: null },
    include: {
      attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' as const } },
      histories: { orderBy: { createdAt: 'desc' as const } },
    },
    orderBy: [{ group: 'asc' as const }, { serialNo: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  histories: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ProjectQcChecklistInclude;
type ChecklistWithRelations = Prisma.ProjectQcChecklistGetPayload<{ include: typeof checklistInclude }>;
type HttpError = Error & { status?: number; details?: unknown };

const httpError = (message: string, status: number, details?: unknown): HttpError => Object.assign(new Error(message), { status, details });
const parseObject = (value: string | null): Record<string, unknown> => { try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; } };
const parseArray = <T>(value: string | null): T[] => { try { const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed as T[] : []; } catch { return []; } };
const scheduleRows = (value: string) => {
  const parsed = parseObject(value);
  return Array.isArray(parsed.rows) ? parsed.rows : [];
};
const scopeFor = (checklist: ChecklistWithRelations): ProjectOperationScope => {
  const schedule = checklist.project.pmSchedule;
  if (!schedule) return { managerId: checklist.project.managerId, managerDepartmentId: checklist.project.manager.departmentId, pmId: checklist.project.pmId, assignmentIds: [] };
  const assignments = Object.values(parseObject(schedule.assignmentsJson)).filter((value): value is string => typeof value === 'string' && Boolean(value));
  const rows = schedule.approvedPlan === 'plan2' ? scheduleRows(schedule.plan2Json) : scheduleRows(schedule.plan1Json);
  const rowIds = rows.map((row) => typeof row === 'object' && row && 'assigneeId' in row ? String(row.assigneeId) : '').filter(Boolean);
  return { managerId: checklist.project.managerId, managerDepartmentId: checklist.project.manager.departmentId, pmId: checklist.project.pmId, assignmentIds: [...new Set([...assignments, ...rowIds])] };
};
const serialize = (checklist: ChecklistWithRelations, actor: ProjectOperationActor) => {
  const scope = scopeFor(checklist);
  return {
    ...checklist,
    project: { id: checklist.project.id, name: checklist.project.name, status: checklist.project.status, departmentId: checklist.project.manager.departmentId, managerId: checklist.project.managerId, pmId: checklist.project.pmId },
    items: checklist.items.map((item) => ({
      ...item,
      targets: parseArray<string>(item.targetsJson),
      checks: parseArray<ProjectQcCheck>(item.checksJson),
      objection: parseObject(item.objectionJson),
      histories: item.histories.map((history) => ({ ...history, details: parseObject(history.detailsJson) })),
    })),
    histories: checklist.histories.map((history) => ({ ...history, details: parseObject(history.detailsJson) })),
    permissions: { canView: canViewProjectQc(actor, scope), canEdit: canEditProjectQc(actor, scope), canSend: canSendProjectQc(actor, scope) },
  };
};
const loadChecklist = (projectId: string) => prisma.projectQcChecklist.findUniqueOrThrow({ where: { projectId }, include: checklistInclude });
const handleError = (res: Response, error: unknown, label: string) => {
  const typed = error as HttpError;
  if (typed.status) return res.status(typed.status).json({ error: typed.message, details: typed.details });
  console.error(`${label} error:`, error);
  return res.status(500).json({ error: 'Internal Server Error' });
};
const claimVersion = async (tx: Prisma.TransactionClient, projectId: string, expectedVersion: number, actorId: string) => {
  const claimed = await tx.projectQcChecklist.updateMany({ where: { projectId, version: expectedVersion }, data: { updatedBy: actorId, version: { increment: 1 } } });
  if (claimed.count !== 1) throw httpError('Project QC checklist was changed by another user', 409);
};
const history = (tx: Prisma.TransactionClient, checklistId: string, itemId: string | null, action: string, actorId: string, details: Record<string, unknown>) => tx.projectQcHistory.create({ data: { projectQcChecklistId: checklistId, projectQcItemId: itemId, action, actorId, detailsJson: JSON.stringify(details) } });
const audit = (tx: Prisma.TransactionClient, action: string, checklistId: string, actorId: string, details: Record<string, unknown>) => tx.auditLog.create({ data: { action, entityType: 'ProjectQcChecklist', entityId: checklistId, actorId, details: JSON.stringify(details) } });
const refreshChecklistStatus = async (tx: Prisma.TransactionClient, checklistId: string) => {
  const items = await tx.projectQcItem.findMany({ where: { projectQcChecklistId: checklistId, deletedAt: null }, select: { status: true } });
  const status = !items.length ? 'OPEN' : items.every((item) => ['CONFIRMED', 'SENT'].includes(item.status)) ? 'COMPLETED' : items.some((item) => item.status !== 'PENDING') ? 'IN_PROGRESS' : 'OPEN';
  await tx.projectQcChecklist.update({ where: { id: checklistId }, data: { status } });
};

export const getProjectQcChecklist = async (req: Request, res: Response) => {
  try { res.json(serialize(await loadChecklist(String(req.params.projectId)), req.user!)); }
  catch (error) { handleError(res, error, 'Get project QC checklist'); }
};

export const createProjectQcItem = async (req: Request, res: Response) => {
  const parsed = projectQcItemCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project QC item', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const checks = parsed.data.targets.map((target) => ({ target, done: false, na: false, checkedBy: '', checkedAt: '' }));
      const item = await tx.projectQcItem.create({ data: {
        projectQcChecklistId: projectId,
        group: parsed.data.group,
        middleCategory: parsed.data.middleCategory,
        subCategory: parsed.data.subCategory,
        trade: parsed.data.trade,
        serialNo: parsed.data.serialNo,
        item: parsed.data.item,
        method: parsed.data.method,
        targetsJson: JSON.stringify(parsed.data.targets),
        checksJson: JSON.stringify(checks),
        comment: parsed.data.comment,
        createdBy: actor.personnelId,
        updatedBy: actor.personnelId,
        attachments: { create: parsed.data.attachments.map((attachment) => ({ ...attachment, createdBy: actor.personnelId })) },
      } });
      await history(tx, projectId, item.id, 'CREATED', actor.personnelId, { group: item.group, serialNo: item.serialNo });
      await audit(tx, 'PROJECT_QC_ITEM_CREATED', projectId, actor.personnelId, { itemId: item.id, group: item.group });
      await refreshChecklistStatus(tx, projectId);
    });
    res.status(201).json(serialize(await loadChecklist(projectId), actor));
  } catch (error) { handleError(res, error, 'Create project QC item'); }
};

export const updateProjectQcItem = async (req: Request, res: Response) => {
  const parsed = projectQcItemUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project QC item update', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId);
    const itemId = String(req.params.itemId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectQcItem.findFirst({ where: { id: itemId, projectQcChecklistId: projectId, deletedAt: null } });
      if (!current) throw httpError('Project QC item not found', 404);
      if (current.sentAt) throw httpError('Sent QC items are locked', 409);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const targets = parsed.data.targets ?? parseArray<string>(current.targetsJson);
      const oldChecks = parseArray<ProjectQcCheck>(current.checksJson);
      const checks = parsed.data.checks ?? targets.map((target) => oldChecks.find((check) => check.target === target) ?? { target, done: false, na: false, checkedBy: '', checkedAt: '' });
      const data: Prisma.ProjectQcItemUpdateInput = {
        ...(parsed.data.group !== undefined ? { group: parsed.data.group } : {}),
        ...(parsed.data.middleCategory !== undefined ? { middleCategory: parsed.data.middleCategory } : {}),
        ...(parsed.data.subCategory !== undefined ? { subCategory: parsed.data.subCategory } : {}),
        ...(parsed.data.trade !== undefined ? { trade: parsed.data.trade } : {}),
        ...(parsed.data.serialNo !== undefined ? { serialNo: parsed.data.serialNo } : {}),
        ...(parsed.data.item !== undefined ? { item: parsed.data.item } : {}),
        ...(parsed.data.method !== undefined ? { method: parsed.data.method } : {}),
        ...(parsed.data.targets !== undefined ? { targetsJson: JSON.stringify(targets) } : {}),
        ...(parsed.data.checks !== undefined || parsed.data.targets !== undefined ? { checksJson: JSON.stringify(checks), status: deriveProjectQcStatus(checks) } : {}),
        ...(parsed.data.comment !== undefined ? { comment: parsed.data.comment } : {}),
        ...(parsed.data.objection !== undefined ? { objectionJson: JSON.stringify(parsed.data.objection) } : {}),
        ...(parsed.data.eliminated !== undefined ? { eliminated: parsed.data.eliminated } : {}),
        updatedBy: actor.personnelId,
      };
      await tx.projectQcItem.update({ where: { id: itemId }, data });
      await history(tx, projectId, itemId, parsed.data.checks ? 'CHECK_UPDATED' : 'UPDATED', actor.personnelId, { fields: Object.keys(parsed.data).filter((key) => key !== 'expectedVersion') });
      await audit(tx, 'PROJECT_QC_ITEM_UPDATED', projectId, actor.personnelId, { itemId, fields: Object.keys(parsed.data).filter((key) => key !== 'expectedVersion') });
      await refreshChecklistStatus(tx, projectId);
    });
    res.json(serialize(await loadChecklist(projectId), actor));
  } catch (error) { handleError(res, error, 'Update project QC item'); }
};

export const duplicateProjectQcItem = async (req: Request, res: Response) => {
  const parsed = projectQcVersionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Expected version is required' });
  try {
    const projectId = String(req.params.projectId);
    const itemId = String(req.params.itemId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectQcItem.findFirst({ where: { id: itemId, projectQcChecklistId: projectId, deletedAt: null }, include: { attachments: { where: { deletedAt: null } } } });
      if (!current) throw httpError('Project QC item not found', 404);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const targets = parseArray<string>(current.targetsJson);
      const checks = targets.map((target) => ({ target, done: false, na: false, checkedBy: '', checkedAt: '' }));
      const copy = await tx.projectQcItem.create({ data: {
        projectQcChecklistId: projectId, group: current.group, middleCategory: current.middleCategory, subCategory: current.subCategory,
        trade: current.trade, serialNo: `${current.serialNo}-COPY`, item: current.item, method: current.method,
        targetsJson: current.targetsJson, checksJson: JSON.stringify(checks), comment: current.comment,
        createdBy: actor.personnelId, updatedBy: actor.personnelId,
        attachments: { create: current.attachments.map((attachment) => ({ originalName: attachment.originalName, mimeType: attachment.mimeType, size: attachment.size, storageKey: attachment.storageKey, checksum: attachment.checksum, createdBy: actor.personnelId })) },
      } });
      await history(tx, projectId, copy.id, 'DUPLICATED', actor.personnelId, { sourceItemId: itemId });
      await audit(tx, 'PROJECT_QC_ITEM_DUPLICATED', projectId, actor.personnelId, { sourceItemId: itemId, itemId: copy.id });
      await refreshChecklistStatus(tx, projectId);
    });
    res.status(201).json(serialize(await loadChecklist(projectId), actor));
  } catch (error) { handleError(res, error, 'Duplicate project QC item'); }
};

export const deleteProjectQcItem = async (req: Request, res: Response) => {
  const parsed = projectQcVersionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Expected version is required' });
  try {
    const projectId = String(req.params.projectId);
    const itemId = String(req.params.itemId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const current = await tx.projectQcItem.findFirst({ where: { id: itemId, projectQcChecklistId: projectId, deletedAt: null } });
      if (!current) throw httpError('Project QC item not found', 404);
      if (current.sentAt) throw httpError('Sent QC items are locked', 409);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      await tx.projectQcItem.update({ where: { id: itemId }, data: { deletedAt: new Date(), deletedBy: actor.personnelId, updatedBy: actor.personnelId } });
      await history(tx, projectId, itemId, 'DELETED', actor.personnelId, { serialNo: current.serialNo });
      await audit(tx, 'PROJECT_QC_ITEM_DELETED', projectId, actor.personnelId, { itemId });
      await refreshChecklistStatus(tx, projectId);
    });
    res.json(serialize(await loadChecklist(projectId), actor));
  } catch (error) { handleError(res, error, 'Delete project QC item'); }
};

export const addProjectQcAttachment = async (req: Request, res: Response) => {
  const parsed = projectQcAttachmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project QC attachment', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId);
    const itemId = String(req.params.itemId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const item = await tx.projectQcItem.findFirst({ where: { id: itemId, projectQcChecklistId: projectId, deletedAt: null } });
      if (!item) throw httpError('Project QC item not found', 404);
      if (item.sentAt) throw httpError('Sent QC items are locked', 409);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const created = await tx.projectQcAttachment.create({ data: {
        projectQcItemId: itemId,
        originalName: parsed.data.originalName,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        storageKey: parsed.data.storageKey,
        checksum: parsed.data.checksum,
        createdBy: actor.personnelId,
      } });
      await history(tx, projectId, itemId, 'ATTACHMENT_ADDED', actor.personnelId, { attachmentId: created.id, originalName: created.originalName });
      await audit(tx, 'PROJECT_QC_ATTACHMENT_ADDED', projectId, actor.personnelId, { itemId, attachmentId: created.id });
    });
    res.status(201).json(serialize(await loadChecklist(projectId), actor));
  } catch (error) { handleError(res, error, 'Add project QC attachment'); }
};

export const removeProjectQcAttachment = async (req: Request, res: Response) => {
  const parsed = projectQcVersionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Expected version is required' });
  try {
    const projectId = String(req.params.projectId);
    const itemId = String(req.params.itemId);
    const attachmentId = String(req.params.attachmentId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const item = await tx.projectQcItem.findFirst({ where: { id: itemId, projectQcChecklistId: projectId, deletedAt: null } });
      if (!item) throw httpError('Project QC item not found', 404);
      if (item.sentAt) throw httpError('Sent QC items are locked', 409);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const removed = await tx.projectQcAttachment.updateMany({ where: { id: attachmentId, projectQcItemId: itemId, deletedAt: null }, data: { deletedAt: new Date(), deletedBy: actor.personnelId } });
      if (removed.count !== 1) throw httpError('Project QC attachment not found', 404);
      await history(tx, projectId, itemId, 'ATTACHMENT_REMOVED', actor.personnelId, { attachmentId });
      await audit(tx, 'PROJECT_QC_ATTACHMENT_REMOVED', projectId, actor.personnelId, { itemId, attachmentId });
    });
    res.json(serialize(await loadChecklist(projectId), actor));
  } catch (error) { handleError(res, error, 'Remove project QC attachment'); }
};

export const sendProjectQcCategory = async (req: Request, res: Response) => {
  const parsed = projectQcSendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project QC send request', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId);
    const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const items = await tx.projectQcItem.findMany({ where: { projectQcChecklistId: projectId, group: parsed.data.group, deletedAt: null } });
      if (!items.length) throw httpError('No project QC items exist in this category', 404);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const timestamp = new Date();
      for (const item of items) {
        const checks = parseArray<ProjectQcCheck>(item.checksJson).map((check) => check.target === 'PM' ? { ...check, done: true, na: false, checkedBy: actor.personnelId, checkedAt: timestamp.toISOString() } : check);
        await tx.projectQcItem.update({ where: { id: item.id }, data: { checksJson: JSON.stringify(checks), status: 'SENT', sentAt: timestamp, sentBy: actor.personnelId, updatedBy: actor.personnelId } });
        await history(tx, projectId, item.id, 'CATEGORY_SENT', actor.personnelId, { group: parsed.data.group });
      }
      await audit(tx, 'PROJECT_QC_CATEGORY_SENT', projectId, actor.personnelId, { group: parsed.data.group, count: items.length });
      await refreshChecklistStatus(tx, projectId);
    });
    res.json(serialize(await loadChecklist(projectId), actor));
  } catch (error) { handleError(res, error, 'Send project QC category'); }
};

export const exportProjectQcChecklist = async (req: Request, res: Response) => {
  try {
    const checklist = await loadChecklist(String(req.params.projectId));
    const serialized = serialize(checklist, req.user!);
    const rows = serialized.items.map((item) => ({
      group: item.group, trade: item.trade, serialNo: item.serialNo, item: item.item, method: item.method,
      targets: item.targets.join(' / '), status: item.status, comment: item.comment, attachmentCount: item.attachments.length,
      eliminated: item.eliminated, createdBy: item.createdBy, createdAt: item.createdAt,
      history: item.histories.map((entry) => `${entry.action}/${entry.actorId}/${entry.createdAt.toISOString()}`).join(' | '),
    }));
    if (String(req.query.format).toLowerCase() === 'csv') {
      res.setHeader('Content-Disposition', `attachment; filename="project-qc-${checklist.projectId}.csv"`);
      return res.type('text/csv; charset=utf-8').send(buildProjectQcCsv(rows));
    }
    res.setHeader('Content-Disposition', `attachment; filename="project-qc-${checklist.projectId}.json"`);
    return res.json({ schema: 'CON-COST_PROJECT_QC', version: '1.0', exportedAt: new Date().toISOString(), projectId: checklist.projectId, rowCount: rows.length, rows });
  } catch (error) { return handleError(res, error, 'Export project QC checklist'); }
};

export const listProjectQcTerms = async (_req: Request, res: Response) => {
  try { res.json(await prisma.projectQcTerm.findMany({ orderBy: { term: 'asc' } })); }
  catch (error) { handleError(res, error, 'List project QC terms'); }
};

export const upsertProjectQcTerm = async (req: Request, res: Response) => {
  const parsed = projectQcTermSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid project QC term', details: parsed.error.issues });
  const actor = req.user!;
  if (!canManageProjectQcTerms(actor)) return res.status(403).json({ error: 'Forbidden: QC glossary management requires manager access' });
  try {
    const term = await prisma.projectQcTerm.upsert({
      where: { term: parsed.data.term },
      create: { ...parsed.data, createdBy: actor.personnelId, updatedBy: actor.personnelId },
      update: { definition: parsed.data.definition, updatedBy: actor.personnelId },
    });
    await prisma.auditLog.create({ data: { action: 'PROJECT_QC_TERM_UPSERTED', entityType: 'ProjectQcTerm', entityId: term.id, actorId: actor.personnelId, details: JSON.stringify({ term: term.term }) } });
    res.json(term);
  } catch (error) { handleError(res, error, 'Upsert project QC term'); }
};
