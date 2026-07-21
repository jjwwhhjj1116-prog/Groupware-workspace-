import {
  Project,
  ProjectDeliveryWorkspace,
  ProjectIntake,
  ProjectOperation,
  ProjectPmSchedule,
  ProjectProfitAnalysis,
  ProjectQcChecklist,
} from '@/types/models';

export type ProjectWorkflowPhaseId = 'INTAKE' | 'SCHEDULE' | 'OPERATION' | 'QC' | 'DELIVERY' | 'PROFIT';
export type ProjectWorkflowPhaseState = 'COMPLETE' | 'ACTIVE' | 'PENDING' | 'BLOCKED';
export type ProjectWorkflowTab = 'OVERVIEW' | 'ACTIVITY' | 'ASSIGNMENTS' | 'TIMELINE' | 'QC' | 'DELIVERY' | 'DAILY' | 'PROFIT';

export interface ProjectWorkflowPhase {
  id: ProjectWorkflowPhaseId;
  state: ProjectWorkflowPhaseState;
  status: string;
  tab: ProjectWorkflowTab;
}

export interface ProjectWorkflowSummary {
  projectId: string;
  phases: ProjectWorkflowPhase[];
  currentPhase: ProjectWorkflowPhaseId;
  currentTab: ProjectWorkflowTab;
  completion: number;
  pendingApprovals: number;
}

export interface ProjectWorkflowSources {
  intake?: ProjectIntake;
  schedule?: ProjectPmSchedule;
  operation?: ProjectOperation;
  qc?: ProjectQcChecklist;
  delivery?: ProjectDeliveryWorkspace;
  profit?: ProjectProfitAnalysis;
  taskPendingApprovals?: number;
}

const afterSchedule = new Set<Project['status']>(['SCHEDULE_APPROVED', 'IN_PROGRESS', 'QA_REVIEW', 'COMPLETED', 'ARCHIVED', 'REVISION_REQUESTED']);
const afterIntake = new Set<Project['status']>(['MANAGER_REVIEW', 'PM_ASSIGNED', 'SCHEDULE_DRAFTING', 'SCHEDULE_PENDING_APPROVAL', 'SCHEDULE_REJECTED', ...afterSchedule]);

const phase = (id: ProjectWorkflowPhaseId, state: ProjectWorkflowPhaseState, status: string, tab: ProjectWorkflowTab): ProjectWorkflowPhase => ({ id, state, status, tab });

export function buildProjectWorkflowSummary(project: Project, sources: ProjectWorkflowSources = {}): ProjectWorkflowSummary {
  const { intake, schedule, operation, qc, delivery, profit } = sources;

  const intakePhase = intake
    ? phase('INTAKE', intake.status === 'ACCEPTED' ? 'COMPLETE' : 'ACTIVE', intake.status, 'OVERVIEW')
    : phase('INTAKE', afterIntake.has(project.status) ? 'COMPLETE' : 'ACTIVE', project.status, 'OVERVIEW');

  const schedulePhase = schedule
    ? phase('SCHEDULE', schedule.status === 'APPROVED' ? 'COMPLETE' : schedule.status === 'REJECTED' ? 'BLOCKED' : 'ACTIVE', schedule.status, 'ASSIGNMENTS')
    : phase('SCHEDULE', afterSchedule.has(project.status) ? 'COMPLETE' : afterIntake.has(project.status) ? 'ACTIVE' : 'PENDING', project.status, 'ASSIGNMENTS');

  const operationComplete = Boolean(operation?.actualCompletionDate) || ['COMPLETED', 'ARCHIVED'].includes(project.status);
  const operationPhase = operation
    ? phase('OPERATION', operationComplete ? 'COMPLETE' : operation.startApprovalStatus === 'REJECTED' ? 'BLOCKED' : operation.startApprovalStatus === 'APPROVED' ? 'ACTIVE' : 'PENDING', operation.startApprovalStatus, 'ACTIVITY')
    : phase('OPERATION', operationComplete ? 'COMPLETE' : ['IN_PROGRESS', 'QA_REVIEW', 'REVISION_REQUESTED'].includes(project.status) ? 'ACTIVE' : 'PENDING', project.status, 'ACTIVITY');

  const qcPhase = qc
    ? phase('QC', qc.status === 'COMPLETED' ? 'COMPLETE' : qc.items.length > 0 || qc.status === 'IN_PROGRESS' ? 'ACTIVE' : 'PENDING', qc.status, 'QC')
    : phase('QC', ['COMPLETED', 'ARCHIVED'].includes(project.status) ? 'COMPLETE' : project.status === 'QA_REVIEW' ? 'ACTIVE' : 'PENDING', project.status, 'QC');

  const deliveryActive = Boolean(delivery && (delivery.rounds.length || delivery.records.length || delivery.dailyReports.length));
  const deliveryPhase = delivery
    ? phase('DELIVERY', delivery.status === 'COMPLETED' ? 'COMPLETE' : delivery.status === 'DELIVERING' || deliveryActive ? 'ACTIVE' : 'PENDING', delivery.status, 'DELIVERY')
    : phase('DELIVERY', ['COMPLETED', 'ARCHIVED'].includes(project.status) ? 'COMPLETE' : 'PENDING', project.status, 'DELIVERY');

  const profitPhase = profit
    ? phase('PROFIT', profit.status === 'ANALYZED' ? 'COMPLETE' : 'ACTIVE', profit.status, 'PROFIT')
    : phase('PROFIT', 'PENDING', project.status, 'PROFIT');

  const phases = [intakePhase, schedulePhase, operationPhase, qcPhase, deliveryPhase, profitPhase];
  const current = [...phases].reverse().find((item) => item.state === 'ACTIVE' || item.state === 'BLOCKED')
    || phases.find((item) => item.state === 'PENDING')
    || profitPhase;
  const pendingDownloadApprovals = delivery?.downloadRequests.filter((item) => item.status === 'PENDING').length || 0;
  const pendingReportApprovals = delivery?.dailyReports.reduce((count, report) => count + [report.pmStatus, report.managerStatus, report.executiveStatus].filter((status) => status === 'PENDING').length, 0) || 0;
  const pendingApprovals = (sources.taskPendingApprovals || 0)
    + (schedule?.status === 'SUBMITTED' ? 1 : 0)
    + (operation?.startApprovalStatus === 'PENDING' && afterSchedule.has(project.status) ? 1 : 0)
    + pendingDownloadApprovals
    + pendingReportApprovals;

  return {
    projectId: project.id,
    phases,
    currentPhase: current.id,
    currentTab: current.tab,
    completion: Math.round((phases.filter((item) => item.state === 'COMPLETE').length / phases.length) * 100),
    pendingApprovals,
  };
}

export const getProjectWorkflowHref = (projectId: string, tab: ProjectWorkflowTab) =>
  `/projects?workflow=${encodeURIComponent(projectId)}&tab=${encodeURIComponent(tab)}`;
