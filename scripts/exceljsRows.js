const ExcelJS = require('exceljs');

const cellValue = (value) => {
  if (value == null || value instanceof Date || typeof value !== 'object') return value ?? null;
  if (Array.isArray(value.richText)) return value.richText.map((item) => item.text || '').join('');
  if ('result' in value) return value.result ?? value.formula ?? null;
  if ('text' in value) return value.text;
  return String(value);
};

const sheetRows = (worksheet) => {
  const rows = [];
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const values = worksheet.getRow(rowNumber).values;
    rows.push(Array.from({ length: worksheet.columnCount }, (_, index) => cellValue(values[index + 1])));
  }
  return rows;
};

const readWorkbook = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return workbook;
};

module.exports = { readWorkbook, sheetRows };
