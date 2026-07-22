const { readWorkbook, sheetRows } = require('./scripts/exceljsRows');

(async () => {
const workbook = await readWorkbook('(구조팀) VN 스케줄표_2026.07.01(1).xlsx');

console.log("=== Sheets ===");
console.log(workbook.worksheets.map((sheet) => sheet.name));

if (workbook.getWorksheet('Project List')) {
  console.log("\n=== Project List (First 5 rows) ===");
  const json = sheetRows(workbook.getWorksheet('Project List'));
  console.log(JSON.stringify(json.slice(0, 5), null, 2));
}

if (workbook.getWorksheet('2026★')) {
  console.log("\n=== 2026★ (First 50 rows, first 10 columns) ===");
  const json = sheetRows(workbook.getWorksheet('2026★'));
  json.slice(0, 50).forEach(row => {
    console.log(JSON.stringify(row.slice(0, 10)));
  });
}
})().catch((error) => { console.error(error); process.exitCode = 1; });
