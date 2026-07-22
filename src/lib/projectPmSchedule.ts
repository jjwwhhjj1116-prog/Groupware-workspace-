import {
  PersonnelCard,
  PmAssignment,
  PmScheduleConflict,
  PmSchedulePlan,
  PmScheduleRow,
  ProjectPmSchedule,
  ProjectPmScheduleStatus,
  Project,
  Role,
} from '@/types/models';

export type PmScheduleActor = { id: string; role: Role; departmentId: string };

export const emptyPmAssignment = (primaryPmId = ''): PmAssignment => ({
  primaryPmId,
  finishPmId: '',
  structurePmId: '',
  bimPmId: '',
  civilPmId: '',
});

export const emptyPmPlan = (id: 'plan1' | 'plan2'): PmSchedulePlan => ({
  id,
  title: id === 'plan1' ? 'Plan 1' : 'Plan 2',
  rows: [],
});

export const newPmScheduleRow = (assignee?: PersonnelCard): PmScheduleRow => ({
  id: `pm-row-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
  assigneeId: assignee?.id || '',
  departmentId: assignee?.departmentId || '',
  category: 'OTHER',
  scope: '',
  people: 1,
  workDays: 1,
  totalDays: 1,
  startDate: '',
  endDate: '',
});

export const assignmentIds = (assignment: PmAssignment) => [...new Set(Object.values(assignment).filter(Boolean))];

export const missingPmPlans = (plan1: PmSchedulePlan, plan2: PmSchedulePlan) => {
  const missing: string[] = [];
  if (!plan1.rows.length) missing.push('plan1');
  if (!plan2.rows.length) missing.push('plan2');
  [...plan1.rows, ...plan2.rows].forEach((row) => {
    if (!row.assigneeId || !row.startDate || !row.endDate || row.startDate > row.endDate) missing.push(row.id);
  });
  return [...new Set(missing)];
};

export const nextPmScheduleStatus = (current: ProjectPmScheduleStatus, action: string): ProjectPmScheduleStatus => {
  const transitions: Record<string, Partial<Record<ProjectPmScheduleStatus, ProjectPmScheduleStatus>>> = {
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
};

export const localPmSchedulePermissions = (schedule: ProjectPmSchedule, actor: PmScheduleActor) => {
  const isAdmin = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
  const isManager = actor.role === 'DEPARTMENT_MANAGER'
    && (actor.id === schedule.project.managerId || actor.departmentId === schedule.project.departmentId);
  const assigned = assignmentIds(schedule.assignment).includes(actor.id);
  const rowAssignee = [...schedule.plan1.rows, ...schedule.plan2.rows].some((row) => row.assigneeId === actor.id);
  return {
    canView: isAdmin || isManager || actor.id === schedule.project.pmId || assigned || rowAssignee,
    canAssign: (isAdmin || isManager) && schedule.status !== 'APPROVED',
    canEdit: (isAdmin || (actor.role === 'PM' && (actor.id === schedule.project.pmId || assigned))) && schedule.status !== 'APPROVED',
    canReview: (isAdmin || isManager) && schedule.status === 'SUBMITTED',
  };
};

export const makeLocalPmSchedule = (project: Project, actor: PmScheduleActor): ProjectPmSchedule => {
  const timestamp = new Date().toISOString();
  const statusByProject: Partial<Record<Project['status'], ProjectPmScheduleStatus>> = {
    MANAGER_REVIEW: 'PENDING_ASSIGNMENT',
    PM_ASSIGNED: 'PM_ASSIGNED',
    SCHEDULE_DRAFTING: 'DRAFTING',
    SCHEDULE_PENDING_APPROVAL: 'SUBMITTED',
    SCHEDULE_REJECTED: 'REJECTED',
    SCHEDULE_APPROVED: 'APPROVED',
  };
  const schedule: ProjectPmSchedule = {
    id: `pm-schedule-${project.id}`,
    projectId: project.id,
    status: statusByProject[project.status] || 'PENDING_ASSIGNMENT',
    assignment: emptyPmAssignment(project.pmId),
    requestTargets: { pmIds: [], teamLeaderIds: [] },
    requestMemo: '',
    plan1: emptyPmPlan('plan1'),
    plan2: emptyPmPlan('plan2'),
    version: 1,
    createdBy: actor.id,
    updatedBy: actor.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    completeness: { missing: ['plan1', 'plan2'] },
    permissions: { canView: false, canAssign: false, canEdit: false, canReview: false },
    histories: [],
    project: {
      id: project.id,
      name: project.title,
      status: project.status,
      departmentId: project.departmentId,
      managerId: project.managerId || '',
      pmId: project.pmId || '',
    },
  };
  return { ...schedule, permissions: localPmSchedulePermissions(schedule, actor) };
};

export const findPmScheduleConflicts = (
  projectId: string,
  candidateRows: PmScheduleRow[],
  approvedSchedules: ProjectPmSchedule[],
): PmScheduleConflict[] => {
  const conflicts: PmScheduleConflict[] = [];
  approvedSchedules.filter((item) => item.projectId !== projectId && item.status === 'APPROVED').forEach((item) => {
    const rows = item.approvedPlan === 'plan2' ? item.plan2.rows : item.plan1.rows;
    candidateRows.forEach((candidate) => rows.filter((row) => row.assigneeId === candidate.assigneeId).forEach((row) => {
      if (candidate.startDate <= row.endDate && candidate.endDate >= row.startDate) {
        conflicts.push({
          assigneeId: candidate.assigneeId,
          projectId: item.projectId,
          projectName: item.project.name,
          candidateRowId: candidate.id,
          conflictingRowId: row.id,
          startDate: candidate.startDate > row.startDate ? candidate.startDate : row.startDate,
          endDate: candidate.endDate < row.endDate ? candidate.endDate : row.endDate,
        });
      }
    }));
  });
  return conflicts;
};
