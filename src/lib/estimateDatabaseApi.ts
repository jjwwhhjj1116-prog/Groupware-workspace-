import { API_BASE_URL } from '@/lib/apiClient';
import type {
  EstimateDbAnnualReport,
  EstimateDbMonthlyTarget,
  EstimateDbPayload,
  EstimateDbRecord,
  EstimateDbSection,
  EstimateDbTargetType,
  EstimateDbVendor,
} from '@/types/models';

export class EstimateDatabaseApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'EstimateDatabaseApiError';
  }
}

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new EstimateDatabaseApiError(body.error || `HTTP ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export interface EstimateDbRecordInput {
  section: EstimateDbSection;
  projectId?: string | null;
  sourceRecordId?: string | null;
  pjNo?: string | null;
  year?: number | null;
  sortOrder?: number;
  data: EstimateDbPayload;
}

export const estimateDatabaseApi = {
  listRecords: (section: EstimateDbSection, year?: number) => request<{ rows: EstimateDbRecord[]; total: number }>(`/estimate-database/records?section=${section}&pageSize=100${year ? `&year=${year}` : ''}`),
  createRecord: (input: EstimateDbRecordInput) => request<EstimateDbRecord>('/estimate-database/records', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(input) }),
  updateRecord: (id: string, expectedVersion: number, input: Partial<EstimateDbRecordInput>) => request<EstimateDbRecord>(`/estimate-database/records/${id}`, { method: 'PATCH', body: JSON.stringify({ ...input, expectedVersion }) }),
  deleteRecord: (id: string, expectedVersion: number) => request<void>(`/estimate-database/records/${id}?expectedVersion=${expectedVersion}`, { method: 'DELETE' }),
  duplicateRecord: (id: string) => request<EstimateDbRecord>(`/estimate-database/records/${id}/duplicate`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  listVendors: () => request<EstimateDbVendor[]>('/estimate-database/vendors'),
  createVendor: (name: string, trade: string, data: EstimateDbPayload) => request<EstimateDbVendor>('/estimate-database/vendors', { method: 'POST', body: JSON.stringify({ name, trade, data }) }),
  updateVendor: (vendor: EstimateDbVendor, data: EstimateDbPayload) => request<EstimateDbVendor>(`/estimate-database/vendors/${vendor.id}`, { method: 'PATCH', body: JSON.stringify({ data, expectedVersion: vendor.version }) }),
  deleteVendor: (vendor: EstimateDbVendor) => request<void>(`/estimate-database/vendors/${vendor.id}?expectedVersion=${vendor.version}`, { method: 'DELETE' }),
  listTargets: (year: number) => request<EstimateDbMonthlyTarget[]>(`/estimate-database/targets?year=${year}`),
  putTarget: (type: EstimateDbTargetType, year: number, month: number, amount: string, expectedVersion?: number) => request<EstimateDbMonthlyTarget>('/estimate-database/targets', { method: 'PUT', body: JSON.stringify({ type, year, month, amount, expectedVersion }) }),
  getReports: (year: number) => request<EstimateDbAnnualReport>(`/estimate-database/reports?year=${year}`),
};
