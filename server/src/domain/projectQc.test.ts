import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProjectQcCsv, canEditProjectQc, canSendProjectQc, deriveProjectQcStatus, projectQcItemCreateSchema } from './projectQc';

const scope = { managerId: 'manager', managerDepartmentId: 'dept-a', pmId: 'pm', assignmentIds: ['worker'] };

test('QC permissions follow the canonical project and assignment scope', () => {
  assert.equal(canEditProjectQc({ personnelId: 'worker', role: 'WORKER', departmentId: 'dept-b' }, scope), true);
  assert.equal(canEditProjectQc({ personnelId: 'other', role: 'WORKER', departmentId: 'dept-a' }, scope), false);
  assert.equal(canSendProjectQc({ personnelId: 'pm', role: 'PM', departmentId: 'dept-b' }, scope), true);
  assert.equal(canSendProjectQc({ personnelId: 'worker', role: 'WORKER', departmentId: 'dept-b' }, scope), false);
});

test('QC status is derived from target checks and send lock', () => {
  assert.equal(deriveProjectQcStatus([{ target: 'PM', done: false, na: false, checkedBy: '', checkedAt: '' }]), 'PENDING');
  assert.equal(deriveProjectQcStatus([{ target: 'PM', done: true, na: false, checkedBy: 'pm', checkedAt: '2026-07-21' }]), 'CONFIRMED');
  assert.equal(deriveProjectQcStatus([], true), 'SENT');
});

test('QC CSV escapes spreadsheet content deterministically', () => {
  const csv = buildProjectQcCsv([{ group: 'Z1', item: 'A, "quoted"', status: 'PENDING' }]);
  assert.match(csv, /"A, ""quoted"""/);
  assert.ok(csv.startsWith('\ufeff'));
});

test('QC item input preserves blank legacy trade values while requiring review content', () => {
  const parsed = projectQcItemCreateSchema.safeParse({
    expectedVersion: 1,
    group: 'PROJECT_INITIAL',
    middleCategory: '',
    subCategory: '',
    trade: '',
    serialNo: 'QC-001',
    item: 'Review item',
    method: 'Review method',
    targets: ['PM'],
    comment: '',
    attachments: [],
  });
  assert.equal(parsed.success, true);
});
