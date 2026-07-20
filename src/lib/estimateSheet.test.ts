import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { buildEstimateWorkbook } from './estimateSheetExport';
import {
  ESTIMATE_TEMPLATE_SPECS,
  ESTIMATE_TEMPLATE_TYPES,
  createEstimateSheetState,
  displayEstimateCell,
} from './estimateSheetTemplates';

test('matches all four approved legacy template hashes', () => {
  for (const type of ESTIMATE_TEMPLATE_TYPES) {
    const { sourceHash, ...spec } = ESTIMATE_TEMPLATE_SPECS[type];
    const actual = createHash('sha256').update(JSON.stringify(spec)).digest('hex');
    assert.equal(actual, sourceHash, `${type} source hash`);
  }
});

test('evaluates the legacy SUM formula subset without dynamic code execution', () => {
  const state = createEstimateSheetState('개산견적');
  state.cells['1:1'] = { value: 10 };
  state.cells['2:1'] = { value: 15 };
  state.cells['3:1'] = { formula: 'SUM(A1:A2)' };
  assert.equal(displayEstimateCell(state, 3, 1), 25);
});

test('evaluates the legacy Korean amount and won concatenation', () => {
  const state = createEstimateSheetState('개산견적');
  state.cells['20:6'] = { value: 12345 };
  state.cells['10:2'] = { formula: '"일금"&NUMBERSTRING(F20,1)&"원정 ("&DOLLAR(F20)&")"' };
  assert.equal(displayEstimateCell(state, 10, 2), '일금일만이천삼백사십오원정 (₩12,345)');
});

for (const type of ESTIMATE_TEMPLATE_TYPES) {
  test(`round-trips ${type} workbook semantics`, async () => {
    const state = createEstimateSheetState(type);
    const spec = ESTIMATE_TEMPLATE_SPECS[type];
    const buffer = await buildEstimateWorkbook(state);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    const sourceFormulaCount = spec.cells.filter((cell) => Boolean(cell.f)).length;
    let outputFormulaCount = 0;
    worksheet.eachRow({ includeEmpty: true }, (row) => row.eachCell({ includeEmpty: true }, (cell) => {
      if (cell.type === ExcelJS.ValueType.Formula) outputFormulaCount += 1;
    }));

    assert.equal(worksheet.name, spec.sheet);
    assert.equal(worksheet.rowCount, spec.maxRow);
    assert.equal(worksheet.columnCount, spec.maxCol);
    assert.equal(worksheet.model.merges.length, spec.merges.length);
    assert.equal(outputFormulaCount, sourceFormulaCount);
    assert.equal(worksheet.getImages().length, spec.images.length);
    assert.equal(String(worksheet.pageSetup.printArea), `A1:G${spec.maxRow}`);
  });
}
