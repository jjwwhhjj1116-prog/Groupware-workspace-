import payload from '@/data/estimateTemplateSpecs.generated.json';
import { EstimateSheetState, EstimateTemplateType } from '@/types/models';

export interface EstimateTemplateCell {
  r: number;
  c: number;
  v: string | number | null;
  f: string | null;
  rs: number;
  cs: number;
  s: string;
}

export interface EstimateTemplateImage {
  data: string;
  from: { col: number; row: number; colOff?: number; rowOff?: number };
  to: { col: number; row: number; colOff?: number; rowOff?: number };
}

export interface EstimateTemplateSpec {
  sheet: string;
  maxRow: number;
  maxCol: number;
  printCols: number;
  zoom: number;
  cols: number[];
  rows: number[];
  cells: EstimateTemplateCell[];
  merges: [number, number, number, number][];
  images: EstimateTemplateImage[];
  sourceHash: string;
}

export const ESTIMATE_TEMPLATE_TYPES = ['개산견적', '공내역서', '설계예가', '공사비검증'] as const;
export const ESTIMATE_TEMPLATE_SOURCE = {
  file: payload.sourceFile,
  commit: payload.sourceCommit,
  payloadHash: payload.sourcePayloadHash,
};

export const ESTIMATE_TEMPLATE_SPECS = payload.templates as unknown as Record<EstimateTemplateType, EstimateTemplateSpec>;

export function createEstimateSheetState(type: EstimateTemplateType): EstimateSheetState {
  const spec = ESTIMATE_TEMPLATE_SPECS[type];
  const cells = Object.fromEntries(spec.cells.map((cell) => [`${cell.r}:${cell.c}`, {
    value: cell.v ?? '',
    formula: cell.f || '',
    userFormula: false,
  }]));
  return {
    type,
    cells,
    maxRow: spec.maxRow,
    maxCol: spec.maxCol,
    rowHeights: [...spec.rows],
    colWidths: [...spec.cols],
    merges: spec.merges.map((merge) => [...merge] as [number, number, number, number]),
  };
}

export const estimateCellKey = (row: number, column: number) => `${row}:${column}`;

export function columnLabel(column: number) {
  let value = column;
  let label = '';
  while (value > 0) {
    label = String.fromCharCode(65 + ((value - 1) % 26)) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

export function parseCellReference(reference: string) {
  const match = reference.replaceAll('$', '').match(/^([A-Z]{1,3})(\d+)$/i);
  if (!match) return null;
  let column = 0;
  for (const character of match[1].toUpperCase()) column = column * 26 + character.charCodeAt(0) - 64;
  return { row: Number(match[2]), column };
}

const numberValue = (value: unknown) => {
  const parsed = Number(String(value ?? '').replaceAll(',', '').replace(/[^\d.+-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

function koreanNumber(value: unknown) {
  let amount = Math.round(Math.abs(numberValue(value)));
  if (!amount) return '영';
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const smallUnits = ['', '십', '백', '천'];
  const largeUnits = ['', '만', '억', '조', '경'];
  const groups: string[] = [];
  let groupIndex = 0;
  while (amount > 0) {
    const chunk = amount % 10000;
    if (chunk) {
      const padded = String(chunk).padStart(4, '0');
      const text = [...padded].map((digit, index) => {
        const numeric = Number(digit);
        return numeric ? `${digits[numeric]}${smallUnits[3 - index]}` : '';
      }).join('');
      groups.unshift(`${text}${largeUnits[groupIndex] || ''}`);
    }
    amount = Math.floor(amount / 10000);
    groupIndex += 1;
  }
  return groups.join('');
}

const won = (value: unknown) => `₩${Math.round(numberValue(value)).toLocaleString('ko-KR')}`;

function evaluateConcatenatedPart(state: EstimateSheetState, part: string, stack: Set<string>) {
  const value = part.trim();
  const literal = value.match(/^"(.*)"$/);
  if (literal) return literal[1];
  const korean = value.match(/^NUMBERSTRING\(([^,]+),\s*1\)$/i);
  if (korean) {
    const reference = parseCellReference(korean[1].trim());
    return koreanNumber(reference ? displayEstimateCell(state, reference.row, reference.column, stack) : korean[1]);
  }
  const currency = value.match(/^DOLLAR\(([^)]+)\)$/i);
  if (currency) {
    const reference = parseCellReference(currency[1].trim());
    return won(reference ? displayEstimateCell(state, reference.row, reference.column, stack) : currency[1]);
  }
  const reference = parseCellReference(value);
  return reference ? displayEstimateCell(state, reference.row, reference.column, stack) : value;
}

function arithmetic(expression: string) {
  const tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/]/g) || [];
  let index = 0;
  const primary = (): number => {
    const token = tokens[index++];
    if (token === '(') {
      const value = addSubtract();
      index += Number(tokens[index] === ')');
      return value;
    }
    if (token === '-') return -primary();
    return Number(token || 0);
  };
  const multiplyDivide = (): number => {
    let value = primary();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index++];
      const right = primary();
      value = operator === '*' ? value * right : right === 0 ? 0 : value / right;
    }
    return value;
  };
  const addSubtract = (): number => {
    let value = multiplyDivide();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index++];
      const right = multiplyDivide();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };
  return addSubtract();
}

export function evaluateEstimateFormula(state: EstimateSheetState, formula: string, stack = new Set<string>()): string | number {
  const source = formula.replace(/^=/, '').trim();
  if (source.includes('&')) {
    return source.split('&').map((part) => evaluateConcatenatedPart(state, part, stack)).join('');
  }

  let expression = source.replace(/SUM\(([^)]+)\)/gi, (_, range: string) => {
    const [start, finish = start] = range.split(':').map(parseCellReference);
    if (!start || !finish) return '0';
    let total = 0;
    for (let row = start.row; row <= finish.row; row += 1) {
      for (let column = start.column; column <= finish.column; column += 1) {
        total += numberValue(displayEstimateCell(state, row, column, stack));
      }
    }
    return String(total);
  });
  expression = expression.replace(/(?:DOLLAR|NUMBERSTRING)\(([^,)]+)(?:,\s*1)?\)/gi, '$1');
  expression = expression.replace(/\$?([A-Z]{1,3})\$?(\d+)/gi, (reference) => {
    const parsed = parseCellReference(reference);
    return parsed ? String(numberValue(displayEstimateCell(state, parsed.row, parsed.column, stack))) : '0';
  });
  if (!/^[\d.+\-*/()\s]+$/.test(expression)) return 0;
  return arithmetic(expression);
}

export function displayEstimateCell(state: EstimateSheetState, row: number, column: number, stack = new Set<string>()): string | number {
  const key = estimateCellKey(row, column);
  if (stack.has(key)) return '#CYCLE!';
  const cell = state.cells[key];
  if (!cell) return '';
  if (!cell.formula) return cell.value ?? '';
  const next = new Set(stack).add(key);
  const value = evaluateEstimateFormula(state, cell.formula, next);
  return typeof value === 'number' && Number.isFinite(value) ? value : String(value ?? '');
}

export function templateCell(type: EstimateTemplateType, row: number, column: number) {
  return ESTIMATE_TEMPLATE_SPECS[type].cells.find((cell) => cell.r === row && cell.c === column);
}
