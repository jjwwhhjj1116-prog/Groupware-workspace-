import assert from 'node:assert/strict';
import test from 'node:test';
import { assertVersion, canEditEstimateSheet, canViewEstimateSheet, nextEstimateSheetStatus } from './estimateSheet';

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

test('allows only the immutable draft to sent transition', () => {
  assert.equal(nextEstimateSheetStatus('DRAFT', 'SENT'), 'SENT');
  assert.throws(() => nextEstimateSheetStatus('SENT', 'DRAFT'), /Invalid estimate sheet transition/);
});
