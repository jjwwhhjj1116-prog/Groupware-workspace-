import { API_BASE_URL } from '@/lib/apiClient';
import { ProfitContractAmount, ProjectProfitAnalysis, ProjectProfitRound, UnitPriceEntry, UnitPriceTable } from '@/types/models';

export class ProjectProfitApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) { super(message); this.name = 'ProjectProfitApiError'; }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new ProjectProfitApiError(body.error || `HTTP ${response.status}`, response.status, body.details || body); }
  return response.json() as Promise<T>;
}

export type ProjectProfitUpdateInput = {
  unitPriceTableId?: string | null;
  contractAmounts: Array<Pick<ProfitContractAmount, 'category' | 'amount' | 'sourceType' | 'sourceRef'>>;
  rounds: Array<Pick<ProjectProfitRound, 'roundNo' | 'startDate' | 'endDate'> & { members: Array<Pick<ProjectProfitRound['members'][number], 'personnelId' | 'sourceScheduleRowId' | 'category' | 'grade' | 'name' | 'workDates'>>; otherCosts: Array<Pick<ProjectProfitRound['otherCosts'][number], 'category' | 'amount' | 'sourceType' | 'sourceRef'>> }>;
};
export type UnitPriceTableInput = { effectiveDate: string; entries: Array<Pick<UnitPriceEntry, 'grade' | 'unitPrice'>> };

export const projectProfitApi = {
  get: (projectId: string) => request<ProjectProfitAnalysis>(`/project-profits/${projectId}`),
  update: (projectId: string, expectedVersion: number, input: ProjectProfitUpdateInput) => request<ProjectProfitAnalysis>(`/project-profits/${projectId}`, { method: 'PUT', body: JSON.stringify({ expectedVersion, ...input }) }),
  listUnitPrices: () => request<UnitPriceTable[]>('/project-profits/unit-prices'),
  createUnitPrices: (input: UnitPriceTableInput) => request<UnitPriceTable>('/project-profits/unit-prices', { method: 'POST', body: JSON.stringify(input) }),
};
