import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRequestNumber,
  canCreateEstimateRequest,
  canManageEstimateRequest,
  canViewEstimateRequest,
  normalizeEstimateRequestStatus,
} from './estimateRequest';

const pm = { personnelId: 'pm-1', role: 'PM', departmentId: 'dept-a' };
const manager = { personnelId: 'manager-1', role: 'DEPARTMENT_MANAGER', departmentId: 'dept-a' };
const worker = { personnelId: 'worker-1', role: 'WORKER', departmentId: 'dept-a' };
const request = { ownerId: 'pm-1', departmentId: 'dept-a' };

test('normalizes legacy estimate request statuses', () => {
  assert.equal(normalizeEstimateRequestStatus('견적작성중'), 'ESTIMATE_DRAFTING');
  assert.equal(normalizeEstimateRequestStatus('발송완료'), 'WAITING');
  assert.equal(normalizeEstimateRequestStatus('수주'), 'WON');
  assert.equal(normalizeEstimateRequestStatus('unknown'), 'REQUEST_MEMO');
});

test('enforces estimate request role and scope rules', () => {
  assert.equal(canCreateEstimateRequest(pm), true);
  assert.equal(canCreateEstimateRequest(worker), false);
  assert.equal(canViewEstimateRequest(manager, request), true);
  assert.equal(canManageEstimateRequest(manager, request), true);
  assert.equal(canManageEstimateRequest(pm, request), true);
  assert.equal(canManageEstimateRequest({ ...pm, personnelId: 'pm-2' }, request), false);
  assert.equal(canViewEstimateRequest(worker, request), false);
});

test('builds deterministic request numbers when a suffix is supplied', () => {
  assert.equal(buildRequestNumber(new Date('2026-07-20T00:00:00Z'), 'ABC123'), 'ER-20260720-ABC123');
});
