import { Project, ProjectDeliveryWorkspace, ProjectPmSchedule, Role } from '@/types/models';

export type ProjectDeliveryActor = { id: string; role: Role; departmentId: string };

const assignmentIds = (schedule?: ProjectPmSchedule) => {
  if (!schedule) return [];
  const rows = schedule.approvedPlan === 'plan2' ? schedule.plan2.rows : schedule.plan1.rows;
  return [...new Set([...Object.values(schedule.assignment).filter(Boolean) as string[], ...rows.map((row) => row.assigneeId).filter(Boolean)])];
};

export const localDeliveryPermissions = (workspace: ProjectDeliveryWorkspace, actor: ProjectDeliveryActor, assignedIds: string[]) => {
  const isAdmin = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
  const isManager = actor.role === 'DEPARTMENT_MANAGER' && (actor.id === workspace.project.managerId || actor.departmentId === workspace.project.departmentId);
  const assigned = assignedIds.includes(actor.id);
  return {
    canView: isAdmin || isManager || actor.id === workspace.project.pmId || assigned,
    canManageDelivery: isAdmin || isManager || (actor.role === 'PM' && (actor.id === workspace.project.pmId || assigned)),
    canWriteDaily: isAdmin || isManager || (actor.role === 'PM' && (actor.id === workspace.project.pmId || assigned)) || (actor.role === 'WORKER' && assigned),
    canApproveDownload: isAdmin || isManager,
    canApprovePm: isAdmin || (actor.role === 'PM' && actor.id === workspace.project.pmId),
    canApproveManager: isAdmin || isManager,
    canApproveExecutive: isAdmin,
  };
};

export const deriveLocalDeliveryStatus = (workspace: ProjectDeliveryWorkspace) => {
  const pending = workspace.downloadRequests.some((request) => request.status === 'PENDING')
    || workspace.dailyReports.some((report) => [report.pmStatus, report.managerStatus, report.executiveStatus].includes('PENDING'));
  if (workspace.progressRate >= 100 && workspace.rounds.length && !pending) return 'COMPLETED' as const;
  if (workspace.rounds.length) return 'DELIVERING' as const;
  if (workspace.progressRate > 0) return 'IN_PROGRESS' as const;
  return 'OPEN' as const;
};

export const makeLocalDeliveryWorkspace = (project: Project, actor: ProjectDeliveryActor, schedule?: ProjectPmSchedule): ProjectDeliveryWorkspace => {
  const timestamp = new Date().toISOString();
  const rows = schedule ? (schedule.approvedPlan === 'plan2' ? schedule.plan2.rows : schedule.plan1.rows) : [];
  const workspace: ProjectDeliveryWorkspace = {
    id: project.id, projectId: project.id, status: 'OPEN', progressRate: 0, currentStage: null, version: 1,
    createdBy: actor.id, updatedBy: actor.id, createdAt: project.createdAt || timestamp, updatedAt: project.updatedAt || timestamp,
    project: { id: project.id, name: project.title, status: project.status, departmentId: project.departmentId, managerId: project.managerId || '', pmId: project.pmId || '' },
    assignments: { rows }, rounds: [], records: [], downloadRequests: [], dailyReports: [], histories: [],
    permissions: { canView: false, canManageDelivery: false, canWriteDaily: false, canApproveDownload: false, canApprovePm: false, canApproveManager: false, canApproveExecutive: false },
  };
  return { ...workspace, permissions: localDeliveryPermissions(workspace, actor, assignmentIds(schedule)) };
};

export const refreshLocalDelivery = (workspace: ProjectDeliveryWorkspace, actor: ProjectDeliveryActor, schedule?: ProjectPmSchedule) => {
  const progressRate = workspace.dailyReports.reduce((max, report) => Math.max(max, report.progressRate), 0);
  const currentStage = workspace.dailyReports[0]?.stage || null;
  const next = { ...workspace, progressRate, currentStage, updatedBy: actor.id, updatedAt: new Date().toISOString(), version: workspace.version + 1 };
  const status = deriveLocalDeliveryStatus(next);
  const withStatus = { ...next, status };
  return { ...withStatus, permissions: localDeliveryPermissions(withStatus, actor, assignmentIds(schedule)) };
};
