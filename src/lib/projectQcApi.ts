import { API_BASE_URL } from '@/lib/apiClient';
import { ProjectQcAttachment, ProjectQcCheck, ProjectQcChecklist, ProjectQcTerm } from '@/types/models';

export class ProjectQcApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = 'ProjectQcApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ProjectQcApiError(body.error || `HTTP ${response.status}`, response.status, body.details || body);
  }
  return response.json() as Promise<T>;
}

const mutate = (endpoint: string, body: unknown, method = 'POST') => request<ProjectQcChecklist>(endpoint, { method, body: JSON.stringify(body) });
export type ProjectQcAttachmentInput = Pick<ProjectQcAttachment, 'originalName' | 'mimeType' | 'size'> & Partial<Pick<ProjectQcAttachment, 'storageKey' | 'checksum'>>;
export type ProjectQcItemInput = { group: string; middleCategory: string; subCategory: string; trade: string; serialNo: string; item: string; method: string; targets: string[]; comment: string; attachments: ProjectQcAttachmentInput[] };
export type ProjectQcItemUpdate = Partial<Omit<ProjectQcItemInput, 'attachments'>> & { checks?: ProjectQcCheck[]; objection?: Record<string, string | number | boolean | null> | null; eliminated?: boolean };

export const projectQcApi = {
  get: (projectId: string) => request<ProjectQcChecklist>(`/project-qc/${projectId}`),
  createItem: (projectId: string, expectedVersion: number, input: ProjectQcItemInput) => mutate(`/project-qc/${projectId}/items`, { expectedVersion, ...input }),
  updateItem: (projectId: string, itemId: string, expectedVersion: number, input: ProjectQcItemUpdate) => mutate(`/project-qc/${projectId}/items/${itemId}`, { expectedVersion, ...input }, 'PATCH'),
  duplicateItem: (projectId: string, itemId: string, expectedVersion: number) => mutate(`/project-qc/${projectId}/items/${itemId}/duplicate`, { expectedVersion }),
  deleteItem: (projectId: string, itemId: string, expectedVersion: number) => mutate(`/project-qc/${projectId}/items/${itemId}`, { expectedVersion }, 'DELETE'),
  addAttachment: (projectId: string, itemId: string, expectedVersion: number, input: ProjectQcAttachmentInput) => mutate(`/project-qc/${projectId}/items/${itemId}/attachments`, { expectedVersion, ...input }),
  removeAttachment: (projectId: string, itemId: string, attachmentId: string, expectedVersion: number) => mutate(`/project-qc/${projectId}/items/${itemId}/attachments/${attachmentId}`, { expectedVersion }, 'DELETE'),
  sendCategory: (projectId: string, expectedVersion: number, group: string) => mutate(`/project-qc/${projectId}/categories/send`, { expectedVersion, group }),
  listTerms: () => request<ProjectQcTerm[]>('/project-qc/terms'),
  upsertTerm: (term: string, definition: string) => request<ProjectQcTerm>('/project-qc/terms', { method: 'POST', body: JSON.stringify({ term, definition }) }),
};
