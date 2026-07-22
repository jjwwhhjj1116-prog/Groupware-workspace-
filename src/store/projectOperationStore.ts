import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { activityTitleFallback, localProjectOperationPermissions, makeLocalProjectOperation, ProjectOperationActor } from '@/lib/projectOperation';
import { projectOperationApi, ProjectOperationApiError } from '@/lib/projectOperationApi';
import { useAuditStore } from '@/store/auditStore';
import { useProjectIntakeStore } from '@/store/projectIntakeStore';
import { useProjectPmScheduleStore } from '@/store/projectPmScheduleStore';
import { useProjectStore } from '@/store/projectStore';
import { ProjectOperation, ProjectOperationActivity, ProjectOperationActivityKind } from '@/types/models';

type PersistenceMode = 'CHECKING' | 'SERVER' | 'LOCAL_DEMO';
type ActivityInput = { kind: ProjectOperationActivityKind; occurredAt: string; title: string; body: string; metadata?: Record<string, string | number | boolean | null> };
type MilestoneInput = { awardDate?: string; expectedCompletionDate?: string; actualCompletionDate?: string; reason: string };

interface ProjectOperationState {
  operations: ProjectOperation[];
  persistenceMode: PersistenceMode;
  loading: boolean;
  error: string | null;
  sync: (actor: ProjectOperationActor) => Promise<void>;
  addActivity: (projectId: string, input: ActivityInput, actor: ProjectOperationActor) => Promise<ProjectOperation>;
  deleteActivity: (projectId: string, activityId: string, actor: ProjectOperationActor) => Promise<ProjectOperation>;
  updateMilestones: (projectId: string, input: MilestoneInput, actor: ProjectOperationActor) => Promise<ProjectOperation>;
  reviewStart: (projectId: string, decision: 'APPROVED' | 'REJECTED', note: string, actor: ProjectOperationActor) => Promise<ProjectOperation>;
}

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
const replace = (items: ProjectOperation[], operation: ProjectOperation) => items.map((item) => item.projectId === operation.projectId ? operation : item);
const canFallback = (error: unknown) => error instanceof TypeError || (error instanceof ProjectOperationApiError && [401, 404].includes(error.status));

const sourceTraceFor = (projectId: string) => {
  const intake = useProjectIntakeStore.getState().intakes.find((item) => item.projectId === projectId && item.status === 'ACCEPTED');
  return intake ? {
    projectIntakeId: intake.id,
    estimateRequestId: intake.estimateRequestId,
    requestNo: intake.estimateRequest?.requestNo || null,
    commercialDecisionId: intake.commercialDecisionId,
  } : {};
};

