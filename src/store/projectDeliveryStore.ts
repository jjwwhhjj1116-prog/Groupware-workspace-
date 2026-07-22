import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { makeLocalDeliveryWorkspace, ProjectDeliveryActor, refreshLocalDelivery } from '@/lib/projectDelivery';
import { DailyReportInput, DeliveryFileInput, DeliveryRecordInput, DeliveryRoundInput, projectDeliveryApi, ProjectDeliveryApiError } from '@/lib/projectDeliveryApi';
import { useAuditStore } from '@/store/auditStore';
import { useProjectPmScheduleStore } from '@/store/projectPmScheduleStore';
import { useProjectStore } from '@/store/projectStore';
import { ProjectDailyReport, ProjectDeliveryFile, ProjectDeliveryHistory, ProjectDeliveryRecord, ProjectDeliveryRound, ProjectDeliveryWorkspace, ProjectDownloadRequest } from '@/types/models';

type PersistenceMode = 'CHECKING' | 'SERVER' | 'LOCAL_DEMO';
interface ProjectDeliveryState {
  workspaces: ProjectDeliveryWorkspace[];
  persistenceMode: PersistenceMode;
  loading: boolean;
  error: string | null;
  sync: (projectId: string, actor: ProjectDeliveryActor) => Promise<void>;
  createRound: (projectId: string, input: DeliveryRoundInput, actor: ProjectDeliveryActor) => Promise<ProjectDeliveryWorkspace>;
  addFile: (projectId: string, roundId: string, input: DeliveryFileInput, actor: ProjectDeliveryActor) => Promise<ProjectDeliveryWorkspace>;
  addRecord: (projectId: string, input: DeliveryRecordInput, actor: ProjectDeliveryActor) => Promise<ProjectDeliveryWorkspace>;
  requestDownload: (projectId: string, targetFile: string, reason: string, actor: ProjectDeliveryActor) => Promise<ProjectDeliveryWorkspace>;
  reviewDownload: (projectId: string, requestId: string, decision: 'APPROVED' | 'REJECTED', note: string, actor: ProjectDeliveryActor) => Promise<ProjectDeliveryWorkspace>;
  createReport: (projectId: string, input: DailyReportInput, actor: ProjectDeliveryActor) => Promise<ProjectDeliveryWorkspace>;
  approveReport: (projectId: string, reportId: string, step: 'PM' | 'MANAGER' | 'EXECUTIVE', actor: ProjectDeliveryActor) => Promise<ProjectDeliveryWorkspace>;
}

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
const replace = (items: ProjectDeliveryWorkspace[], workspace: ProjectDeliveryWorkspace) => items.some((item) => item.projectId === workspace.projectId)
  ? items.map((item) => item.projectId === workspace.projectId ? workspace : item)
  : [...items, workspace];
const canFallback = (error: unknown) => error instanceof TypeError || (error instanceof ProjectDeliveryApiError && [401, 404].includes(error.status));
const scheduleFor = (projectId: string) => useProjectPmScheduleStore.getState().schedules.find((item) => item.projectId === projectId);
const current = (state: ProjectDeliveryState, projectId: string) => {
  const workspace = state.workspaces.find((item) => item.projectId === projectId);
  if (!workspace) throw new Error('Project delivery workspace not found');
  return workspace;
};
const localHistory = (projectId: string, entityType: string, entityId: string | null, action: string, actorId: string, details: Record<string, unknown>): ProjectDeliveryHistory => ({ id: newId('delivery-history'), projectDeliveryWorkspaceId: projectId, entityType, entityId, action, actorId, details, createdAt: now() });
const finish = (workspace: ProjectDeliveryWorkspace, actor: ProjectDeliveryActor) => refreshLocalDelivery(workspace, actor, scheduleFor(workspace.projectId));
const audit = (workspace: ProjectDeliveryWorkspace, actorId: string, action: string, message: string) => useAuditStore.getState().addLog({ actorId, action, entityType: 'PROJECT_DELIVERY', entityId: workspace.id, message });

