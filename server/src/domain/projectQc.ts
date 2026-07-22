import { z } from 'zod';
import { ProjectOperationActor, ProjectOperationScope, canViewProjectOperation } from './projectOperation';

export const PROJECT_QC_STATUSES = ['PENDING', 'PARTIAL', 'CONFIRMED', 'SENT'] as const;

const attachmentSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  size: z.number().int().min(0).max(25 * 1024 * 1024),
  storageKey: z.string().trim().max(500).optional(),
  checksum: z.string().trim().max(128).optional(),
}).strict();

const checkSchema = z.object({
  target: z.string().trim().min(1).max(120),
  done: z.boolean().default(false),
  na: z.boolean().default(false),
  checkedBy: z.string().trim().max(120).default(''),
  checkedAt: z.string().trim().max(40).default(''),
}).strict();

export const projectQcItemCreateSchema = z.object({
  expectedVersion: z.number().int().positive(),
  group: z.string().trim().min(1).max(200),
  middleCategory: z.string().trim().max(200).default(''),
  subCategory: z.string().trim().max(200).default(''),
  trade: z.string().trim().max(200),
  serialNo: z.string().trim().min(1).max(80),
  item: z.string().trim().min(1).max(10000),
  method: z.string().trim().min(1).max(10000),
  targets: z.array(z.string().trim().min(1).max(120)).min(1).max(30),
  comment: z.string().trim().max(10000).default(''),
  attachments: z.array(attachmentSchema).max(20).default([]),
}).strict();

export const projectQcItemUpdateSchema = z.object({
  expectedVersion: z.number().int().positive(),
  group: z.string().trim().min(1).max(200).optional(),
  middleCategory: z.string().trim().max(200).optional(),
  subCategory: z.string().trim().max(200).optional(),
  trade: z.string().trim().max(200).optional(),
  serialNo: z.string().trim().min(1).max(80).optional(),
  item: z.string().trim().min(1).max(10000).optional(),
  method: z.string().trim().min(1).max(10000).optional(),
  targets: z.array(z.string().trim().min(1).max(120)).min(1).max(30).optional(),
  checks: z.array(checkSchema).min(1).max(30).optional(),
  comment: z.string().trim().max(10000).optional(),
  objection: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullable().optional(),
  eliminated: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== 'expectedVersion'), { message: 'At least one QC field is required' });

export const projectQcAttachmentSchema = attachmentSchema.extend({ expectedVersion: z.number().int().positive() }).strict();
export const projectQcVersionSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();
export const projectQcSendSchema = z.object({ expectedVersion: z.number().int().positive(), group: z.string().trim().min(1).max(200) }).strict();
export const projectQcTermSchema = z.object({ term: z.string().trim().min(1).max(160), definition: z.string().trim().min(1).max(5000) }).strict();

const isAdmin = (actor: ProjectOperationActor) => ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
const isManager = (actor: ProjectOperationActor, scope: ProjectOperationScope) => actor.role === 'DEPARTMENT_MANAGER'
  && (actor.personnelId === scope.managerId || actor.departmentId === scope.managerDepartmentId);
const isAssigned = (actor: ProjectOperationActor, scope: ProjectOperationScope) => scope.assignmentIds.includes(actor.personnelId);

export const canViewProjectQc = canViewProjectOperation;
export const canEditProjectQc = (actor: ProjectOperationActor, scope: ProjectOperationScope) => isAdmin(actor)
  || isManager(actor, scope) || (actor.role === 'PM' && (actor.personnelId === scope.pmId || isAssigned(actor, scope)))
  || (actor.role === 'WORKER' && isAssigned(actor, scope));
export const canSendProjectQc = (actor: ProjectOperationActor, scope: ProjectOperationScope) => isAdmin(actor)
  || isManager(actor, scope) || (actor.role === 'PM' && actor.personnelId === scope.pmId);
export const canManageProjectQcTerms = (actor: ProjectOperationActor) => isAdmin(actor) || actor.role === 'DEPARTMENT_MANAGER';

export type ProjectQcCheck = z.infer<typeof checkSchema>;
export const deriveProjectQcStatus = (checks: ProjectQcCheck[], sent = false) => {
  if (sent) return 'SENT' as const;
  if (checks.length && checks.every((check) => check.done || check.na)) return 'CONFIRMED' as const;
  if (checks.some((check) => check.done || check.na)) return 'PARTIAL' as const;
  return 'PENDING' as const;
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
export const buildProjectQcCsv = (rows: Array<Record<string, unknown>>) => {
  const headers = ['group', 'trade', 'serialNo', 'item', 'method', 'targets', 'status', 'comment', 'attachmentCount', 'eliminated', 'createdBy', 'createdAt', 'history'];
  const values = rows.map((row) => headers.map((header) => csvCell(row[header])).join(','));
  return `\ufeff${headers.map(csvCell).join(',')}\n${values.join('\n')}`;
};
