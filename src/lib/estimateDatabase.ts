import type {
  EstimateDbAnnualPoint,
  EstimateDbAnnualReport,
  EstimateDbMonthlyTarget,
  EstimateDbPayload,
  EstimateDbRecord,
  EstimateDbSection,
  EstimateDbVendor,
} from '@/types/models';

export interface EstimateDbColumn { key: string; label: string; width?: number; kind?: 'text' | 'date' | 'money' | 'number' | 'boolean'; readonly?: boolean }

const cols = (labels: string[], money: string[] = [], dates: string[] = [], readonly: string[] = []): EstimateDbColumn[] => labels.map((label) => ({
  key: label,
  label,
  width: Math.max(112, Math.min(220, label.length * 15 + 28)),
  kind: money.includes(label) ? 'money' : dates.includes(label) ? 'date' : 'text',
  readonly: readonly.includes(label),
}));

const PJ_LABELS = ['최초생성날짜','접수번호','PJ NO','프로젝트 연결','국내/해외','거래처명','프로젝트명','거래처','거래처담당자','직급','일반전화','휴대폰','직통전화','EMAIL','EMAIL2','웹하드','secretRef','기타','작업공종','폴더명 / 자료위치','PM(마감)','PM(구조)','PM(토목,조경)','PM(기계)','PM(전기)','PM(인테리어)','PM(철거)','작업구분','업무성격','업무단계2','단가작업여부','건물용도','연면적(m2)','연면적(평)','층수','동수','타입수','세대수','수주일자','작업착수일자','1차납품예정일','1차납품일자','1차납품공종','2차납품예정일','2차납품일자','2차납품공종','3차납품예정일','상담 / 이메일 / 특기사항'];
const PROGRESS_LABELS = ['최초생성날짜','PJ NO','업체명','PJ명','계약금액','누적수금액','미수금잔액','발행완료','납품완료','작업진행중','작업대기중','작업취소','기계외주','전기외주','기타외주','소송비','기타비용','외주합계','기성조건','계좌정보','견적서일자','수주일','계약일자','총괄PM','1차납품','2차납품','3차납품','계약금_세금계산서','1차기성_세금계산서','2차기성_세금계산서','3차기성_세금계산서','4차기성_세금계산서','5차기성_세금계산서','계약금_입금예정일','1차기성_입금예정일','2차기성_입금예정일','3차기성_입금예정일','4차기성_입금예정일','5차기성_입금예정일','계약금_입금일','1차기성_입금일','2차기성_입금일','3차기성_입금일','4차기성_입금일','5차기성_입금일','1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월','미정','기성스토리','특이사항','거래처기성담당자','발행메일주소','기성담당자','연락예정일','기성청구완료'];
const MEP_LABELS = ['최초생성날짜','PJ NO','PJ명','계약금액','누적지급액','금회청구액','청구잔액','지급금액1','지급일자1','지급금액2','지급일자2','지급금액3','지급일자3','지급금액4','지급일자4','지급금액5','지급일자5','지급금액6','지급일자6','계약업체','컨코스트계약금','수령액','잔액','받은비율','받은비율대비 미지급액','기타'];
export const ESTIMATE_DB_VENDOR_COLUMNS = ['NO','업체명','공종','대표이사','일반전화','휴대폰','직통전화','EMAIL (대표)','대표번호','EMAIL','EMAIL1','연락처(경지)','연락처(기술)','계좌','은행','주소','웹하드','기타'];
const MONEY = ['계약금액','누적수금액','미수금잔액','기계외주','전기외주','기타외주','소송비','기타비용','외주합계','누적지급액','금회청구액','청구잔액','컨코스트계약금','수령액','잔액','받은비율대비 미지급액', ...Array.from({ length: 6 }, (_, index) => `지급금액${index + 1}`)];
const DATES = PJ_LABELS.filter((value) => value.includes('일자') || value.includes('예정일')).concat(PROGRESS_LABELS.filter((value) => value.includes('일') && !value.includes('일반')), MEP_LABELS.filter((value) => value.includes('일자')));

export const ESTIMATE_DB_COLUMNS: Record<EstimateDbSection, EstimateDbColumn[]> = {
  PJ: cols(PJ_LABELS, [], DATES),
  PROGRESS: cols(PROGRESS_LABELS, MONEY, DATES, ['미수금잔액', '외주합계']),
  MEP_CONTRACT: cols(MEP_LABELS, MONEY, DATES, ['청구잔액']),
};

