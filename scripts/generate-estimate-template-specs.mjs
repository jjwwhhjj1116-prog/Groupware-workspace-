import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourcePath = resolve(process.argv[2] || '../offday2/work-project-receive-estimate-sheet.js');
const outputPath = resolve('src/data/estimateTemplateSpecs.generated.json');
const source = await readFile(sourcePath, 'utf8');
const declaration = 'const ESTIMATE_EXCEL_SPECS = ';
const start = source.indexOf(declaration);

if (start < 0) throw new Error('ESTIMATE_EXCEL_SPECS declaration was not found');

const valueStart = start + declaration.length;
let depth = 0;
let quote = '';
let escaped = false;
let valueEnd = -1;

for (let index = valueStart; index < source.length; index += 1) {
  const character = source[index];
  if (quote) {
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === quote) quote = '';
    continue;
  }
  if (character === '"' || character === "'") quote = character;
  else if (character === '{') depth += 1;
  else if (character === '}' && --depth === 0) {
    valueEnd = index + 1;
    break;
  }
}

if (valueEnd < 0) throw new Error('ESTIMATE_EXCEL_SPECS object is incomplete');

const raw = source.slice(valueStart, valueEnd);
const specs = JSON.parse(raw);
const templates = Object.fromEntries(Object.entries(specs).map(([type, spec]) => [type, {
  ...spec,
  sourceHash: createHash('sha256').update(JSON.stringify(spec)).digest('hex'),
}]));
const payload = {
  sourceFile: 'work-project-receive-estimate-sheet.js',
  sourceCommit: '4406d2607ace6b64e8a165e4aae8d67e082b992b',
  sourcePayloadHash: createHash('sha256').update(raw).digest('hex'),
  generatedAt: '2026-07-20T00:00:00.000Z',
  templates,
};

await writeFile(outputPath, `${JSON.stringify(payload)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);
