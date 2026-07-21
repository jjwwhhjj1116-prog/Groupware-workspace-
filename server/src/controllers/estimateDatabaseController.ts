import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db';
import {
  ESTIMATE_DB_SECTIONS,
  ESTIMATE_DB_TARGET_TYPES,
  EstimateDbPayload,
  EstimateDbSection,
  buildAnnualSeries,
  calculateRecordPayload,
  normalizeVendorIdentity,
} from '../domain/estimateDatabase';

const scalar = z.union([z.string().max(20000), z.number().finite(), z.boolean(), z.null()]);
const payloadSchema = z.record(z.string().max(160), scalar);
const createRecordSchema = z.object({
  section: z.enum(ESTIMATE_DB_SECTIONS),
  projectId: z.string().uuid().nullable().optional(),
  sourceRecordId: z.string().max(160).nullable().optional(),
  pjNo: z.string().trim().max(120).nullable().optional(),
  year: z.number().int().min(2000).max(2200).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  data: payloadSchema,
}).strict();
const updateRecordSchema = createRecordSchema.omit({ section: true }).partial().extend({ expectedVersion: z.number().int().positive() }).strict();
const deleteSchema = z.object({ expectedVersion: z.coerce.number().int().positive() });
const vendorCreateSchema = z.object({ name: z.string().trim().min(1).max(240), trade: z.string().trim().max(120).default(''), data: payloadSchema.default({}) }).strict();
const vendorUpdateSchema = vendorCreateSchema.partial().extend({ expectedVersion: z.number().int().positive() }).strict();
const targetSchema = z.object({ type: z.enum(ESTIMATE_DB_TARGET_TYPES), year: z.number().int().min(2000).max(2200), month: z.number().int().min(1).max(12), amount: z.union([z.string(), z.number()]), expectedVersion: z.number().int().positive().optional() }).strict();

const parseData = (value: string): EstimateDbPayload => {
  try { return JSON.parse(value) as EstimateDbPayload; } catch { return {}; }
};
const recordDto = <T extends { dataJson: string }>(record: T) => ({ ...record, data: parseData(record.dataJson), dataJson: undefined });
const vendorDto = <T extends { dataJson: string }>(vendor: T) => ({ ...vendor, data: parseData(vendor.dataJson), dataJson: undefined });
const audit = (actorId: string, action: string, entityType: string, entityId: string, details: unknown) => ({ action, entityType, entityId, actorId, details: JSON.stringify(details) });
const idempotencyKey = (req: Request) => String(req.header('Idempotency-Key') || '').trim() || null;

const linkedPayload = (data: EstimateDbPayload) => ({
  'PJ NO': data['PJ NO'] ?? data.pjNo ?? '',
  'PJ명': data['PJ명'] ?? data.projectName ?? '',
  '업체명': data['업체명'] ?? data.company ?? '',
});

const ensureLinkedRows = async (tx: any, pj: { id: string; projectId: string | null; pjNo: string | null; year: number | null; dataJson: string }, actorId: string) => {
  const base = linkedPayload(parseData(pj.dataJson));
  for (const section of ['PROGRESS', 'MEP_CONTRACT'] as EstimateDbSection[]) {
    const existing = await tx.estimateDbRecord.findUnique({ where: { section_sourceRecordId: { section, sourceRecordId: pj.id } } });
    const dataJson = JSON.stringify(calculateRecordPayload(section, { ...(existing ? parseData(existing.dataJson) : {}), ...base }));
    await tx.estimateDbRecord.upsert({
      where: { section_sourceRecordId: { section, sourceRecordId: pj.id } },
      create: {
        section,
        sourceRecordId: pj.id,
        projectId: pj.projectId,
        pjNo: pj.pjNo,
        year: pj.year,
        dataJson,
        createdBy: actorId,
        updatedBy: actorId,
      },
      update: { projectId: pj.projectId, pjNo: pj.pjNo, year: pj.year, dataJson, updatedBy: actorId, version: { increment: 1 } },
    });
  }
};

