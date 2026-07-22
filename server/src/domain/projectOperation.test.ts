import assert from 'node:assert/strict';
import test from 'node:test';
import { canApproveProjectOperation, canEditProjectOperation, canViewProjectOperation, projectOperationMilestoneSchema } from './projectOperation';

const scope = { managerId: 'manager', managerDepartmentId: 'dept-a', pmId: 'pm', assignmentIds: ['worker'] };

test('project operation permissions follow canonical project scope', () => {
  assert.equal(canViewProjectOperation({ personnelId: 'worker', role: 'WORKER', departmentId: 'dept-b' }, scope), true);
  assert.equal(canEditProjectOperation({ personnelId: 'pm', role: 'PM', departmentId: 'dept-b' }, scope), true);
  assert.equal(canApproveProjectOperation({ personnelId: 'manager', role: 'DEPARTMENT_MANAGER', departmentId: 'dept-a' }, scope), true);
  assert.equal(canEditProjectOperation({ personnelId: 'other', role: 'WORKER', departmentId: 'dept-a' }, scope), false);
});

test('completion date changes require a reason', () => {
  assert.equal(projectOperationMilestoneSchema.safeParse({ expectedVersion: 1, expectedCompletionDate: '2026-08-01', reason: '' }).success, false);
  assert.equal(projectOperationMilestoneSchema.safeParse({ expectedVersion: 1, expectedCompletionDate: '2026-08-01', reason: 'Client schedule changed' }).success, true);
});
