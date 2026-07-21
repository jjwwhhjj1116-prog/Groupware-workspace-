import { API_BASE_URL } from '@/lib/apiClient';
import { ProjectIntake, ProjectIntakeDraft, ProjectIntakeStatus } from '@/types/models';

export class ProjectIntakeApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = 'ProjectIntakeApiError';
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
    throw new ProjectIntakeApiError(body.error || `HTTP ${response.status}`, response.status, body);
  }
  return response.json() as Promise<T>;
}

export const projectIntakeApi = {
  list: (filters: { status?: ProjectIntakeStatus; q?: string } = {}) => {
    const query = new URLSearchParams();
    if (filters.status) query.set('status', filters.status);
    if (filters.q) query.set('q', filters.q);
    const suffix = query.size ? `?${query.toString()}` : '';
    return request<ProjectIntake[]>(`/project-intakes${suffix}`);
  },
  get: (id: string) => request<ProjectIntake>(`/project-intakes/${id}`),
  save: (id: string, expectedVersion: number, draft: ProjectIntakeDraft) =>
    request<ProjectIntake>(`/project-intakes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ expectedVersion, draft }),
    }),
  review: (id: string, expectedVersion: number, draft: ProjectIntakeDraft, note: string) =>
    request<ProjectIntake>(`/project-intakes/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ expectedVersion, draft, note }),
    }),
  accept: (id: string, expectedVersion: number, note: string) =>
    request<ProjectIntake>(`/project-intakes/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({ expectedVersion, note }),
    }),
};
