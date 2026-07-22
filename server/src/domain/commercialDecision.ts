export const COMMERCIAL_DECISIONS = ['WON', 'LOST', 'CANCELLED', 'ON_HOLD'] as const;

export type CommercialDecisionType = typeof COMMERCIAL_DECISIONS[number];

export type CommercialDecisionRequest = {
  id: string;
  requestNo: string;
  status: string;
  projectId?: string | null;
  projectName: string;
  company?: string | null;
  client?: string | null;
  contact?: string | null;
  contactDepartment?: string | null;
  phone?: string | null;
  email?: string | null;
  ownerId?: string | null;
  departmentId: string;
  requestDate: Date | string;
  memo?: string | null;
  rawMemo?: string | null;
  firstDelivery?: string | null;
  secondDelivery?: string | null;
  thirdDelivery?: string | null;
  finalDelivery?: string | null;
  expectedStartDate?: string | null;
  areaPy?: string | null;
  floors?: string | null;
  scope?: string | null;
  usage?: string | null;
  buildingCount?: string | null;
  unitWork?: string | null;
  bidDate?: string | null;
  estimateType?: string | null;
  estimateId?: string | null;
  attachments?: Array<Record<string, unknown>>;
  activities?: Array<Record<string, unknown>>;
};

export type DecisionSnapshotInput = {
  decision: CommercialDecisionType;
  decisionId: string;
  estimateSheetId?: string | null;
  estimateSubmissionId?: string | null;
  documentHash?: string | null;
  reason?: string | null;
  agreedAmount?: string | null;
  agreedScope?: string | null;
  agreedSchedule?: string | null;
  startCondition?: string | null;
  decidedAt: Date | string;
  decidedBy: string;
};

export function commercialDecisionRequiresSentSubmission(decision: CommercialDecisionType): boolean {
  return decision === 'WON' || decision === 'LOST';
}

export function assertCommercialDecisionTransition(
  currentStatus: string,
  decision: CommercialDecisionType,
  projectId?: string | null,
): void {
  if (projectId) throw new Error('This estimate request has already been converted to a project');
  if (currentStatus === 'WON') throw new Error('A won estimate request cannot be decided again');
  if (['LOST', 'CANCELLED'].includes(currentStatus)) {
    throw new Error('A terminal estimate request cannot be decided again');
  }
  if (currentStatus === 'ON_HOLD' && decision === 'ON_HOLD') {
    throw new Error('This estimate request is already on hold');
  }
}

export function normalizeAgreedAmount(value?: string | number | null): string | null {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).replaceAll(',', '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Agreed amount must be a positive number with at most two decimal places');
  return normalized;
}

export function buildProjectIntakeSnapshot(
  request: CommercialDecisionRequest,
  decision: DecisionSnapshotInput,
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    source: {
      estimateRequestId: request.id,
      requestNo: request.requestNo,
      estimateId: request.estimateId ?? null,
      estimateSheetId: decision.estimateSheetId ?? null,
      estimateSubmissionId: decision.estimateSubmissionId ?? null,
      estimateDocumentHash: decision.documentHash ?? null,
      commercialDecisionId: decision.decisionId,
    },
    project: {
      projectName: request.projectName,
      company: request.company ?? null,
      client: request.client ?? null,
      departmentId: request.departmentId,
      ownerId: request.ownerId ?? null,
      requestDate: request.requestDate,
      contact: request.contact ?? null,
      contactDepartment: request.contactDepartment ?? null,
      phone: request.phone ?? null,
      email: request.email ?? null,
      scope: request.scope ?? null,
      usage: request.usage ?? null,
      areaPy: request.areaPy ?? null,
      floors: request.floors ?? null,
      buildingCount: request.buildingCount ?? null,
      unitWork: request.unitWork ?? null,
      bidDate: request.bidDate ?? null,
      expectedStartDate: request.expectedStartDate ?? null,
      deliveries: [request.firstDelivery, request.secondDelivery, request.thirdDelivery, request.finalDelivery],
      memo: request.memo ?? null,
      rawMemo: request.rawMemo ?? null,
      estimateType: request.estimateType ?? null,
    },
    decision: {
      type: decision.decision,
      reason: decision.reason ?? null,
      agreedAmount: decision.agreedAmount ?? null,
      agreedScope: decision.agreedScope ?? null,
      agreedSchedule: decision.agreedSchedule ?? null,
      startCondition: decision.startCondition ?? null,
      decidedAt: decision.decidedAt,
      decidedBy: decision.decidedBy,
    },
    attachments: request.attachments ?? [],
    activities: request.activities ?? [],
  };
}
