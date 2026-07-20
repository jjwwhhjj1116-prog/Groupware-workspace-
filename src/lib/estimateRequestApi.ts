import { API_BASE_URL } from '@/lib/apiClient';
import {
  EstimateRequest,
  EstimateRequestActivity,
  EstimateRequestActivityKind,
  EstimateRequestAttachment,
  EstimateRequestStatus,
} from '@/types/models';

export type EstimateRequestDraft = Partial<EstimateRequest> & Pick<EstimateRequest, 'projectName' | 'departmentId'>;

export class EstimateRequestApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'EstimateRequestApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new EstimateRequestApiError(body.error || `HTTP ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const estimateRequestApi = {
  list: () => request<EstimateRequest[]>('/estimate-requests'),
  get: (id: string) => request<EstimateRequest>(`/estimate-requests/${id}`),
  create: (draft: EstimateRequestDraft) => request<EstimateRequest>('/estimate-requests', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(draft),
  }),
  update: (id: string, version: number, updates: Partial<EstimateRequest>) =>
    request<EstimateRequest>(`/estimate-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...updates, version }),
    }),
  changeStatus: (id: string, version: number, status: EstimateRequestStatus) =>
    request<EstimateRequest>(`/estimate-requests/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, version }),
    }),
  addActivity: (id: string, kind: EstimateRequestActivityKind, content: string) =>
    request<EstimateRequestActivity>(`/estimate-requests/${id}/activities`, {
      method: 'POST',
      body: JSON.stringify({ kind, content }),
    }),
  addAttachment: (
    id: string,
    attachment: Pick<EstimateRequestAttachment, 'category' | 'label' | 'originalName' | 'size' | 'mimeType' | 'memo'>,
  ) => request<EstimateRequestAttachment>(`/estimate-requests/${id}/attachments`, {
    method: 'POST',
    body: JSON.stringify(attachment),
  }),
  removeAttachment: (id: string, attachmentId: string) =>
    request<void>(`/estimate-requests/${id}/attachments/${attachmentId}`, { method: 'DELETE' }),
};
