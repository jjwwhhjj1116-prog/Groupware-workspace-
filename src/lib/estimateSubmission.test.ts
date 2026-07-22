import assert from 'node:assert/strict';
import test from 'node:test';
import { filterEstimateSubmissions, summarizeEstimateSubmissions } from './estimateSubmission';
import { EstimateSubmissionListItem } from '@/types/models';

const makeRow = (overrides: Partial<EstimateSubmissionListItem> = {}): EstimateSubmissionListItem => ({
  id: 'submission-1',
  estimateSheetId: 'sheet-1',
  estimateRequestId: 'request-1',
  requestNo: 'ER-20260720-001',
  projectName: 'AI 데이터센터',
  company: 'CON-COST',
  departmentId: 'dept-a',
  requestStatus: 'WAITING',
  templateType: '개산견적',
  version: 2,
  status: 'SENT',
  submittedAt: '2026-07-20T03:00:00.000Z',
  submittedBy: 'pm-1',
  sentAt: '2026-07-20T04:00:00.000Z',
  sentBy: 'pm-1',
  recipient: '발주처',
  deliveryChannel: 'EMAIL',
  documentHash: 'a'.repeat(64),
  decisionReady: true,
  summary: { requestNo: 'ER-20260720-001', projectName: 'AI 데이터센터', company: 'CON-COST', serviceDescription: '', total: '', templateType: '개산견적', version: 2 },
  createdAt: '2026-07-20T03:00:00.000Z',
  updatedAt: '2026-07-20T04:00:00.000Z',
  ...overrides,
});

test('filters submissions by linked request, status, type and date', () => {
  const rows = [makeRow(), makeRow({ id: 'submission-2', status: 'SUBMITTED', decisionReady: false, templateType: '공내역서' })];
  assert.equal(filterEstimateSubmissions(rows, { query: '데이터센터', status: 'SENT', templateType: '개산견적', from: '2026-07-20', to: '2026-07-20' }).length, 1);
  assert.equal(filterEstimateSubmissions(rows, { query: '', status: 'ALL', templateType: '설계예가', from: '', to: '' }).length, 0);
});

test('summarizes decision readiness independently from submission state', () => {
  const summary = summarizeEstimateSubmissions([makeRow(), makeRow({ id: 'submission-2', status: 'SUBMITTED', decisionReady: false })]);
  assert.deepEqual(summary, { total: 2, submitted: 1, sent: 1, ready: 1 });
});
