export const ESTIMATE_TEMPLATE_TYPES = ['개산견적', '공내역서', '설계예가', '공사비검증'] as const;
export type EstimateTemplateType = typeof ESTIMATE_TEMPLATE_TYPES[number];

export const ESTIMATE_TEMPLATE_META: Record<EstimateTemplateType, { sheetName: string; sourceHash: string }> = {
  개산견적: { sheetName: '개산견적', sourceHash: 'caa06c286e9ee783cfb33ecd1123b2cefe78715c4b3109e2ff83a5b57727f1bd' },
  공내역서: { sheetName: '공내역서', sourceHash: '84cbee512f37d1a5cf6d46db301519c527f0bb654a833733c5c271fe82abed87' },
  설계예가: { sheetName: '설계예가', sourceHash: 'f2a996f2294164e8fbc2f2a10bd830d19f749dd1b84be4af23aff6a880b3d4c7' },
  공사비검증: { sheetName: 'Sheet1', sourceHash: '2b22087a40a5bc3ee2da3ae11e8da386c437d68901505eac44fd9ad6c89d83e1' },
};

export type EstimateSheetActor = { personnelId: string; role: string; departmentId: string };
export type EstimateSheetScope = { ownerId: string | null; departmentId: string };

export function canViewEstimateSheet(actor: EstimateSheetActor, request: EstimateSheetScope) {
  if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) return true;
  return ['PM', 'DEPARTMENT_MANAGER'].includes(actor.role)
    && (request.departmentId === actor.departmentId || request.ownerId === actor.personnelId);
}

export function canEditEstimateSheet(actor: EstimateSheetActor, request: EstimateSheetScope) {
  if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) return true;
  if (actor.role === 'DEPARTMENT_MANAGER') return request.departmentId === actor.departmentId;
  return actor.role === 'PM' && request.ownerId === actor.personnelId;
}

export function assertVersion(expected: number, current: number) {
  if (expected !== current) {
    const error = new Error(`Version conflict: expected ${expected}, current ${current}`) as Error & { status?: number };
    error.status = 409;
    throw error;
  }
}

export function nextEstimateSheetStatus(current: string, target: string) {
  if (current === target) return current;
  if (current === 'DRAFT' && target === 'SENT') return target;
  const error = new Error(`Invalid estimate sheet transition: ${current} -> ${target}`) as Error & { status?: number };
  error.status = 409;
  throw error;
}
