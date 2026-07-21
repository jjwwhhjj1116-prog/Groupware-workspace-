import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addMoney,
  buildAnnualSeries,
  calculateMepPayload,
  calculateProgressPayload,
  canManageEstimateDatabase,
  sanitizeEstimateDbPayload,
  subtractMoney,
} from './estimateDatabase';

test('calculates money without binary floating point drift', () => {
  assert.equal(addMoney('0.10', '0.20', '1,000'), '1000.30');
  assert.equal(subtractMoney('1000', '300.25', '99.75'), '600.00');
});

test('derives progress and MEP balances from source amounts', () => {
  const progress = calculateProgressPayload({ '계약금액': '1000', '누적수금액': '350', '기계외주': '10', '전기외주': '20', '기타외주': '30', '소송비': '40', '기타비용': '50' });
  assert.equal(progress['미수금잔액'], '650.00');
  assert.equal(progress['외주합계'], '150.00');
  const mep = calculateMepPayload({ '계약금액': '1000', '누적지급액': '250', '금회청구액': '100' });
  assert.equal(mep['청구잔액'], '650.00');
});

test('strips plaintext secret fields and keeps a secret reference', () => {
  assert.deepEqual(sanitizeEstimateDbPayload({ ID: 'legacy-id', PW: 'secret', '비밀번호': 'secret', secretRef: 'vault://webhard/1' }), { secretRef: 'vault://webhard/1' });
});

test('aggregates annual report values by date month', () => {
  const rows = buildAnnualSeries([
    { data: { orderDate: '2026-01-10', orderAmount: '100.25' } },
    { data: { orderDate: '2026-01-20', orderAmount: '49.75' } },
  ], 2026, ['orderDate'], ['orderAmount']);
  assert.equal(rows[0].amount, '150.00');
  assert.equal(rows[1].amount, '0.00');
});

test('limits database management to approved roles', () => {
  assert.equal(canManageEstimateDatabase('DEPARTMENT_MANAGER'), true);
  assert.equal(canManageEstimateDatabase('SUPER_ADMIN'), true);
  assert.equal(canManageEstimateDatabase('PM'), false);
  assert.equal(canManageEstimateDatabase('WORKER'), false);
});
