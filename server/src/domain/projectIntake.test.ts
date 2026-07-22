import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertProjectIntakeTransition,
  buildProjectIntakeDraft,
  canEditProjectIntake,
  canReviewProjectIntake,
  canViewProjectIntake,
  evaluateProjectIntakeCompleteness,
  projectIntakeDraftSchema,
} from './projectIntake';

const ids = {
  projectId: 'project-1',
  commercialDecisionId: 'decision-1',
  projectNo: 'ER-20260721-001',
};

const snapshot = {
  source: {
    estimateRequestId: 'request-1',
    requestNo: 'ER-20260721-001',
    estimateSheetId: 'sheet-1',
    estimateSubmissionId: 'submission-1',
    commercialDecisionId: 'decision-1',
  },
  project: {
    projectName: 'Data Center',
    company: 'Client Company',
    client: 'Client Company',
    contact: 'Kim PM',
    phone: '02-0000-0000',
    scope: 'Structure, Finish',
    expectedStartDate: '2026-08-01',
    deliveries: ['2026-08-15', '', '', '2026-08-31'],
  },
  decision: { agreedAmount: '1200000' },
  attachments: [{ id: 'attachment-1', category: 'drawing', originalName: 'drawing.pdf', size: 100 }],
};

test('builds an intake draft from the immutable commercial snapshot', () => {
  const draft = buildProjectIntakeDraft(snapshot, ids);
  assert.equal(draft.projectName, 'Data Center');
  assert.equal(draft.source.projectId, 'project-1');
  assert.equal(draft.contacts[0].name, 'Kim PM');
  assert.equal(draft.materials[0].status, 'RECEIVED');
  assert.equal(draft.secretReferences.length, 0);
});

test('rejects plaintext credential values and accepts explicit secret references', () => {
  const draft = buildProjectIntakeDraft(snapshot, ids);
  assert.equal(projectIntakeDraftSchema.safeParse({
    ...draft,
    secretReferences: [{ id: 'secret-1', label: 'Webhard', provider: '1Password', reference: 'password123', note: '' }],
  }).success, false);
  assert.equal(projectIntakeDraftSchema.safeParse({
    ...draft,
    secretReferences: [{ id: 'secret-1', label: 'Webhard', provider: '1Password', reference: 'vault://concost/webhard', note: '' }],
  }).success, true);
});

test('reports data completeness before review', () => {
  const complete = buildProjectIntakeDraft(snapshot, ids);
  assert.deepEqual(evaluateProjectIntakeCompleteness(complete), []);
  assert.deepEqual(
    evaluateProjectIntakeCompleteness({ ...complete, projectName: '', contacts: [] }),
    ['projectName', 'contact'],
  );
});

test('requires review before acceptance and freezes accepted intakes', () => {
  assert.doesNotThrow(() => assertProjectIntakeTransition('DRAFT', 'REVIEWED'));
  assert.throws(() => assertProjectIntakeTransition('DRAFT', 'ACCEPTED'), /reviewed/);
  assert.throws(() => assertProjectIntakeTransition('ACCEPTED', 'REVIEWED'), /immutable/);
});

test('separates edit and review permissions', () => {
  const scope = { ownerId: 'pm-1', departmentId: 'dept-1' };
  assert.equal(canEditProjectIntake({ personnelId: 'pm-1', role: 'PM', departmentId: 'dept-1' }, scope), true);
  assert.equal(canViewProjectIntake({ personnelId: 'pm-2', role: 'PM', departmentId: 'dept-1' }, scope), true);
  assert.equal(canEditProjectIntake({ personnelId: 'pm-2', role: 'PM', departmentId: 'dept-1' }, scope), false);
  assert.equal(canReviewProjectIntake({ personnelId: 'pm-1', role: 'PM', departmentId: 'dept-1' }, scope), false);
  assert.equal(canReviewProjectIntake({ personnelId: 'manager-1', role: 'DEPARTMENT_MANAGER', departmentId: 'dept-1' }, scope), true);
  assert.equal(canViewProjectIntake({ personnelId: 'worker-1', role: 'WORKER', departmentId: 'dept-1' }, scope), false);
});