export const useProjectDeliveryStore = create<ProjectDeliveryState>()(persist((set, get) => ({
  workspaces: [], persistenceMode: 'CHECKING', loading: false, error: null,
  sync: async (projectId, actor) => {
    set({ loading: true, error: null });
    try {
      const workspace = await projectDeliveryApi.get(projectId);
      set((state) => ({ workspaces: replace(state.workspaces, workspace), persistenceMode: 'SERVER', loading: false }));
    } catch (error) {
      if (canFallback(error)) {
        const project = useProjectStore.getState().projects.find((item) => item.id === projectId && !item.isDeleted);
        if (!project) { set({ loading: false, error: 'Canonical project not found' }); return; }
        set((state) => {
          const existing = state.workspaces.find((item) => item.projectId === projectId);
          const workspace = existing
            ? finish({ ...existing, project: { ...existing.project, name: project.title, status: project.status, departmentId: project.departmentId, managerId: project.managerId || '', pmId: project.pmId || '' } }, actor)
            : makeLocalDeliveryWorkspace(project, actor, scheduleFor(projectId));
          return { workspaces: replace(state.workspaces, workspace), persistenceMode: 'LOCAL_DEMO', loading: false };
        });
        return;
      }
      set({ loading: false, error: error instanceof Error ? error.message : 'Project delivery synchronization failed' });
    }
  },
  createRound: async (projectId, input, actor) => {
    const workspace = current(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectDeliveryApi.createRound(projectId, workspace.version, input);
      set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated;
    }
    if (!workspace.permissions.canManageDelivery) throw new Error('Delivery management permission is required');
    if (input.kind === 'REDELIVERY' && !workspace.rounds.some((round) => round.id === input.parentRoundId)) throw new Error('A re-delivery must reference a prior round');
    const id = newId('delivery-round');
    const round: ProjectDeliveryRound = { id, projectDeliveryWorkspaceId: projectId, roundNo: workspace.rounds.length + 1, kind: input.kind, parentRoundId: input.parentRoundId, label: input.label, deliveryDate: input.deliveryDate, memo: input.memo, status: 'REGISTERED', createdBy: actor.id, createdAt: now(), files: [] };
    const entry = localHistory(projectId, 'DELIVERY_ROUND', id, input.kind === 'REDELIVERY' ? 'REDELIVERY_CREATED' : 'DELIVERY_CREATED', actor.id, { roundNo: round.roundNo, parentRoundId: round.parentRoundId || null });
    const updated = finish({ ...workspace, rounds: [round, ...workspace.rounds], histories: [entry, ...workspace.histories] }, actor);
    audit(updated, actor.id, 'CREATE', `Delivery round ${round.roundNo} created for project ${projectId}`);
    set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated;
  },
  addFile: async (projectId, roundId, input, actor) => {
    const workspace = current(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectDeliveryApi.addFile(projectId, roundId, workspace.version, input);
      set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated;
    }
    if (!workspace.permissions.canManageDelivery) throw new Error('Delivery management permission is required');
    const round = workspace.rounds.find((item) => item.id === roundId); if (!round) throw new Error('Delivery round not found');
    const version = Math.max(0, ...round.files.filter((file) => file.logicalFileKey === input.logicalFileKey).map((file) => file.version)) + 1;
    const file: ProjectDeliveryFile = { id: newId('delivery-file'), projectDeliveryRoundId: roundId, ...input, version, createdBy: actor.id, createdAt: now() };
    const entry = localHistory(projectId, 'DELIVERY_FILE', file.id, 'FILE_VERSION_ADDED', actor.id, { roundId, logicalFileKey: file.logicalFileKey, version });
    const updated = finish({ ...workspace, rounds: workspace.rounds.map((item) => item.id === roundId ? { ...item, files: [file, ...item.files] } : item), histories: [entry, ...workspace.histories] }, actor);
    audit(updated, actor.id, 'UPDATE', `Delivery file ${file.originalName} v${version} added`);
    set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated;
  },
  addRecord: async (projectId, input, actor) => {
    const workspace = current(get(), projectId);
    if (get().persistenceMode === 'SERVER') { const updated = await projectDeliveryApi.addRecord(projectId, workspace.version, input); set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated; }
    if (!workspace.permissions.canManageDelivery) throw new Error('Delivery management permission is required');
    const record: ProjectDeliveryRecord = { id: newId('delivery-record'), projectDeliveryWorkspaceId: projectId, ...input, writerId: actor.id, createdAt: now() };
    const entry = localHistory(projectId, 'DELIVERY_RECORD', record.id, 'RECORD_ADDED', actor.id, { type: record.type });
    const updated = finish({ ...workspace, records: [record, ...workspace.records], histories: [entry, ...workspace.histories] }, actor);
    set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated;
  },
  requestDownload: async (projectId, targetFile, reason, actor) => {
    const workspace = current(get(), projectId);
    if (get().persistenceMode === 'SERVER') { const updated = await projectDeliveryApi.requestDownload(projectId, workspace.version, targetFile, reason); set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated; }
    if (!workspace.permissions.canManageDelivery) throw new Error('Delivery management permission is required');
    const request: ProjectDownloadRequest = { id: newId('download-request'), projectDeliveryWorkspaceId: projectId, targetFile, reason, status: 'PENDING', requestedBy: actor.id, requestedAt: now() };
    const entry = localHistory(projectId, 'DOWNLOAD_REQUEST', request.id, 'DOWNLOAD_REQUESTED', actor.id, { targetFile });
    const updated = finish({ ...workspace, downloadRequests: [request, ...workspace.downloadRequests], histories: [entry, ...workspace.histories] }, actor);
    set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated;
  },
  reviewDownload: async (projectId, requestId, decision, note, actor) => {
    const workspace = current(get(), projectId);
    if (get().persistenceMode === 'SERVER') { const updated = await projectDeliveryApi.reviewDownload(projectId, requestId, workspace.version, decision, note); set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated; }
    if (!workspace.permissions.canApproveDownload) throw new Error('Manager approval is required');
    const request = workspace.downloadRequests.find((item) => item.id === requestId); if (!request || request.status !== 'PENDING') throw new Error('Pending download request not found');
    const entry = localHistory(projectId, 'DOWNLOAD_REQUEST', requestId, `DOWNLOAD_${decision}`, actor.id, { note });
    const updated = finish({ ...workspace, downloadRequests: workspace.downloadRequests.map((item) => item.id === requestId ? { ...item, status: decision, reviewedBy: actor.id, reviewedAt: now(), reviewNote: note } : item), histories: [entry, ...workspace.histories] }, actor);
    set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated;
  },
  createReport: async (projectId, input, actor) => {
    const workspace = current(get(), projectId);
    if (get().persistenceMode === 'SERVER') { const updated = await projectDeliveryApi.createReport(projectId, workspace.version, input); set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated; }
    if (!workspace.permissions.canWriteDaily) throw new Error('Daily report permission is required');
    const needsPm = Boolean(input.delayReason || input.overtimeReason); const id = newId('daily-report'); const timestamp = now();
    const report: ProjectDailyReport = { id, projectDeliveryWorkspaceId: projectId, ...input, pmStatus: needsPm ? 'PENDING' : 'NOT_REQUIRED', managerStatus: input.overtimeReason ? 'PENDING' : 'NOT_REQUIRED', executiveStatus: input.delayReason ? 'PENDING' : 'NOT_REQUIRED', createdBy: actor.id, updatedBy: actor.id, createdAt: timestamp, updatedAt: timestamp };
    const entry = localHistory(projectId, 'DAILY_REPORT', id, 'DAILY_REPORT_CREATED', actor.id, { stage: report.stage, progressRate: report.progressRate });
    const updated = finish({ ...workspace, dailyReports: [report, ...workspace.dailyReports], histories: [entry, ...workspace.histories] }, actor);
    audit(updated, actor.id, 'CREATE', `Daily report ${report.stage} created for project ${projectId}`);
    set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated;
  },
  approveReport: async (projectId, reportId, step, actor) => {
    const workspace = current(get(), projectId);
    if (get().persistenceMode === 'SERVER') { const updated = await projectDeliveryApi.approveReport(projectId, reportId, workspace.version, step); set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated; }
    const allowed = step === 'PM' ? workspace.permissions.canApprovePm : step === 'MANAGER' ? workspace.permissions.canApproveManager : workspace.permissions.canApproveExecutive;
    if (!allowed) throw new Error('Daily report approval is outside your role');
    const report = workspace.dailyReports.find((item) => item.id === reportId); if (!report) throw new Error('Daily report not found');
    const field = step === 'PM' ? 'pmStatus' : step === 'MANAGER' ? 'managerStatus' : 'executiveStatus';
    if (report[field] === 'NOT_REQUIRED') throw new Error('This approval step is not required');
    if (step !== 'PM' && report.pmStatus !== 'APPROVED') throw new Error('PM approval must be completed first');
    const entry = localHistory(projectId, 'DAILY_REPORT', reportId, `DAILY_${step}_APPROVED`, actor.id, {});
    const updated = finish({ ...workspace, dailyReports: workspace.dailyReports.map((item) => item.id === reportId ? { ...item, [field]: 'APPROVED', updatedBy: actor.id, updatedAt: now() } : item), histories: [entry, ...workspace.histories] }, actor);
    set((state) => ({ workspaces: replace(state.workspaces, updated) })); return updated;
  },
}), { name: 'project-delivery-storage-v1', partialize: (state) => ({ workspaces: state.workspaces }) }));
