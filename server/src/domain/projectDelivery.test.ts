import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canApproveDailyReport,
  canApproveDownload,
  canManageProjectDelivery,
  canWriteDailyReport,
  dailyApprovalRequirements,
  dailyReportSchema,
  deliveryRoundSchema,
  workspaceStatus,
} from './projectDelivery';

const scope = { managerId: 'manager', managerDepartmentId: 'dept-a', pmId: 'pm', assignmentIds: ['worker'] };

test('delivery and daily permissions preserve canonical project scope', () => {
  assert.equal(canManageProjectDelivery({ personnelId: 'pm', role: 'PM', departmentId: 'dept-b' }, scope), true);
  assert.equal(canManageProjectDelivery({ personnelId: 'worker', role: 'WORKER', departmentId: 'dept-b' }, scope), false);
  assert.equal(canWriteDailyReport({ personnelId: 'worker', role: 'WORKER', departmentId: 'dept-b' }, scope), true);
  assert.equal(canApproveDownload({ personnelId: 'manager', role: 'DEPARTMENT_MANAGER', departmentId: 'dept-a' }, scope), true);
  assert.equal(canApproveDailyReport({ personnelId: 'pm', role: 'PM', departmentId: 'dept-b' }, scope, 'PM'), true);
  assert.equal(canApproveDailyReport({ personnelId: 'manager', role: 'DEPARTMENT_MANAGER', departmentId: 'dept-a' }, scope, 'EXECUTIVE'), false);
  assert.equal(canApproveDailyReport({ personnelId: 'admin', role: 'SUPER_ADMIN', departmentId: 'hq' }, scope, 'EXECUTIVE'), true);
});

test('daily approval requirements mirror overtime and delay escalation', () => {
  assert.deepEqual(dailyApprovalRequirements({ delayReason: '', overtimeReason: '' }), { pmStatus: 'NOT_REQUIRED', managerStatus: 'NOT_REQUIRED', executiveStatus: 'NOT_REQUIRED' });
  assert.deepEqual(dailyApprovalRequirements({ delayReason: 'late input', overtimeReason: 'deadline' }), { pmStatus: 'PENDING', managerStatus: 'PENDING', executiveStatus: 'PENDING' });
});

test('daily report stages require their corresponding narrative', () => {
  const base = { expectedVersion: 1, reportDate: '2026-07-21', progressRate: 20, planMemo: '', resultMemo: '', delayReason: '', overtimeReason: '' };
  assert.equal(dailyReportSchema.safeParse({ ...base, stage: 'MORNING_DRAFT' }).success, false);
  assert.equal(dailyReportSchema.safeParse({ ...base, stage: 'MORNING_DRAFT', planMemo: 'Morning scope' }).success, true);
  assert.equal(dailyReportSchema.safeParse({ ...base, stage: 'OVERTIME', overtimeReason: 'Client deadline' }).success, true);
});

test('re-delivery requires an explicit parent round', () => {
  const base = { expectedVersion: 1, kind: 'REDELIVERY', label: 'Second delivery', deliveryDate: '2026-07-21', memo: '' };
  assert.equal(deliveryRoundSchema.safeParse(base).success, false);
  assert.equal(deliveryRoundSchema.safeParse({ ...base, parentRoundId: '4de5e70d-eacc-41da-bd62-b72cb837ec20' }).success, true);
});

test('workspace status follows progress, delivery, and pending approvals', () => {
  assert.equal(workspaceStatus(0, 0, 0), 'OPEN');
  assert.equal(workspaceStatus(0, 0, 30), 'IN_PROGRESS');
  assert.equal(workspaceStatus(1, 1, 100), 'DELIVERING');
  assert.equal(workspaceStatus(1, 0, 100), 'COMPLETED');
});
