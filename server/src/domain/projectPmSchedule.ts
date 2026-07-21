import { z } from 'zod';

export const PROJECT_PM_SCHEDULE_STATUSES = [
  'PENDING_ASSIGNMENT',
  'PM_ASSIGNED',
  'DRAFT_REQUESTED',
  'DRAFTING',
  'SUBMITTED',
  'REJECTED',
  'APPROVED',
] as const;

export type ProjectPmScheduleStatus = typeof PROJECT_PM_SCHEDULE_STATUSES[number];
export type ProjectPmScheduleActor = { personnelId: string; role: string; departmentId: string };

const shortText = z.string().trim().max(500).default('');
const isoDate = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).default('');

export const pmAssignmentSchema = z.object({
  primaryPmId: shortText,
  finishPmId: shortText,
  structurePmId: shortText,
  bimPmId: shortText,
  civilPmId: shortText,
}).strict();

export const pmRequestTargetsSchema = z.object({
  pmIds: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  teamLeaderIds: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
}).strict();

export const pmScheduleRowSchema = z.object({
  id: z.string().trim().min(1).max(100),
  assigneeId: z.string().trim().min(1).max(100),
  departmentId: shortText,
  category: z.enum(['STRUCTURE', 'FINISH', 'BIM', 'CIVIL', 'OTHER']),
  scope: shortText,
  people: z.number().int().min(1).max(100).default(1),
  workDays: z.number().int().min(1).max(1000),
  totalDays: z.number().int().min(1).max(1000),
  startDate: isoDate,
  endDate: isoDate,
}).strict().superRefine((row, context) => {
  if (!row.startDate || !row.endDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Schedule rows require start and end dates' });
  } else if (row.startDate > row.endDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Schedule start date must not be after end date' });
  }
});

export const pmSchedulePlanSchema = z.object({
  id: z.enum(['plan1', 'plan2']),
  title: z.string().trim().min(1).max(200),
  rows: z.array(pmScheduleRowSchema).max(200),
}).strict();

export type PmAssignment = z.infer<typeof pmAssignmentSchema>;
export type PmRequestTargets = z.infer<typeof pmRequestTargetsSchema>;
export type PmScheduleRow = z.infer<typeof pmScheduleRowSchema>;
export type PmSchedulePlan = z.infer<typeof pmSchedulePlanSchema>;

export const emptyPmAssignment = (primaryPmId = ''): PmAssignment => ({
  primaryPmId,
  finishPmId: '',
  structurePmId: '',
  bimPmId: '',
  civilPmId: '',
});

export const emptyPmRequestTargets = (): PmRequestTargets => ({ pmIds: [], teamLeaderIds: [] });
export const emptyPmPlan = (id: 'plan1' | 'plan2'): PmSchedulePlan => ({
  id,
  title: id === 'plan1' ? '1안 (전체 투입)' : '2안 (최적화 배치)',
  rows: [],
});

export const assignmentIds = (assignment: PmAssignment) => (
  [...new Set(Object.values(assignment).filter(Boolean))]
);

export const evaluatePmScheduleCompleteness = (plan1: PmSchedulePlan, plan2: PmSchedulePlan) => {
  const missing: string[] = [];
  if (!plan1.rows.length) missing.push('plan1');
  if (!plan2.rows.length) missing.push('plan2');
  return missing;
};

export function assertPmScheduleTransition(current: ProjectPmScheduleStatus, action: string): ProjectPmScheduleStatus {
  const transitions: Record<string, Partial<Record<string, ProjectPmScheduleStatus>>> = {
    assign: { PENDING_ASSIGNMENT: 'PM_ASSIGNED', PM_ASSIGNED: 'PM_ASSIGNED', DRAFT_REQUESTED: 'DRAFT_REQUESTED', DRAFTING: 'DRAFTING', REJECTED: 'REJECTED' },
    request: { PM_ASSIGNED: 'DRAFT_REQUESTED', DRAFTING: 'DRAFT_REQUESTED', REJECTED: 'DRAFT_REQUESTED' },
    save: { PM_ASSIGNED: 'DRAFTING', DRAFT_REQUESTED: 'DRAFTING', DRAFTING: 'DRAFTING', REJECTED: 'DRAFTING' },
    submit: { DRAFT_REQUESTED: 'SUBMITTED', DRAFTING: 'SUBMITTED', REJECTED: 'SUBMITTED' },
    approve: { SUBMITTED: 'APPROVED' },
    reject: { SUBMITTED: 'REJECTED' },
  };
  const target = transitions[action]?.[current];
  if (!target) throw new Error(`Invalid PM schedule transition: ${current} -> ${action}`);
  return target;
}

export type ProjectPmScheduleScope = {
  managerId: string;
  managerDepartmentId: string;
  pmId: string;
  assignmentIds: string[];
  rowAssigneeIds: string[];
};

const isAdmin = (actor: ProjectPmScheduleActor) => ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
const isManager = (actor: ProjectPmScheduleActor, scope: ProjectPmScheduleScope) => (
  actor.role === 'DEPARTMENT_MANAGER'
  && (actor.personnelId === scope.managerId || actor.departmentId === scope.managerDepartmentId)
);

export const canViewProjectPmSchedule = (actor: ProjectPmScheduleActor, scope: ProjectPmScheduleScope) => (
  isAdmin(actor)
  || isManager(actor, scope)
  || actor.personnelId === scope.pmId
  || scope.assignmentIds.includes(actor.personnelId)
  || scope.rowAssigneeIds.includes(actor.personnelId)
);

export const canAssignProjectPmSchedule = (actor: ProjectPmScheduleActor, scope: ProjectPmScheduleScope) => (
  isAdmin(actor) || isManager(actor, scope)
);

export const canEditProjectPmSchedule = (actor: ProjectPmScheduleActor, scope: ProjectPmScheduleScope) => (
  isAdmin(actor)
  || (actor.role === 'PM' && (actor.personnelId === scope.pmId || scope.assignmentIds.includes(actor.personnelId)))
);

export const canReviewProjectPmSchedule = canAssignProjectPmSchedule;

export type ApprovedScheduleSource = { projectId: string; projectName: string; rows: PmScheduleRow[] };
export type PmScheduleConflict = {
  assigneeId: string;
  projectId: string;
  projectName: string;
  candidateRowId: string;
  conflictingRowId: string;
  startDate: string;
  endDate: string;
};

export const findPmScheduleConflicts = (
  projectId: string,
  candidateRows: PmScheduleRow[],
  approvedSchedules: ApprovedScheduleSource[],
): PmScheduleConflict[] => {
  const conflicts: PmScheduleConflict[] = [];
  candidateRows.forEach((candidate) => {
    approvedSchedules.filter((item) => item.projectId !== projectId).forEach((item) => {
      item.rows.filter((row) => row.assigneeId === candidate.assigneeId).forEach((row) => {
        if (candidate.startDate <= row.endDate && candidate.endDate >= row.startDate) {
          conflicts.push({
            assigneeId: candidate.assigneeId,
            projectId: item.projectId,
            projectName: item.projectName,
            candidateRowId: candidate.id,
            conflictingRowId: row.id,
            startDate: candidate.startDate > row.startDate ? candidate.startDate : row.startDate,
            endDate: candidate.endDate < row.endDate ? candidate.endDate : row.endDate,
          });
        }
      });
    });
  });
  return conflicts;
};
