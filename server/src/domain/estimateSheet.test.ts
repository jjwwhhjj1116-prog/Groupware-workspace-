import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertVersion,
  canEditEstimateSheet,
  canViewEstimateSheet,
  nextEstimateSheetStatus,
  submissionIsDecisionReady,
  submissionMatchesFilters,
} from './estimateSheet';

const request = { ownerId: 'pm-1', departmentId: 'dept-a' };

test('applies estimate sheet scope to view and edit separately', () => {
  assert.equal(canViewEstimateSheet({ personnelId: 'pm-1', role: 'PM', departmentId: 'dept-b' }, request), true);
  assert.equal(canEditEstimateSheet({ personnelId: 'pm-2', role: 'PM', departmentId: 'dept-a' }, request), false);
  assert.equal(canEditEstimateSheet({ personnelId: 'manager', role: 'DEPARTMENT_MANAGER', departmentId: 'dept-a' }, request), true);
  assert.equal(canViewEstimateSheet({ personnelId: 'worker', role: 'WORKER', departmentId: 'dept-a' }, request), false);
});

test('rejects stale versions', () => {
  assert.doesNotThrow(() => assertVersion(3, 3));
  assert.throws(() => assertVersion(2, 3), /Version conflict/);
});

test('enforces submission and send transitions while retaining legacy direct send', () => {
  assert.equal(nextEstimateSheetStatus('DRAFT', 'SUBMITTED'), 'SUBMITTED');
  assert.equal(nextEstimateSheetStatus('SUBMITTED', 'SENT'), 'SENT');
  assert.equal(nextEstimateSheetStatus('DRAFT', 'SENT'), 'SENT');
  assert.throws(() => nextEstimateSheetStatus('SENT', 'DRAFT'), /Invalid estimate sheet transition/);
});

test('filters submission history without changing the source rows', () => {
  const row = {
    status: 'SENT',
    templateType: '개산견적',
    requestNo: 'ER-20260720-001',
    projectName: '테스트 데이터센터',
    company: 'CON-COST',
    submittedAt: '2026-07-20T03:00:00.000Z',
  };
  assert.equal(submissionMatchesFilters(row, { q: '데이터센터', status: 'SENT' }), true);
  assert.equal(submissionMatchesFilters(row, { templateType: '공내역서' }), false);
  assert.equal(submissionMatchesFilters(row, { from: '2026-07-21' }), false);
  assert.equal(submissionIsDecisionReady(row.status), true);
  assert.equal(submissionIsDecisionReady('SUBMITTED'), false);
});
