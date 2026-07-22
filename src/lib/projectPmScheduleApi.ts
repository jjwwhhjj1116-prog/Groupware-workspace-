import { API_BASE_URL } from '@/lib/apiClient';
import { PmAssignment, PmRequestTargets, PmSchedulePlan, ProjectPmSchedule, ProjectPmScheduleStatus } from '@/types/models';

export class ProjectPmScheduleApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = 'ProjectPmScheduleApiError';
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
    throw new ProjectPmScheduleApiError(body.error || `HTTP ${response.status}`, response.status, body.details || body);
  }
  return response.json() as Promise<T>;
}

const mutation = <T>(endpoint: string, body: T, method = 'POST') => request<ProjectPmSchedule>(endpoint, {
  method,
  body: JSON.stringify(body),
});

export const projectPmScheduleApi = {
  list: (filters: { status?: ProjectPmScheduleStatus; q?: string } = {}) => {
    const query = new URLSearchParams();
    if (filters.status) query.set('status', filters.status);
    if (filters.q) query.set('q', filters.q);
    return request<ProjectPmSchedule[]>(`/project-pm-schedules${query.size ? `?${query}` : ''}`);
  },
  assign: (projectId: string, expectedVersion: number, assignment: PmAssignment) =>
    mutation(`/project-pm-schedules/${projectId}/assignment`, { expectedVersion, assignment }),
  requestDraft: (projectId: string, expectedVersion: number, targets: PmRequestTargets, memo: string) =>
    mutation(`/project-pm-schedules/${projectId}/request`, { expectedVersion, targets, memo }),
  save: (projectId: string, expectedVersion: number, plan1: PmSchedulePlan, plan2: PmSchedulePlan) =>
    mutation(`/project-pm-schedules/${projectId}/draft`, { expectedVersion, plan1, plan2 }, 'PATCH'),
  submit: (projectId: string, expectedVersion: number, plan1: PmSchedulePlan, plan2: PmSchedulePlan) =>
    mutation(`/project-pm-schedules/${projectId}/submit`, { expectedVersion, plan1, plan2 }),
  approve: (projectId: string, expectedVersion: number, selectedProposal: 'plan1' | 'plan2') =>
    mutation(`/project-pm-schedules/${projectId}/approve`, { expectedVersion, selectedProposal }),
  reject: (projectId: string, expectedVersion: number, reason: string) =>
    mutation(`/project-pm-schedules/${projectId}/reject`, { expectedVersion, reason }),
};