const toMinor = (value: unknown) => {
  const normalized = String(value ?? '0').replace(/,/g, '').trim();
  if (!/^-?\d+(\.\d{0,2})?$/.test(normalized)) return BigInt(0);
  const negative = normalized.startsWith('-');
  const [whole, decimal = ''] = normalized.replace('-', '').split('.');
  const result = BigInt(whole || '0') * BigInt(100) + BigInt((decimal + '00').slice(0, 2));
  return negative ? -result : result;
};
const fromMinor = (value: bigint) => `${value < BigInt(0) ? '-' : ''}${(value < BigInt(0) ? -value : value) / BigInt(100)}.${String((value < BigInt(0) ? -value : value) % BigInt(100)).padStart(2, '0')}`;
const amount = (data: EstimateDbPayload, keys: string[]) => data[keys.find((key) => data[key] !== undefined) || ''] ?? '0';

export const calculateEstimateDbPayload = (section: EstimateDbSection, payload: EstimateDbPayload) => {
  const data = Object.fromEntries(Object.entries(payload).filter(([key]) => !['ID', 'PW', '비밀번호', 'PASSWORD', 'WEBHARD_ID', '웹하드ID', '웹하드PW'].includes(key.toUpperCase())));
  if (section === 'PROGRESS') {
    const balance = toMinor(amount(data, ['계약금액'])) - toMinor(amount(data, ['누적수금액']));
    const outsource = ['기계외주','전기외주','기타외주','소송비','기타비용'].reduce((sum, key) => sum + toMinor(data[key]), BigInt(0));
    return { ...data, '미수금잔액': fromMinor(balance), '외주합계': fromMinor(outsource) };
  }
  if (section === 'MEP_CONTRACT') {
    const balance = toMinor(amount(data, ['계약금액'])) - toMinor(amount(data, ['누적지급액'])) - toMinor(amount(data, ['금회청구액']));
    return { ...data, '청구잔액': fromMinor(balance) };
  }
  return data;
};

const series = (records: EstimateDbRecord[], year: number, dateKeys: string[], amountKeys: string[]): EstimateDbAnnualPoint[] => Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  const total = records.reduce((sum, record) => {
    const date = String(amount(record.data, dateKeys));
    if (!date.startsWith(`${year}-${String(month).padStart(2, '0')}`)) return sum;
    return sum + toMinor(amount(record.data, amountKeys));
  }, BigInt(0));
  return { month, amount: fromMinor(total) };
});

export const buildEstimateDbReport = (records: EstimateDbRecord[], targets: EstimateDbMonthlyTarget[], year: number): EstimateDbAnnualReport => ({
  year,
  order: series(records, year, ['수주일','수주일자','orderDate'], ['수주금액','orderAmount','계약금액']),
  sales: series(records, year, ['매출일','salesDate'], ['매출액','salesAmount']),
  deposit: series(records, year, ['입금일','depositDate','계약금_입금일'], ['입금액','depositAmount','누적수금액']),
  targets: targets.filter((target) => target.year === year).map(({ type, month, amount: value, version }) => ({ type, month, amount: value, version })),
});

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const exportEstimateDbJson = async (records: EstimateDbRecord[], vendors: EstimateDbVendor[], targets: EstimateDbMonthlyTarget[]) => {
  const exportedAt = new Date().toISOString();
  const body = { schemaVersion: 1, exportedAt, records, vendors, targets };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body)));
  const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  saveBlob(new Blob([JSON.stringify({ ...body, checksum }, null, 2)], { type: 'application/json' }), `concost_db_${exportedAt.slice(0, 10)}.json`);
};

export const buildEstimateDbWorkbook = async (records: EstimateDbRecord[], vendors: EstimateDbVendor[], report: EstimateDbAnnualReport) => {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const addRows = <T extends object>(name: string, rows: T[]) => {
    const sheet = workbook.addWorksheet(name);
    const normalizedRows = rows.map((row) => Object.fromEntries(Object.entries(row)));
    const headers = [...new Set(normalizedRows.flatMap((row) => Object.keys(row)))];
    if (!headers.length) return;
    sheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(12, Math.min(32, header.length + 4)) }));
    normalizedRows.forEach((row) => sheet.addRow(row));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.getRow(1).font = { bold: true };
  };
  (['PJ', 'PROGRESS', 'MEP_CONTRACT'] as EstimateDbSection[]).forEach((section) => {
    const rows = records.filter((record) => record.section === section).map((record) => ({ id: record.id, pjNo: record.pjNo || '', ...record.data }));
    addRows(section === 'PJ' ? 'DB_프로젝트' : section === 'PROGRESS' ? 'DB_기성' : 'DB기전외주', rows);
  });
  addRows('기전업체', vendors.map((vendor) => vendor.data));
  addRows('수주', report.order);
  addRows('매출', report.sales);
  addRows('입금', report.deposit);
  return workbook.xlsx.writeBuffer();
};

export const exportEstimateDbXlsx = async (records: EstimateDbRecord[], vendors: EstimateDbVendor[], report: EstimateDbAnnualReport) => {
  const buffer = await buildEstimateDbWorkbook(records, vendors, report);
  saveBlob(
    new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `CONCOST_DB_${report.year}_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.xlsx`,
  );
};