export const listEstimateDbRecords = async (req: Request, res: Response) => {
  const section = ESTIMATE_DB_SECTIONS.includes(String(req.query.section) as EstimateDbSection) ? String(req.query.section) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const q = String(req.query.q || '').trim().toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
  const records = await prisma.estimateDbRecord.findMany({
    where: { ...(section ? { section } : {}), ...(Number.isInteger(year) ? { year } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });
  const filtered = q ? records.filter((record) => `${record.pjNo || ''} ${record.dataJson}`.toLowerCase().includes(q)) : records;
  const start = (page - 1) * pageSize;
  res.json({ rows: filtered.slice(start, start + pageSize).map(recordDto), total: filtered.length, page, pageSize });
};

export const createEstimateDbRecord = async (req: Request, res: Response) => {
  try {
    const parsed = createRecordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    const actor = (req as any).user;
    const key = idempotencyKey(req);
    if (key) {
      const existing = await prisma.estimateDbRecord.findUnique({ where: { idempotencyKey: key } });
      if (existing) return res.json(recordDto(existing));
    }
    const { data, ...recordInput } = parsed.data;
    const created = await prisma.$transaction(async (tx) => {
      const record = await tx.estimateDbRecord.create({ data: { ...recordInput, idempotencyKey: key, dataJson: JSON.stringify(calculateRecordPayload(recordInput.section, data)), createdBy: actor.personnelId, updatedBy: actor.personnelId } });
      if (record.section === 'PJ') await ensureLinkedRows(tx, record, actor.personnelId);
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_DB_RECORD_CREATE', 'EstimateDbRecord', record.id, { section: record.section, pjNo: record.pjNo }) });
      return record;
    });
    res.status(201).json(recordDto(created));
  } catch (error) {
    console.error('Create estimate DB record error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateEstimateDbRecord = async (req: Request, res: Response) => {
  try {
    const parsed = updateRecordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    const actor = (req as any).user;
    const current = await prisma.estimateDbRecord.findUnique({ where: { id: String(req.params.id) } });
    if (!current) return res.status(404).json({ error: 'Estimate DB record not found' });
    const { expectedVersion, data, ...updates } = parsed.data;
    const nextPayload = data ? calculateRecordPayload(current.section as EstimateDbSection, data) : parseData(current.dataJson);
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.estimateDbRecord.updateMany({ where: { id: current.id, version: expectedVersion }, data: { ...updates, dataJson: JSON.stringify(nextPayload), updatedBy: actor.personnelId, version: { increment: 1 } } });
      if (result.count !== 1) throw new Error('VERSION_CONFLICT');
      const record = await tx.estimateDbRecord.findUniqueOrThrow({ where: { id: current.id } });
      if (record.section === 'PJ') await ensureLinkedRows(tx, record, actor.personnelId);
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_DB_RECORD_UPDATE', 'EstimateDbRecord', current.id, { expectedVersion, fields: Object.keys(updates), dataFields: data ? Object.keys(data) : [] }) });
      return record;
    });
    res.json(recordDto(updated));
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') return res.status(409).json({ error: 'Estimate DB record was changed by another user' });
    console.error('Update estimate DB record error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteEstimateDbRecord = async (req: Request, res: Response) => {
  try {
    const parsed = deleteSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'expectedVersion is required' });
    const actor = (req as any).user;
    const id = String(req.params.id);
    const current = await prisma.estimateDbRecord.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Estimate DB record not found' });
    await prisma.$transaction(async (tx) => {
      const result = await tx.estimateDbRecord.deleteMany({ where: { id, version: parsed.data.expectedVersion } });
      if (result.count !== 1) throw new Error('VERSION_CONFLICT');
      if (current.section === 'PJ') await tx.estimateDbRecord.deleteMany({ where: { sourceRecordId: current.id } });
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_DB_RECORD_DELETE', 'EstimateDbRecord', id, { expectedVersion: parsed.data.expectedVersion }) });
    });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') return res.status(409).json({ error: 'Estimate DB record was changed or removed' });
    console.error('Delete estimate DB record error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const duplicateEstimateDbRecord = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const key = idempotencyKey(req);
    if (!key) return res.status(400).json({ error: 'Idempotency-Key is required' });
    const existing = await prisma.estimateDbRecord.findUnique({ where: { idempotencyKey: key } });
    if (existing) return res.json(recordDto(existing));
    const source = await prisma.estimateDbRecord.findUnique({ where: { id: String(req.params.id) } });
    if (!source) return res.status(404).json({ error: 'Estimate DB record not found' });
    const created = await prisma.$transaction(async (tx) => {
      const record = await tx.estimateDbRecord.create({ data: { idempotencyKey: key, section: source.section, projectId: source.projectId, pjNo: source.pjNo ? `${source.pjNo}-COPY` : null, year: source.year, sortOrder: source.sortOrder + 1, schemaVersion: source.schemaVersion, dataJson: source.dataJson, createdBy: actor.personnelId, updatedBy: actor.personnelId } });
      if (record.section === 'PJ') await ensureLinkedRows(tx, record, actor.personnelId);
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_DB_RECORD_DUPLICATE', 'EstimateDbRecord', record.id, { sourceId: source.id }) });
      return record;
    });
    res.status(201).json(recordDto(created));
  } catch (error) {
    console.error('Duplicate estimate DB record error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const listEstimateDbVendors = async (_req: Request, res: Response) => {
  const vendors = await prisma.estimateDbVendor.findMany({ orderBy: [{ normalizedTrade: 'asc' }, { normalizedName: 'asc' }] });
  res.json(vendors.map(vendorDto));
};

export const createEstimateDbVendor = async (req: Request, res: Response) => {
  const parsed = vendorCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  const actor = (req as any).user;
  const normalizedName = normalizeVendorIdentity(parsed.data.name);
  const normalizedTrade = normalizeVendorIdentity(parsed.data.trade);
  const vendor = await prisma.$transaction(async (tx) => {
    const created = await tx.estimateDbVendor.upsert({ where: { normalizedName_normalizedTrade: { normalizedName, normalizedTrade } }, create: { normalizedName, normalizedTrade, dataJson: JSON.stringify({ ...parsed.data.data, name: parsed.data.name, trade: parsed.data.trade }), createdBy: actor.personnelId, updatedBy: actor.personnelId }, update: {} });
    await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_DB_VENDOR_CREATE', 'EstimateDbVendor', created.id, { name: parsed.data.name, trade: parsed.data.trade }) });
    return created;
  });
  res.status(201).json(vendorDto(vendor));
};

export const updateEstimateDbVendor = async (req: Request, res: Response) => {
  try {
    const parsed = vendorUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    const actor = (req as any).user;
    const current = await prisma.estimateDbVendor.findUnique({ where: { id: String(req.params.id) } });
    if (!current) return res.status(404).json({ error: 'Vendor not found' });
    const { expectedVersion, name, trade, data } = parsed.data;
    const previous = parseData(current.dataJson);
    const vendor = await prisma.$transaction(async (tx) => {
      const result = await tx.estimateDbVendor.updateMany({ where: { id: current.id, version: expectedVersion }, data: { normalizedName: normalizeVendorIdentity(name ?? previous.name), normalizedTrade: normalizeVendorIdentity(trade ?? previous.trade), dataJson: JSON.stringify({ ...previous, ...data, ...(name ? { name } : {}), ...(trade !== undefined ? { trade } : {}) }), updatedBy: actor.personnelId, version: { increment: 1 } } });
      if (result.count !== 1) throw new Error('VERSION_CONFLICT');
      const saved = await tx.estimateDbVendor.findUniqueOrThrow({ where: { id: current.id } });
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_DB_VENDOR_UPDATE', 'EstimateDbVendor', current.id, { expectedVersion }) });
      return saved;
    });
    res.json(vendorDto(vendor));
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') return res.status(409).json({ error: 'Vendor was changed by another user' });
    console.error('Update estimate DB vendor error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteEstimateDbVendor = async (req: Request, res: Response) => {
  const parsed = deleteSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'expectedVersion is required' });
  const actor = (req as any).user;
  const id = String(req.params.id);
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.estimateDbVendor.deleteMany({ where: { id, version: parsed.data.expectedVersion } });
      if (result.count !== 1) throw new Error('VERSION_CONFLICT');
      await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_DB_VENDOR_DELETE', 'EstimateDbVendor', id, { expectedVersion: parsed.data.expectedVersion }) });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') return res.status(409).json({ error: 'Vendor was changed or removed' });
    throw error;
  }
  res.status(204).send();
};

export const listEstimateDbTargets = async (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const targets = await prisma.estimateDbMonthlyTarget.findMany({ where: { year }, orderBy: [{ type: 'asc' }, { month: 'asc' }] });
  res.json(targets.map((target) => ({ ...target, amount: target.amount.toFixed(2) })));
};

export const putEstimateDbTarget = async (req: Request, res: Response) => {
  const parsed = targetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  const actor = (req as any).user;
  const existing = await prisma.estimateDbMonthlyTarget.findUnique({ where: { type_year_month: { type: parsed.data.type, year: parsed.data.year, month: parsed.data.month } } });
  if (existing && parsed.data.expectedVersion !== existing.version) return res.status(409).json({ error: 'Monthly target was changed by another user' });
  const target = await prisma.$transaction(async (tx) => {
    const saved = await tx.estimateDbMonthlyTarget.upsert({ where: { type_year_month: { type: parsed.data.type, year: parsed.data.year, month: parsed.data.month } }, create: { type: parsed.data.type, year: parsed.data.year, month: parsed.data.month, amount: String(parsed.data.amount), updatedBy: actor.personnelId }, update: { amount: String(parsed.data.amount), updatedBy: actor.personnelId, version: { increment: 1 } } });
    await tx.auditLog.create({ data: audit(actor.personnelId, 'ESTIMATE_DB_TARGET_UPSERT', 'EstimateDbMonthlyTarget', saved.id, { type: saved.type, year: saved.year, month: saved.month, amount: saved.amount.toFixed(2) }) });
    return saved;
  });
  res.json({ ...target, amount: target.amount.toFixed(2) });
};

export const getEstimateDbReports = async (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const [records, targets] = await Promise.all([
    prisma.estimateDbRecord.findMany({ where: { year } }),
    prisma.estimateDbMonthlyTarget.findMany({ where: { year } }),
  ]);
  const parsed = records.map((record) => ({ data: parseData(record.dataJson) }));
  res.json({
    year,
    order: buildAnnualSeries(parsed, year, ['수주일', 'orderDate'], ['수주금액', 'orderAmount', '계약금액']),
    sales: buildAnnualSeries(parsed, year, ['매출일', 'salesDate'], ['매출액', 'salesAmount']),
    deposit: buildAnnualSeries(parsed, year, ['입금일', 'depositDate'], ['입금액', 'depositAmount', '누적수금액']),
    targets: targets.map((target) => ({ type: target.type, month: target.month, amount: target.amount.toFixed(2), version: target.version })),
  });
};
