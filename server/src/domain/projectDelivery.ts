import { z } from 'zod';
import { ProjectOperationActor, ProjectOperationScope, canViewProjectOperation } from './projectOperation';

export const DELIVERY_KINDS = ['DELIVERY', 'REDELIVERY'] as const;
export const DAILY_REPORT_STAGES = ['MORNING_DRAFT', 'FINAL', 'OVERTIME', 'DELAY'] as const;
export const APPROVAL_STEPS = ['PM', 'MANAGER', 'EXECUTIVE'] as const;

const version = z.number().int().positive();
export const deliveryRoundSchema = z.object({
  expectedVersion: version,
  kind: z.enum(DELIVERY_KINDS),
  parentRoundId: z.string().uuid().nullable().optional(),
  label: z.string().trim().min(1).max(160),
  deliveryDate: z.coerce.date(),
  memo: z.string().trim().max(10000).default(''),
}).strict().superRefine((value, context) => {
  if (value.kind === 'REDELIVERY' && !value.parentRoundId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['parentRoundId'], message: 'A re-delivery must reference its prior round' });
});

export const deliveryFileSchema = z.object({
  expectedVersion: version,
  logicalFileKey: z.string().trim().min(1).max(255),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  size: z.number().int().min(0).max(100 * 1024 * 1024),
  storageKey: z.string().trim().max(500).optional(),
  checksum: z.string().trim().max(128).optional(),
  memo: z.string().trim().max(2000).default(''),
}).strict();

export const deliveryRecordSchema = z.object({
  expectedVersion: version,
  occurredAt: z.coerce.date(),
  type: z.enum(['CLIENT_DELIVERY', 'REVISION_REQUEST', 'INTERNAL_REVIEW', 'APPROVED', 'OTHER']),
  memo: z.string().trim().min(1).max(10000),
}).strict();

export const downloadRequestSchema = z.object({
  expectedVersion: version,
  targetFile: z.string().trim().min(1).max(500),
  reason: z.string().trim().min(1).max(5000),
}).strict();

export const downloadReviewSchema = z.object({
  expectedVersion: version,
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().max(5000).default(''),
}).strict();

export const dailyReportSchema = z.object({
  expectedVersion: version,
  scheduleRowId: z.string().trim().max(200).nullable().optional(),
  reportDate: z.coerce.date(),
  stage: z.enum(DAILY_REPORT_STAGES),
  planMemo: z.string().trim().max(10000).default(''),
  resultMemo: z.string().trim().max(10000).default(''),
  progressRate: z.number().int().min(0).max(100),
  delayReason: z.string().trim().max(10000).default(''),
  overtimeReason: z.string().trim().max(10000).default(''),
}).strict().superRefine((value, context) => {
  if (value.stage === 'MORNING_DRAFT' && !value.planMemo) context.addIssue({ code: z.ZodIssueCode.custom, path: ['planMemo'], message: 'A morning draft requires a plan' });
  if (value.stage === 'FINAL' && !value.resultMemo) context.addIssue({ code: z.ZodIssueCode.custom, path: ['resultMemo'], message: 'A final report requires a result' });
  if (value.stage === 'OVERTIME' && !value.overtimeReason) context.addIssue({ code: z.ZodIssueCode.custom, path: ['overtimeReason'], message: 'An overtime report requires a reason' });
  if (value.stage === 'DELAY' && !value.delayReason) context.addIssue({ code: z.ZodIssueCode.custom, path: ['delayReason'], message: 'A delay report requires a reason' });
});

export const dailyApprovalSchema = z.object({ expectedVersion: version, step: z.enum(APPROVAL_STEPS) }).strict();

const isAdmin = (actor: ProjectOperationActor) => ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
const isManager = (actor: ProjectOperationActor, scope: ProjectOperationScope) => actor.role === 'DEPARTMENT_MANAGER'
  && (actor.personnelId === scope.managerId || actor.departmentId === scope.managerDepartmentId);
const isAssigned = (actor: ProjectOperationActor, scope: ProjectOperationScope) => scope.assignmentIds.includes(actor.personnelId);

export const canViewProjectDelivery = canViewProjectOperation;
export const canManageProjectDelivery = (actor: ProjectOperationActor, scope: ProjectOperationScope) => isAdmin(actor)
  || isManager(actor, scope) || (actor.role === 'PM' && (actor.personnelId === scope.pmId || isAssigned(actor, scope)));
export const canWriteDailyReport = (actor: ProjectOperationActor, scope: ProjectOperationScope) => canManageProjectDelivery(actor, scope)
  || (actor.role === 'WORKER' && isAssigned(actor, scope));
export const canApproveDownload = (actor: ProjectOperationActor, scope: ProjectOperationScope) => isAdmin(actor) || isManager(actor, scope);
export const canApproveDailyReport = (actor: ProjectOperationActor, scope: ProjectOperationScope, step: typeof APPROVAL_STEPS[number]) => {
  if (isAdmin(actor)) return true;
  if (step === 'PM') return actor.role === 'PM' && actor.personnelId === scope.pmId;
  if (step === 'MANAGER') return isManager(actor, scope);
  return false;
};

export const dailyApprovalRequirements = (input: { delayReason: string; overtimeReason: string }) => ({
  pmStatus: input.delayReason || input.overtimeReason ? 'PENDING' : 'NOT_REQUIRED',
  managerStatus: input.overtimeReason ? 'PENDING' : 'NOT_REQUIRED',
  executiveStatus: input.delayReason ? 'PENDING' : 'NOT_REQUIRED',
});

export const workspaceStatus = (roundCount: number, pendingApprovals: number, progressRate: number) => {
  if (progressRate >= 100 && roundCount > 0 && pendingApprovals === 0) return 'COMPLETED';
  if (roundCount > 0) return 'DELIVERING';
  if (progressRate > 0) return 'IN_PROGRESS';
  return 'OPEN';
};
