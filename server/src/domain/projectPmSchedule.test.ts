import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertPmScheduleTransition,
  canAssignProjectPmSchedule,
  canEditProjectPmSchedule,
  canViewProjectPmSchedule,
  evaluatePmScheduleCompleteness,
  findPmScheduleConflicts,
  PmSchedulePlan,
} from './projectPmSchedule';

const row = (id: string, assigneeId: string, startDate: string, endDate: string) => ({
  id,
  assigneeId,
  departmentId: 'dept-1',
  category: 'STRUCTURE' as const,
  scope: 'RC',
  people: 1,
  workDays: 5,
  totalDays: 5,
  startDate,
  endDate,
});

test('enforces assignment, submit, reject, resubmit, and approval transitions', () => {
  assert.equal(assertPmScheduleTransition('PENDING_ASSIGNMENT', 'assign'), 'PM_ASSIGNED');
  assert.equal(assertPmScheduleTransition('DRAFTING', 'submit'), 'SUBMITTED');
  assert.equal(assertPmScheduleTransition('SUBMITTED', 'reject'), 'REJECTED');
  assert.equal(assertPmScheduleTransition('REJECTED', 'submit'), 'SUBMITTED');
  assert.equal(assertPmScheduleTransition('SUBMITTED', 'approve'), 'APPROVED');
  assert.throws(() => assertPmScheduleTransition('APPROVED', 'save'), /Invalid/);
});

test('requires both schedule proposals before submission', () => {
  const plan1: PmSchedulePlan = { id: 'plan1', title: 'Plan 1', rows: [row('row-1', 'pm-1', '2026-08-01', '2026-08-05')] };
  const plan2: PmSchedulePlan = { id: 'plan2', title: 'Plan 2', rows: [] };
  assert.deepEqual(evaluatePmScheduleCompleteness(plan1, plan2), ['plan2']);
  assert.deepEqual(evaluatePmScheduleCompleteness(plan1, { ...plan2, rows: [row('row-2', 'pm-1', '2026-08-02', '2026-08-06')] }), []);
});

test('separates manager assignment from PM editing permissions', () => {
  const scope = { managerId: 'manager-1', managerDepartmentId: 'dept-1', pmId: 'pm-1', assignmentIds: ['pm-1'], rowAssigneeIds: ['worker-1'] };
  assert.equal(canAssignProjectPmSchedule({ personnelId: 'manager-1', role: 'DEPARTMENT_MANAGER', departmentId: 'dept-1' }, scope), true);
  assert.equal(canEditProjectPmSchedule({ personnelId: 'pm-1', role: 'PM', departmentId: 'dept-1' }, scope), true);
  assert.equal(canEditProjectPmSchedule({ personnelId: 'pm-2', role: 'PM', departmentId: 'dept-1' }, scope), false);
  assert.equal(canViewProjectPmSchedule({ personnelId: 'worker-1', role: 'WORKER', departmentId: 'dept-1' }, scope), true);
});

test('detects assignee date conflicts across canonical projects', () => {
  const conflicts = findPmScheduleConflicts('project-1', [row('candidate', 'worker-1', '2026-08-03', '2026-08-08')], [{
    projectId: 'project-2',
    projectName: 'Other project',
    rows: [row('approved', 'worker-1', '2026-08-01', '2026-08-05')],
  }]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].startDate, '2026-08-03');
  assert.equal(conflicts[0].endDate, '2026-08-05');
});
