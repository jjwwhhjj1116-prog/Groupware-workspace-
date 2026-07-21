export const ESTIMATE_DB_SECTIONS = ['PJ', 'PROGRESS', 'MEP_CONTRACT'] as const;
export const ESTIMATE_DB_TARGET_TYPES = ['ORDER', 'SALES', 'DEPOSIT'] as const;
export const ESTIMATE_DB_ROLES = ['DEPARTMENT_MANAGER', 'SUPER_ADMIN', 'SYSTEM_ADMIN'] as const;

export type EstimateDbSection = typeof ESTIMATE_DB_SECTIONS[number];
export type EstimateDbPayload = Record<string, string | number | boolean | null>;

const SECRET_KEYS = new Set(['ID', 'PW', 'PASSWORD', 'PASSWORD_TEXT', 'WEBHARD_ID', '비밀번호', '웹하드ID', '웹하드PW']);

const toMinor = (value: unknown): bigint => {
  if (typeof value === 'bigint') return value;
  const normalized = String(value ?? '0').replace(/,/g, '').trim();
  if (!/^-?\d+(\.\d{0,2})?$/.test(normalized)) return 0n;
  const negative = normalized.startsWith('-');
  const [whole, decimal = ''] = normalized.replace('-', '').split('.');
  const minor = BigInt(whole || '0') * 100n + BigInt((decimal + '00').slice(0, 2));
  return negative ? -minor : minor;
};

const fromMinor = (value: bigint): string => {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  return `${negative ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
};

export const addMoney = (...values: unknown[]) => fromMinor(values.reduce<bigint>((sum, value) => sum + toMinor(value), 0n));
export const subtractMoney = (value: unknown, ...subtractors: unknown[]) =>
  fromMinor(subtractors.reduce<bigint>((sum, item) => sum - toMinor(item), toMinor(value)));

export const sanitizeEstimateDbPayload = (payload: EstimateDbPayload): EstimateDbPayload =>
  Object.fromEntries(Object.entries(payload).filter(([key]) => !SECRET_KEYS.has(key.trim().toUpperCase())));

const pick = (payload: EstimateDbPayload, keys: string[]) => {
  const key = keys.find((candidate) => payload[candidate] !== undefined);
  return key ? payload[key] : '0';
};

export const calculateProgressPayload = (payload: EstimateDbPayload): EstimateDbPayload => ({
  ...sanitizeEstimateDbPayload(payload),
  '미수금잔액': subtractMoney(pick(payload, ['계약금액', 'contractAmount']), pick(payload, ['누적수금액', 'receivedAmount'])),
  '외주합계': addMoney(
    pick(payload, ['기계외주', 'mechanicalOutsource']),
    pick(payload, ['전기외주', 'electricalOutsource']),
    pick(payload, ['기타외주', 'otherOutsource']),
    pick(payload, ['소송비', 'litigationCost']),
    pick(payload, ['기타비용', 'otherCost']),
  ),
});

export const calculateMepPayload = (payload: EstimateDbPayload): EstimateDbPayload => ({
  ...sanitizeEstimateDbPayload(payload),
  '청구잔액': subtractMoney(
    pick(payload, ['계약금액', 'contractAmount']),
    pick(payload, ['누적지급액', 'paidAmount']),
    pick(payload, ['금회청구액', 'currentRequestAmount']),
  ),
});

export const calculateRecordPayload = (section: EstimateDbSection, payload: EstimateDbPayload) => {
  if (section === 'PROGRESS') return calculateProgressPayload(payload);
  if (section === 'MEP_CONTRACT') return calculateMepPayload(payload);
  return sanitizeEstimateDbPayload(payload);
};

export const normalizeVendorIdentity = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR');

export const reportMonth = (value: unknown) => {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})/);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
};

export const buildAnnualSeries = (
  records: Array<{ data: EstimateDbPayload }>,
  year: number,
  dateKeys: string[],
  amountKeys: string[],
) => Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  const amount = records.reduce<bigint>((sum, record) => {
    const date = reportMonth(pick(record.data, dateKeys));
    if (!date || date.year !== year || date.month !== month) return sum;
    return sum + toMinor(pick(record.data, amountKeys));
  }, 0n);
  return { month, amount: fromMinor(amount) };
});

export const canManageEstimateDatabase = (role: string | undefined) => ESTIMATE_DB_ROLES.includes(role as typeof ESTIMATE_DB_ROLES[number]);