const mergeFromCanonicalProjects = (existing: ProjectOperation[], actor: ProjectOperationActor) => {
  const byProject = new Map(existing.map((item) => [item.projectId, item]));
  const schedules = useProjectPmScheduleStore.getState().schedules;
  useProjectStore.getState().projects.filter((project) => !project.isDeleted).forEach((project) => {
    const schedule = schedules.find((item) => item.projectId === project.id);
    const current = byProject.get(project.id) || makeLocalProjectOperation(project, actor, schedule, sourceTraceFor(project.id));
    const rows = schedule ? (schedule.approvedPlan === 'plan2' ? schedule.plan2.rows : schedule.plan1.rows) : current.assignments.rows;
    const hydrated: ProjectOperation = {
      ...current,
      project: { ...current.project, name: project.title, status: project.status, departmentId: project.departmentId, managerId: project.managerId || '', pmId: project.pmId || '' },
      assignments: { assignment: schedule?.assignment || current.assignments.assignment, rows },
      sourceTrace: { ...current.sourceTrace, ...sourceTraceFor(project.id), canonicalProjectId: project.id },
    };
    byProject.set(project.id, { ...hydrated, permissions: localProjectOperationPermissions(hydrated, actor) });
  });
  return Array.from(byProject.values()).filter((item) => item.permissions.canView).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

const getCurrent = (state: ProjectOperationState, projectId: string) => {
  const current = state.operations.find((item) => item.projectId === projectId);
  if (!current) throw new Error('Project operation not found');
  return current;
};
const audit = (operation: ProjectOperation, actorId: string, action: string, message: string) => useAuditStore.getState().addLog({ actorId, action, entityType: 'PROJECT_OPERATION', entityId: operation.id, message });

export const useProjectOperationStore = create<ProjectOperationState>()(persist((set, get) => ({
  operations: [], persistenceMode: 'CHECKING', loading: false, error: null,
  sync: async (actor) => {
    set({ loading: true, error: null });
    try {
      const operations = await projectOperationApi.list();
      set({ operations, persistenceMode: 'SERVER', loading: false });
    } catch (error) {
      if (canFallback(error)) {
        set((state) => ({ operations: mergeFromCanonicalProjects(state.operations, actor), persistenceMode: 'LOCAL_DEMO', loading: false }));
        return;
      }
      set({ loading: false, error: error instanceof Error ? error.message : 'Project operation synchronization failed' });
    }
  },
  addActivity: async (projectId, input, actor) => {
    const current = getCurrent(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectOperationApi.addActivity(projectId, current.version, input);
      set((state) => ({ operations: replace(state.operations, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to update this project operation');
    const timestamp = now();
    const activity: ProjectOperationActivity = { id: newId('operation-activity'), projectOperationId: current.id, kind: input.kind, occurredAt: input.occurredAt, title: input.title || activityTitleFallback(input.kind), body: input.body, metadata: input.metadata || {}, createdBy: actor.id, createdAt: timestamp };
    const updated = { ...current, activities: [activity, ...current.activities], version: current.version + 1, updatedBy: actor.id, updatedAt: timestamp };
    audit(updated, actor.id, 'CREATE', `${input.kind} activity added to project ${projectId}`);
    set((state) => ({ operations: replace(state.operations, updated) }));
    return updated;
  },
  deleteActivity: async (projectId, activityId, actor) => {
    const current = getCurrent(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectOperationApi.deleteActivity(projectId, activityId, current.version);
      set((state) => ({ operations: replace(state.operations, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to update this project operation');
    const updated = { ...current, activities: current.activities.filter((item) => item.id !== activityId), version: current.version + 1, updatedBy: actor.id, updatedAt: now() };
    audit(updated, actor.id, 'DELETE', `Activity ${activityId} removed from project ${projectId}`);
    set((state) => ({ operations: replace(state.operations, updated) }));
    return updated;
  },
  updateMilestones: async (projectId, input, actor) => {
    const current = getCurrent(get(), projectId);
    if (input.expectedCompletionDate !== undefined && !input.reason.trim()) throw new Error('A completion date change reason is required');
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectOperationApi.updateMilestones(projectId, current.version, input);
      set((state) => ({ operations: replace(state.operations, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to update this project operation');
    const timestamp = now();
    const kind: ProjectOperationActivityKind = input.actualCompletionDate !== undefined ? 'COMPLETED' : input.awardDate !== undefined ? 'AWARD' : 'COMPLETION_CHANGED';
    const activity: ProjectOperationActivity = { id: newId('operation-milestone'), projectOperationId: current.id, kind, occurredAt: timestamp, title: activityTitleFallback(kind), body: input.reason, metadata: { from: current.expectedCompletionDate || null, to: input.expectedCompletionDate || input.actualCompletionDate || input.awardDate || null }, createdBy: actor.id, createdAt: timestamp };
    const updated = { ...current, ...input, activities: [activity, ...current.activities], version: current.version + 1, updatedBy: actor.id, updatedAt: timestamp };
    audit(updated, actor.id, 'UPDATE', `Project ${projectId} milestones updated`);
    set((state) => ({ operations: replace(state.operations, updated) }));
    return updated;
  },
  reviewStart: async (projectId, decision, note, actor) => {
    const current = getCurrent(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectOperationApi.reviewStart(projectId, current.version, decision, note);
      set((state) => ({ operations: replace(state.operations, updated) }));
      return updated;
    }
    if (!current.permissions.canApprove) throw new Error('You do not have permission to review the project start');
    const timestamp = now();
    const activity: ProjectOperationActivity = { id: newId('operation-start'), projectOperationId: current.id, kind: 'START_APPROVAL', occurredAt: timestamp, title: decision, body: note, metadata: { from: current.startApprovalStatus, to: decision }, createdBy: actor.id, createdAt: timestamp };
    const updated = { ...current, startApprovalStatus: decision, startApprovedBy: actor.id, startApprovedAt: timestamp, activities: [activity, ...current.activities], version: current.version + 1, updatedBy: actor.id, updatedAt: timestamp };
    useProjectStore.getState().updateProjectField(projectId, 'status', decision === 'APPROVED' ? 'IN_PROGRESS' : 'SCHEDULE_APPROVED');
    audit(updated, actor.id, decision === 'APPROVED' ? 'APPROVE' : 'REJECT', `Project ${projectId} start ${decision.toLowerCase()}`);
    set((state) => ({ operations: replace(state.operations, updated) }));
    return updated;
  },
}), { name: 'project-operation-storage-v1', partialize: (state) => ({ operations: state.operations }) }));
