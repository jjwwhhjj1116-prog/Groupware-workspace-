import { API_BASE_URL } from '@/lib/apiClient';
import { DailyReportStage, DeliveryRecordType, DeliveryRoundKind, ProjectDeliveryWorkspace } from '@/types/models';

export class ProjectDeliveryApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) { super(message); this.name = 'ProjectDeliveryApiError'; }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ProjectDeliveryApiError(body.error || `HTTP ${response.status}`, response.status, body.details || body);
  }
  return response.json() as Promise<T>;
}
const mutate = (endpoint: string, body: unknown) => request<ProjectDeliveryWorkspace>(endpoint, { method: 'POST', body: JSON.stringify(body) });

export type DeliveryRoundInput = { kind: DeliveryRoundKind; parentRoundId?: string | null; label: string; deliveryDate: string; memo: string };
export type DeliveryFileInput = { logicalFileKey: string; originalName: string; mimeType: string; size: number; storageKey?: string; checksum?: string; memo: string };
export type DeliveryRecordInput = { occurredAt: string; type: DeliveryRecordType; memo: string };
export type DailyReportInput = { scheduleRowId?: string | null; reportDate: string; stage: DailyReportStage; planMemo: string; resultMemo: string; progressRate: number; delayReason: string; overtimeReason: string };

export const projectDeliveryApi = {
  get: (projectId: string) => request<ProjectDeliveryWorkspace>(`/project-deliveries/${projectId}`),
  createRound: (projectId: string, expectedVersion: number, input: DeliveryRoundInput) => mutate(`/project-deliveries/${projectId}/rounds`, { expectedVersion, ...input }),
  addFile: (projectId: string, roundId: string, expectedVersion: number, input: DeliveryFileInput) => mutate(`/project-deliveries/${projectId}/rounds/${roundId}/files`, { expectedVersion, ...input }),
  addRecord: (projectId: string, expectedVersion: number, input: DeliveryRecordInput) => mutate(`/project-deliveries/${projectId}/records`, { expectedVersion, ...input }),
  requestDownload: (projectId: string, expectedVersion: number, targetFile: string, reason: string) => mutate(`/project-deliveries/${projectId}/download-requests`, { expectedVersion, targetFile, reason }),
  reviewDownload: (projectId: string, requestId: string, expectedVersion: number, decision: 'APPROVED' | 'REJECTED', note: string) => mutate(`/project-deliveries/${projectId}/download-requests/${requestId}/review`, { expectedVersion, decision, note }),
  createReport: (projectId: string, expectedVersion: number, input: DailyReportInput) => mutate(`/project-deliveries/${projectId}/daily-reports`, { expectedVersion, ...input }),
  approveReport: (projectId: string, reportId: string, expectedVersion: number, step: 'PM' | 'MANAGER' | 'EXECUTIVE') => mutate(`/project-deliveries/${projectId}/daily-reports/${reportId}/approve`, { expectedVersion, step }),
};
