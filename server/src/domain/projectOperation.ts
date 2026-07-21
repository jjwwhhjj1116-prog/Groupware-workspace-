import { z } from 'zod';

export const PROJECT_OPERATION_ACTIVITY_KINDS = [
  'MEETING', 'CALL', 'EMAIL', 'AWARD', 'START_APPROVAL', 'COMPLETION_CHANGED', 'COMPLETED', 'NOTE',
] as const;

export type ProjectOperationActivityKind = typeof PROJECT_OPERATION_ACTIVITY_KINDS[number];
export type ProjectOperationActor = { personnelId: string; role: string; departmentId: string };
export type ProjectOperationScope = { managerId: string; managerDepartmentId: string; pmId: string; assignmentIds: string[] };

const optionalDate = z.union([z.literal(''), z.coerce.date()]).optional();

export const projectOperationActivitySchema = z.object({
  expectedVersion: z.number().int().positive(),
  kind: z.enum(PROJECT_OPERATION_ACTIVITY_KINDS),
  occurredAt: z.coerce.date(),
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().max(10000).default(''),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
}).strict();

export const projectOperationMilestoneSchema = z.object({
  expectedVersion: z.number().int().positive(),
  awardDate: optionalDate,
  expectedCompletionDate: optionalDate,
  actualCompletionDate: optionalDate,
  reason: z.string().trim().max(2000).default(''),
}).strict().superRefine((value, context) => {
  if (value.expectedCompletionDate !== undefined && !value.reason) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'A completion date change reason is required' });
  }
});

export const projectStartApprovalSchema = z.object({
  expectedVersion: z.number().int().positive(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().max(2000).default(''),
}).strict();

const isAdmin = (actor: ProjectOperationActor) => ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
const isManager = (actor: ProjectOperationActor, scope: ProjectOperationScope) => actor.role === 'DEPARTMENT_MANAGER'
  && (actor.personnelId === scope.managerId || actor.departmentId === scope.managerDepartmentId);

export const canViewProjectOperation = (actor: ProjectOperationActor, scope: ProjectOperationScope) => isAdmin(actor)
  || isManager(actor, scope) || actor.personnelId === scope.pmId || scope.assignmentIds.includes(actor.personnelId);

export const canEditProjectOperation = (actor: ProjectOperationActor, scope: ProjectOperationScope) => isAdmin(actor)
  || isManager(actor, scope) || (actor.role === 'PM' && (actor.personnelId === scope.pmId || scope.assignmentIds.includes(actor.personnelId)));

export const canApproveProjectOperation = (actor: ProjectOperationActor, scope: ProjectOperationScope) => isAdmin(actor) || isManager(actor, scope);

export const dateValue = (value: Date | '' | undefined) => value === '' ? null : value;
