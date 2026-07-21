import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCommercialDecisionTransition,
  buildProjectIntakeSnapshot,
  commercialDecisionRequiresSentSubmission,
  normalizeAgreedAmount,
} from './commercialDecision';

const request = {
  id: 'request-1',
  requestNo: 'ER-20260721-001',
  status: 'WAITING',
  projectName: 'Data Center',
  company: 'CON-COST',
  client: 'Client A',
  ownerId: 'pm-1',
  departmentId: 'dept-1',
  requestDate: '2026-07-21T00:00:00.000Z',
  scope: 'Structure estimate',
  attachments: [{ id: 'attachment-1', originalName: 'drawing.pdf' }],
  activities: [{ id: 'activity-1', kind: 'EMAIL' }],
};

test('requires a sent estimate only for won and lost decisions', () => {
  assert.equal(commercialDecisionRequiresSentSubmission('WON'), true);
  assert.equal(commercialDecisionRequiresSentSubmission('LOST'), true);
  assert.equal(commercialDecisionRequiresSentSubmission('CANCELLED'), false);
  assert.equal(commercialDecisionRequiresSentSubmission('ON_HOLD'), false);
});

test('prevents duplicate conversion and terminal re-decision', () => {
  assert.doesNotThrow(() => assertCommercialDecisionTransition('WAITING', 'WON', null));
  assert.doesNotThrow(() => assertCommercialDecisionTransition('ON_HOLD', 'WON', null));
  assert.throws(() => assertCommercialDecisionTransition('WAITING', 'WON', 'project-1'), /already been converted/);
  assert.throws(() => assertCommercialDecisionTransition('LOST', 'WON', null), /terminal/);
  assert.throws(() => assertCommercialDecisionTransition('ON_HOLD', 'ON_HOLD', null), /already on hold/);
});

test('normalizes agreed money without floating point coercion', () => {
  assert.equal(normalizeAgreedAmount('1,234.50'), '1234.50');
  assert.equal(normalizeAgreedAmount(null), null);
  assert.throws(() => normalizeAgreedAmount('12.345'), /two decimal places/);
});

test('preserves request lineage in the project intake snapshot', () => {
  const snapshot = buildProjectIntakeSnapshot(request, {
    decision: 'WON',
    decisionId: 'decision-1',
    estimateSheetId: 'sheet-1',
    estimateSubmissionId: 'submission-1',
    documentHash: 'hash-1',
    agreedAmount: '1234.50',
    decidedAt: '2026-07-21T01:00:00.000Z',
    decidedBy: 'manager-1',
  });
  assert.deepEqual(snapshot.source, {
    estimateRequestId: 'request-1',
    requestNo: 'ER-20260721-001',
    estimateId: null,
    estimateSheetId: 'sheet-1',
    estimateSubmissionId: 'submission-1',
    estimateDocumentHash: 'hash-1',
    commercialDecisionId: 'decision-1',
  });
  assert.equal((snapshot.project as Record<string, unknown>).projectName, 'Data Center');
  assert.equal((snapshot.decision as Record<string, unknown>).agreedAmount, '1234.50');
  assert.deepEqual(snapshot.attachments, request.attachments);
});
