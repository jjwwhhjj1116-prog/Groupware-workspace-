import { API_BASE_URL } from '@/lib/apiClient';
import { ProjectOperation, ProjectOperationActivityKind } from '@/types/models';

export class ProjectOperationApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = 'ProjectOperationApiError';
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
    throw new ProjectOperationApiError(body.error || `HTTP ${response.status}`, response.status, body.details || body);
  }
  return response.json() as Promise<T>;
}

const mutation = (endpoint: string, body: unknown, method = 'POST') => request<ProjectOperation>(endpoint, { method, body: JSON.stringify(body) });

export const projectOperationApi = {
  list: (q = '') => request<ProjectOperation[]>(`/project-operations${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  get: (projectId: string) => request<ProjectOperation>(`/project-operations/${projectId}`),
  addActivity: (projectId: string, expectedVersion: number, input: { kind: ProjectOperationActivityKind; occurredAt: string; title: string; body: string; metadata?: Record<string, string | number | boolean | null> }) =>
    mutation(`/project-operations/${projectId}/activities`, { expectedVersion, ...input, metadata: input.metadata || {} }),
  deleteActivity: (projectId: string, activityId: string, expectedVersion: number) =>
    mutation(`/project-operations/${projectId}/activities/${activityId}`, { expectedVersion }, 'DELETE'),
  updateMilestones: (projectId: string, expectedVersion: number, input: { awardDate?: string; expectedCompletionDate?: string; actualCompletionDate?: string; reason: string }) =>
    mutation(`/project-operations/${projectId}/milestones`, { expectedVersion, ...input }, 'PATCH'),
  reviewStart: (projectId: string, expectedVersion: number, decision: 'APPROVED' | 'REJECTED', note: string) =>
    mutation(`/project-operations/${projectId}/start-review`, { expectedVersion, decision, note }),
};
