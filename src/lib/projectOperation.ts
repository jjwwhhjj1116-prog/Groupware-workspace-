import { Project, ProjectOperation, ProjectOperationActivityKind, ProjectPmSchedule, Role } from '@/types/models';

export type ProjectOperationActor = { id: string; role: Role; departmentId: string };

export const localProjectOperationPermissions = (operation: ProjectOperation, actor: ProjectOperationActor) => {
  const isAdmin = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
  const isManager = actor.role === 'DEPARTMENT_MANAGER'
    && (actor.id === operation.project.managerId || actor.departmentId === operation.project.departmentId);
  const assigned = Object.values(operation.assignments.assignment).includes(actor.id)
    || operation.assignments.rows.some((row) => row.assigneeId === actor.id);
  return {
    canView: isAdmin || isManager || actor.id === operation.project.pmId || assigned,
    canEdit: isAdmin || isManager || (actor.role === 'PM' && (actor.id === operation.project.pmId || assigned)),
    canApprove: isAdmin || isManager,
  };
};

export const makeLocalProjectOperation = (
  project: Project,
  actor: ProjectOperationActor,
  schedule?: ProjectPmSchedule,
  sourceTrace: Partial<ProjectOperation['sourceTrace']> = {},
): ProjectOperation => {
  const timestamp = new Date().toISOString();
  const rows = schedule ? (schedule.approvedPlan === 'plan2' ? schedule.plan2.rows : schedule.plan1.rows) : [];
  const operation: ProjectOperation = {
    id: project.id,
    projectId: project.id,
    awardDate: null,
    expectedCompletionDate: project.deliveryDate || project.dueDate || null,
    actualCompletionDate: project.deliveryDateStatus === 'DELIVERED' ? project.deliveryDate || null : null,
    startApprovalStatus: project.approvedStartDate ? 'APPROVED' : 'PENDING',
    startApprovedBy: null,
    startApprovedAt: project.approvedStartDate || null,
    version: 1,
    createdBy: actor.id,
    updatedBy: actor.id,
    createdAt: project.createdAt || timestamp,
    updatedAt: project.updatedAt || timestamp,
    project: {
      id: project.id,
      name: project.title,
      status: project.status,
      departmentId: project.departmentId,
      managerId: project.managerId || '',
      pmId: project.pmId || '',
    },
    activities: [],
    assignments: { assignment: schedule?.assignment || {}, rows },
    sourceTrace: { canonicalProjectId: project.id, ...sourceTrace },
    permissions: { canView: false, canEdit: false, canApprove: false },
  };
  return { ...operation, permissions: localProjectOperationPermissions(operation, actor) };
};

export const activityTitleFallback = (kind: ProjectOperationActivityKind) => ({
  MEETING: 'Meeting', CALL: 'Call', EMAIL: 'Email', AWARD: 'Award', START_APPROVAL: 'Start approval',
  COMPLETION_CHANGED: 'Completion date changed', COMPLETED: 'Completed', NOTE: 'Note',
})[kind];
