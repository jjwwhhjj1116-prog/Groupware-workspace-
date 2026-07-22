export const ESTIMATE_REQUEST_STATUSES = [
  'REQUEST_MEMO',
  'ESTIMATE_DRAFTING',
  'WAITING',
  'WON',
  'LOST',
  'CANCELLED',
  'ON_HOLD',
  'OTHER',
] as const;

export type EstimateRequestStatus = typeof ESTIMATE_REQUEST_STATUSES[number];

export const ESTIMATE_REQUEST_ACTIVITY_KINDS = [
  'CONSULTATION',
  'CALL',
  'EMAIL',
  'NOTE',
] as const;

export type EstimateRequestActivityKind = typeof ESTIMATE_REQUEST_ACTIVITY_KINDS[number];

const STATUS_ALIASES: Record<string, EstimateRequestStatus> = {
  '의뢰메모': 'REQUEST_MEMO',
  '견적서 작성중': 'ESTIMATE_DRAFTING',
  '견적작성중': 'ESTIMATE_DRAFTING',
  '견적요청': 'WAITING',
  '발송완료': 'WAITING',
  '대기중': 'WAITING',
  '승인완료': 'WON',
  '착수완료': 'WON',
  'DB등록': 'WON',
  '작업시작': 'WON',
  '수주': 'WON',
  '선착수': 'LOST',
  '실주': 'LOST',
  '작업취소': 'CANCELLED',
  '취소': 'CANCELLED',
  '기타': 'OTHER',
};

export type EstimateRequestActor = {
  personnelId: string;
  role: string;
  departmentId: string;
};

export type EstimateRequestScope = {
  ownerId: string | null;
  departmentId: string;
};

export function normalizeEstimateRequestStatus(value: unknown): EstimateRequestStatus {
  const normalized = String(value ?? '').trim();
  if ((ESTIMATE_REQUEST_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as EstimateRequestStatus;
  }
  return STATUS_ALIASES[normalized] ?? 'REQUEST_MEMO';
}

export function canCreateEstimateRequest(actor: EstimateRequestActor): boolean {
  return ['PM', 'DEPARTMENT_MANAGER', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
}

export function canViewEstimateRequest(actor: EstimateRequestActor, request: EstimateRequestScope): boolean {
  if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) return true;
  if (!['PM', 'DEPARTMENT_MANAGER'].includes(actor.role)) return false;
  return request.departmentId === actor.departmentId || request.ownerId === actor.personnelId;
}

export function canManageEstimateRequest(actor: EstimateRequestActor, request: EstimateRequestScope): boolean {
  if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) return true;
  if (actor.role === 'DEPARTMENT_MANAGER') return request.departmentId === actor.departmentId;
  return actor.role === 'PM' && request.ownerId === actor.personnelId;
}

export function buildRequestNumber(now = new Date(), suffix = ''): string {
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('');
  const tail = suffix || Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ER-${date}-${tail}`;
}
