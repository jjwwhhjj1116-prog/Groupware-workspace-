import { EstimateSheetState } from '@/types/models';
import {
  ESTIMATE_TEMPLATE_SPECS,
  columnLabel,
  displayEstimateCell,
  templateCell,
} from '@/lib/estimateSheetTemplates';

const cssMap = (style = '') => Object.fromEntries(style.split(';').map((rule) => rule.split(':')).filter((entry) => entry.length > 1).map(([key, ...value]) => [key.trim().toLowerCase(), value.join(':').trim()]));

const color = (value?: string) => {
  if (!value || value === 'transparent') return undefined;
  const hex = value.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i)?.[1];
  if (hex) return (hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex).toUpperCase();
  const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return rgb ? rgb.slice(1).map((part) => Number(part).toString(16).padStart(2, '0')).join('').toUpperCase() : undefined;
};

const border = (value?: string) => {
  if (!value || value === 'none') return undefined;
  const borderColor = color(value) || '000000';
  const style = value.includes('double') ? 'double' : value.includes('dashed') ? 'dashed' : value.includes('dotted') ? 'dotted' : value.includes('medium') || /[2-9]px/.test(value) ? 'medium' : 'thin';
  return { style, color: { argb: `FF${borderColor}` } };
};

const excelStyle = (styleText: string) => {
  const css = cssMap(styleText);
  const fontColor = color(css.color);
  const fillColor = color(css['background-color'] || css.background);
  const fontSize = Number.parseFloat(css['font-size'] || '11');
  const allBorder = border(css.border);
  const result: Record<string, unknown> = {
    font: {
      name: (css['font-family'] || 'Malgun Gothic').split(',')[0].replaceAll(/["']/g, '').trim(),
      size: Number.isFinite(fontSize) ? fontSize : 11,
      bold: css['font-weight'] === 'bold' || Number(css['font-weight']) >= 600,
      italic: css['font-style'] === 'italic',
      color: fontColor ? { argb: `FF${fontColor}` } : undefined,
    },
    alignment: {
      horizontal: css['text-align'] === 'right' ? 'right' : css['text-align'] === 'center' ? 'center' : 'left',
      vertical: css['vertical-align'] === 'top' ? 'top' : css['vertical-align'] === 'bottom' ? 'bottom' : 'middle',
      wrapText: css['white-space'] !== 'nowrap',
    },
  };
  if (fillColor) result.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${fillColor}` } };
  const borders = {
    top: border(css['border-top']) || allBorder,
    right: border(css['border-right']) || allBorder,
    bottom: border(css['border-bottom']) || allBorder,
    left: border(css['border-left']) || allBorder,
  };
  if (Object.values(borders).some(Boolean)) result.border = borders;
  return result;
};

export async function buildEstimateWorkbook(state: EstimateSheetState) {
  const ExcelJS = (await import('exceljs')).default;
  const spec = ESTIMATE_TEMPLATE_SPECS[state.type];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CON-COST Groupware';
  workbook.created = new Date(0);
  workbook.modified = new Date(0);
  const worksheet = workbook.addWorksheet(spec.sheet || state.type, {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    properties: { defaultRowHeight: 18 },
  });
  worksheet.views = [{ showGridLines: true, zoomScale: spec.zoom || 85, zoomScaleNormal: spec.zoom || 85 }];
  worksheet.pageSetup.printArea = `A1:${columnLabel(spec.printCols || 7)}${state.maxRow}`;
  worksheet.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0, footer: 0 };

  for (let column = 1; column <= state.maxCol; column += 1) {
    worksheet.getColumn(column).width = Math.max(1, (state.colWidths[column - 1] || 64) / 7);
  }
  for (let row = 1; row <= state.maxRow; row += 1) {
    worksheet.getRow(row).height = Math.round((state.rowHeights[row - 1] || 20) * 0.75 * 100) / 100;
    for (let column = 1; column <= state.maxCol; column += 1) {
      const source = state.cells[`${row}:${column}`] || {};
      const target = worksheet.getCell(row, column);
      if (source.formula) target.value = { formula: source.formula.replace(/^=/, ''), result: displayEstimateCell(state, row, column) as string | number };
      else target.value = source.value ?? '';
      target.style = excelStyle(templateCell(state.type, row, column)?.s || '') as typeof target.style;
    }
  }
  state.merges.forEach(([row1, column1, row2, column2]) => worksheet.mergeCells(row1, column1, row2, column2));
  spec.images.forEach((image) => {
    const match = image.data.match(/^data:image\/(\w+);base64,(.*)$/);
    if (!match) return;
    const extension = (match[1] === 'jpeg' ? 'jpg' : match[1]) as 'png' | 'jpeg' | 'gif';
    const imageId = workbook.addImage({ base64: match[2], extension });
    const range = { tl: { col: image.from.col, row: image.from.row }, br: { col: image.to.col, row: image.to.row }, editAs: 'oneCell' };
    worksheet.addImage(imageId, range as never);
  });
  return workbook.xlsx.writeBuffer();
}

export function estimateFileName(type: string, extension: 'xlsx' | 'pdf') {
  return `CONCOST_${type}_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.${extension}`;
}

export async function downloadEstimateWorkbook(state: EstimateSheetState) {
  const buffer = await buildEstimateWorkbook(state);
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = estimateFileName(state.type, 'xlsx');
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return anchor.download;
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);

export function printEstimateSheet(state: EstimateSheetState) {
  const spec = ESTIMATE_TEMPLATE_SPECS[state.type];
  const printColumns = spec.printCols || 7;
  const starts = new Map(state.merges.map((merge) => [`${merge[0]}:${merge[1]}`, merge]));
  const skips = new Set<string>();
  state.merges.forEach(([row1, column1, row2, column2]) => {
    for (let row = row1; row <= row2; row += 1) for (let column = column1; column <= column2; column += 1) if (row !== row1 || column !== column1) skips.add(`${row}:${column}`);
  });
  const rows = Array.from({ length: state.maxRow }, (_, rowIndex) => {
    const row = rowIndex + 1;
    const cells = Array.from({ length: printColumns }, (_, columnIndex) => {
      const column = columnIndex + 1;
      const key = `${row}:${column}`;
      if (skips.has(key)) return '';
      const merge = starts.get(key);
      const spans = merge ? ` rowspan="${merge[2] - merge[0] + 1}" colspan="${Math.min(printColumns, merge[3]) - merge[1] + 1}"` : '';
      return `<td${spans} style="${escapeHtml(templateCell(state.type, row, column)?.s || '')}">${escapeHtml(displayEstimateCell(state, row, column))}</td>`;
    }).join('');
    return `<tr style="height:${state.rowHeights[rowIndex] || 20}px">${cells}</tr>`;
  }).join('');
  const widths = state.colWidths.slice(0, printColumns).map((width) => `<col style="width:${width}px">`).join('');
  const axisOffset = (sizes: number[], index: number, offset = 0) => sizes.slice(0, index).reduce((sum, size) => sum + size, 0) + offset / 9525;
  const images = spec.images.map((image) => {
    const left = axisOffset(state.colWidths, image.from.col, image.from.colOff);
    const top = axisOffset(state.rowHeights, image.from.row, image.from.rowOff);
    const right = axisOffset(state.colWidths, image.to.col, image.to.colOff);
    const bottom = axisOffset(state.rowHeights, image.to.row, image.to.rowOff);
    return `<img src="${image.data}" alt="CON-COST" style="position:absolute;left:${left}px;top:${top}px;width:${Math.max(1, right - left)}px;height:${Math.max(1, bottom - top)}px;object-fit:contain">`;
  }).join('');
  const popup = window.open('', 'CONCOST_ESTIMATE_PRINT', 'width=900,height=1000,resizable=yes,scrollbars=yes');
  if (!popup) throw new Error('Print popup was blocked');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(estimateFileName(state.type, 'pdf'))}</title><style>@page{size:A4 portrait;margin:10mm}body{font-family:'Malgun Gothic',sans-serif;margin:0}.page{position:relative;width:${state.colWidths.slice(0, printColumns).reduce((sum, width) => sum + width, 0)}px}.images{position:absolute;inset:0;z-index:2;pointer-events:none}table{border-collapse:collapse;table-layout:fixed;position:relative;z-index:1}td{overflow:visible;white-space:nowrap}</style></head><body><div class="page"><div class="images">${images}</div><table><colgroup>${widths}</colgroup><tbody>${rows}</tbody></table></div><script>window.onload=()=>setTimeout(()=>window.print(),100)</script></body></html>`);
  popup.document.close();
  return estimateFileName(state.type, 'pdf');
}
