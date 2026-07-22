import { EstimateSubmissionListItem, EstimateSubmissionStatus, EstimateTemplateType } from '@/types/models';

export type EstimateSubmissionFilters = {
  query: string;
  status: EstimateSubmissionStatus | 'ALL';
  templateType: EstimateTemplateType | 'ALL';
  from: string;
  to: string;
};

export function filterEstimateSubmissions(rows: EstimateSubmissionListItem[], filters: EstimateSubmissionFilters) {
  return rows.filter((row) => {
    if (filters.status !== 'ALL' && row.status !== filters.status) return false;
    if (filters.templateType !== 'ALL' && row.templateType !== filters.templateType) return false;
    const submittedAt = new Date(row.submittedAt).getTime();
    if (filters.from && submittedAt < new Date(`${filters.from}T00:00:00`).getTime()) return false;
    if (filters.to && submittedAt > new Date(`${filters.to}T23:59:59.999`).getTime()) return false;
    const query = filters.query.trim().toLowerCase();
    if (!query) return true;
    return [row.requestNo, row.projectName, row.company, row.templateType, row.recipient]
      .filter(Boolean).join(' ').toLowerCase().includes(query);
  });
}

export function summarizeEstimateSubmissions(rows: EstimateSubmissionListItem[]) {
  return {
    total: rows.length,
    submitted: rows.filter((row) => row.status === 'SUBMITTED').length,
    sent: rows.filter((row) => row.status === 'SENT').length,
    ready: rows.filter((row) => row.decisionReady).length,
  };
}
