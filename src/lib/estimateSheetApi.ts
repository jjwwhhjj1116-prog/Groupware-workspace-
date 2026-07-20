import { API_BASE_URL } from '@/lib/apiClient';
import {
  EstimateSheet,
  EstimateSheetState,
  EstimateSubmissionListItem,
  EstimateTemplateType,
} from '@/types/models';

export class EstimateSheetApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'EstimateSheetApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new EstimateSheetApiError(body.error || `HTTP ${response.status}`, response.status);
  }
  return response.json() as Promise<T>;
}

export const estimateSheetApi = {
  listSubmissions: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
    return request<EstimateSubmissionListItem[]>(`/estimate-requests/submissions${query.size ? `?${query}` : ''}`);
  },
  get: (requestId: string) => request<EstimateSheet | null>(`/estimate-requests/${requestId}/estimate-sheet`),
  create: (requestId: string, templateType: EstimateTemplateType, templateHash: string, state: EstimateSheetState) => request<EstimateSheet>(`/estimate-requests/${requestId}/estimate-sheet`, {
    method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ templateType, templateHash, state }),
  }),
  saveVersion: (requestId: string, expectedVersion: number, templateHash: string, state: EstimateSheetState) => request<EstimateSheet>(`/estimate-requests/${requestId}/estimate-sheet/versions`, {
    method: 'POST', body: JSON.stringify({ expectedVersion, templateHash, state }),
  }),
  markSent: (requestId: string, expectedVersion: number) => request<EstimateSheet>(`/estimate-requests/${requestId}/estimate-sheet/sent`, {
    method: 'POST', body: JSON.stringify({ expectedVersion }),
  }),
  submit: (requestId: string, expectedVersion: number, recipient?: string, deliveryChannel?: string) => request<EstimateSheet>(`/estimate-requests/${requestId}/estimate-sheet/submissions`, {
    method: 'POST', body: JSON.stringify({ expectedVersion, recipient: recipient || null, deliveryChannel: deliveryChannel || null }),
  }),
  sendSubmission: (requestId: string, submissionId: string, expectedVersion: number) => request<EstimateSheet>(`/estimate-requests/${requestId}/estimate-sheet/submissions/${submissionId}/send`, {
    method: 'POST', body: JSON.stringify({ expectedVersion }),
  }),
  createRevision: (requestId: string, expectedVersion: number) => request<EstimateSheet>(`/estimate-requests/${requestId}/estimate-sheet/revision`, {
    method: 'POST', body: JSON.stringify({ expectedVersion }),
  }),
  recordExport: (requestId: string, version: number, format: 'XLSX' | 'PDF', fileName: string) => request(`/estimate-requests/${requestId}/estimate-sheet/exports`, {
    method: 'POST', body: JSON.stringify({ version, format, fileName }),
  }),
};
