import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PROFIT_CATEGORIES,
  PROFIT_GRADES,
  analysisStatus,
  calculateProjectProfit,
  canEditProjectProfit,
  canManageUnitPrices,
  canViewUnitPrices,
  minorToMoney,
  moneyToMinor,
  projectProfitUpdateSchema,
} from './projectProfit';

const emptyContracts = PROFIT_CATEGORIES.map((category) => ({ category, amount: '0' }));
const emptyOther = ['MECHANICAL', 'ELECTRICAL', 'OUTSOURCING', 'AS'].map((category) => ({ category: category as 'MECHANICAL' | 'ELECTRICAL' | 'OUTSOURCING' | 'AS', amount: '0' }));
const prices = PROFIT_GRADES.map((grade) => ({ grade, unitPrice: grade === 'TEAM_LEADER' ? '125000' : '0' }));

test('money conversion remains exact at decimal boundaries', () => {
  assert.equal(moneyToMinor('123456789.05'), 12345678905n);
  assert.equal(minorToMoney(-125n), '-1.25');
});

test('legacy formula vector traces member days and other costs', () => {
  const summary = calculateProjectProfit({
    contractAmounts: emptyContracts.map((row) => row.category === 'STRUCTURE' ? { ...row, amount: '1000000' } : row),
    unitPrices: prices,
    rounds: [
      { roundNo: 1, members: [{ category: 'STRUCTURE', grade: 'TEAM_LEADER', workDates: ['2026-07-01', '2026-07-02', '2026-07-02'] }], otherCosts: emptyOther.map((row) => row.category === 'OUTSOURCING' ? { ...row, amount: '100000' } : row) },
      { roundNo: 2, members: [], otherCosts: emptyOther },
      { roundNo: 3, members: [], otherCosts: emptyOther },
    ],
  });
  assert.equal(summary.contractTotal, '1000000.00');
  assert.equal(summary.roundTotals[0].amount, '350000.00');
  assert.equal(summary.costTotal, '350000.00');
  assert.equal(summary.result, '650000.00');
  assert.equal(analysisStatus(summary), 'ANALYZED');
});

test('profit permissions separate project editing from global price management', () => {
  const scope = { managerId: 'manager', managerDepartmentId: 'dept-a', pmId: 'pm', assignmentIds: ['worker'] };
  assert.equal(canEditProjectProfit({ personnelId: 'pm', role: 'PM', departmentId: 'dept-b' }, scope), true);
  assert.equal(canEditProjectProfit({ personnelId: 'worker', role: 'WORKER', departmentId: 'dept-a' }, scope), false);
  assert.equal(canViewUnitPrices({ personnelId: 'manager', role: 'DEPARTMENT_MANAGER', departmentId: 'dept-a' }, scope), true);
  assert.equal(canManageUnitPrices({ personnelId: 'manager', role: 'DEPARTMENT_MANAGER', departmentId: 'dept-a' }), false);
  assert.equal(canManageUnitPrices({ personnelId: 'admin', role: 'SUPER_ADMIN', departmentId: 'hq' }), true);
});

test('analysis input requires complete category and round vectors', () => {
  const valid = {
    expectedVersion: 1,
    contractAmounts: PROFIT_CATEGORIES.map((category) => ({ category, amount: '0', sourceType: 'MANUAL' as const })),
    rounds: [1, 2, 3].map((roundNo) => ({ roundNo, members: [], otherCosts: emptyOther.map((row) => ({ ...row, sourceType: 'MANUAL' as const })) })),
  };
  assert.equal(projectProfitUpdateSchema.safeParse(valid).success, true);
  assert.equal(projectProfitUpdateSchema.safeParse({ ...valid, rounds: valid.rounds.slice(0, 2) }).success, false);
});
