import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  findPmScheduleConflicts,
  localPmSchedulePermissions,
  makeLocalPmSchedule,
  missingPmPlans,
  nextPmScheduleStatus,
  PmScheduleActor,
} from '@/lib/projectPmSchedule';
import { projectPmScheduleApi, ProjectPmScheduleApiError } from '@/lib/projectPmScheduleApi';
import { useAuditStore } from '@/store/auditStore';
import { useProjectStore } from '@/store/projectStore';
import {
  PmAssignment,
  PmRequestTargets,
  PmSchedulePlan,
  ProjectPmSchedule,
  ProjectPmScheduleHistory,
} from '@/types/models';

type PersistenceMode = 'CHECKING' | 'SERVER' | 'LOCAL_DEMO';

interface ProjectPmScheduleState {
  schedules: ProjectPmSchedule[];
  persistenceMode: PersistenceMode;
  loading: boolean;
  error: string | null;
  sync: (actor: PmScheduleActor) => Promise<void>;
  assign: (projectId: string, assignment: PmAssignment, actor: PmScheduleActor) => Promise<ProjectPmSchedule>;
  requestDraft: (projectId: string, targets: PmRequestTargets, memo: string, actor: PmScheduleActor) => Promise<ProjectPmSchedule>;
  savePlans: (projectId: string, plan1: PmSchedulePlan, plan2: PmSchedulePlan, actor: PmScheduleActor) => Promise<ProjectPmSchedule>;
  submit: (projectId: string, plan1: PmSchedulePlan, plan2: PmSchedulePlan, actor: PmScheduleActor) => Promise<ProjectPmSchedule>;
  approve: (projectId: string, selected: 'plan1' | 'plan2', actor: PmScheduleActor) => Promise<ProjectPmSchedule>;
  reject: (projectId: string, reason: string, actor: PmScheduleActor) => Promise<ProjectPmSchedule>;
}

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
const replace = (items: ProjectPmSchedule[], item: ProjectPmSchedule) => items.map((current) => current.projectId === item.projectId ? item : current);
const actorCanFallback = (error: unknown) => error instanceof TypeError
  || (error instanceof ProjectPmScheduleApiError && [401, 404].includes(error.status));

const hydrate = (schedule: ProjectPmSchedule, actor: PmScheduleActor): ProjectPmSchedule => ({
  ...schedule,
  completeness: { missing: missingPmPlans(schedule.plan1, schedule.plan2) },
  permissions: localPmSchedulePermissions(schedule, actor),
});

const mergeSchedulesFromProjects = (existing: ProjectPmSchedule[], actor: PmScheduleActor) => {
  const byProject = new Map(existing.map((item) => [item.projectId, item]));
  useProjectStore.getState().projects
    .filter((project) => !project.isDeleted && [
      'MANAGER_REVIEW',
      'PM_ASSIGNED',
      'SCHEDULE_DRAFTING',
      'SCHEDULE_PENDING_APPROVAL',
      'SCHEDULE_REJECTED',
      'SCHEDULE_APPROVED',
    ].includes(project.status))
    .forEach((project) => {
      if (!byProject.has(project.id)) byProject.set(project.id, makeLocalPmSchedule(project, actor));
      const current = byProject.get(project.id)!;
      byProject.set(project.id, hydrate({
        ...current,
        project: {
          ...current.project,
          name: project.title,
          status: project.status,
          departmentId: project.departmentId,
          managerId: project.managerId || '',
          pmId: project.pmId || current.assignment.primaryPmId || '',
        },
      }, actor));
    });
  return Array.from(byProject.values()).filter((item) => item.permissions.canView).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

const localHistory = (
  schedule: ProjectPmSchedule,
  action: string,
  actorId: string,
  toStatus: string,
  details: Record<string, unknown>,
): ProjectPmScheduleHistory => ({
  id: newId('pm-history'),
  projectPmScheduleId: schedule.id,
  action,
  fromStatus: schedule.status,
  toStatus,
  detailsJson: JSON.stringify(details),
  actorId,
  createdAt: now(),
});

const audit = (schedule: ProjectPmSchedule, actorId: string, action: string, message: string) => {
  useAuditStore.getState().addLog({
    actorId,
    action,
    entityType: 'PROJECT_PM_SCHEDULE',
    entityId: schedule.id,
    message,
  });
};

const updateLocal = (
  schedule: ProjectPmSchedule,
  actor: PmScheduleActor,
  action: string,
  status: ProjectPmSchedule['status'],
  updates: Partial<ProjectPmSchedule>,
  details: Record<string, unknown>,
) => hydrate({
  ...schedule,
  ...updates,
  status,
  version: schedule.version + 1,
  updatedBy: actor.id,
  updatedAt: now(),
  histories: [localHistory(schedule, action, actor.id, status, details), ...schedule.histories],
}, actor);

const projectStatusFor = (status: ProjectPmSchedule['status']) => ({
  PENDING_ASSIGNMENT: 'MANAGER_REVIEW',
  PM_ASSIGNED: 'PM_ASSIGNED',
  DRAFT_REQUESTED: 'SCHEDULE_DRAFTING',
  DRAFTING: 'SCHEDULE_DRAFTING',
  SUBMITTED: 'SCHEDULE_PENDING_APPROVAL',
  REJECTED: 'SCHEDULE_REJECTED',
  APPROVED: 'SCHEDULE_APPROVED',
} as const)[status];

export const useProjectPmScheduleStore = create<ProjectPmScheduleState>()(persist((set, get) => ({
  schedules: [],
  persistenceMode: 'CHECKING',
  loading: false,
  error: null,

  sync: async (actor) => {
    set({ loading: true, error: null });
    try {
      const schedules = await projectPmScheduleApi.list();
      set({ schedules, persistenceMode: 'SERVER', loading: false });
    } catch (error) {
      if (actorCanFallback(error)) {
        set((state) => ({ schedules: mergeSchedulesFromProjects(state.schedules, actor), persistenceMode: 'LOCAL_DEMO', loading: false }));
        return;
      }
      set({ loading: false, error: error instanceof Error ? error.message : 'PM schedule synchronization failed' });
    }
  },

  assign: async (projectId, assignment, actor) => {
    const current = get().schedules.find((item) => item.projectId === projectId);
    if (!current) throw new Error('PM schedule not found');
    if (!assignment.primaryPmId) throw new Error('Primary PM is required');
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectPmScheduleApi.assign(projectId, current.version, assignment);
      set((state) => ({ schedules: replace(state.schedules, updated) }));
      return updated;
    }
    if (!current.permissions.canAssign) throw new Error('You do not have permission to assign this project');
    const status = nextPmScheduleStatus(current.status, 'assign');
    const updated = updateLocal(current, actor, 'ASSIGNED', status, {
      assignment,
      project: { ...current.project, pmId: assignment.primaryPmId, status: projectStatusFor(status) },
    }, { assignment });
    useProjectStore.getState().updateProjectField(projectId, 'pmId', assignment.primaryPmId);
    useProjectStore.getState().updateProjectField(projectId, 'status', projectStatusFor(status));
    audit(updated, actor.id, 'UPDATE', `PM assignment updated for project ${projectId}`);
    set((state) => ({ schedules: replace(state.schedules, updated) }));
    return updated;
  },

  requestDraft: async (projectId, targets, memo, actor) => {
    const current = get().schedules.find((item) => item.projectId === projectId);
    if (!current) throw new Error('PM schedule not found');
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectPmScheduleApi.requestDraft(projectId, current.version, targets, memo);
      set((state) => ({ schedules: replace(state.schedules, updated) }));
      return updated;
    }
    if (!current.permissions.canAssign) throw new Error('You do not have permission to request schedule drafts');
    const status = nextPmScheduleStatus(current.status, 'request');
    const updated = updateLocal(current, actor, 'DRAFT_REQUESTED', status, {
      requestTargets: targets,
      requestMemo: memo,
      requestedBy: actor.id,
      requestedAt: now(),
      project: { ...current.project, status: projectStatusFor(status) },
    }, { targets, memo });
    useProjectStore.getState().updateProjectField(projectId, 'status', projectStatusFor(status));
    audit(updated, actor.id, 'REQUEST', `PM schedule draft requested for project ${projectId}`);
    set((state) => ({ schedules: replace(state.schedules, updated) }));
    return updated;
  },

  savePlans: async (projectId, plan1, plan2, actor) => {
    const current = get().schedules.find((item) => item.projectId === projectId);
    if (!current) throw new Error('PM schedule not found');
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectPmScheduleApi.save(projectId, current.version, plan1, plan2);
      set((state) => ({ schedules: replace(state.schedules, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to edit this schedule');
    const status = nextPmScheduleStatus(current.status, 'save');
    const updated = updateLocal(current, actor, 'DRAFT_SAVED', status, { plan1, plan2, project: { ...current.project, status: projectStatusFor(status) } }, { plan1Rows: plan1.rows.length, plan2Rows: plan2.rows.length });
    useProjectStore.getState().updateProjectField(projectId, 'status', projectStatusFor(status));
    audit(updated, actor.id, 'UPDATE', `PM schedule draft saved for project ${projectId}`);
    set((state) => ({ schedules: replace(state.schedules, updated) }));
    return updated;
  },

  submit: async (projectId, plan1, plan2, actor) => {
    const current = get().schedules.find((item) => item.projectId === projectId);
    if (!current) throw new Error('PM schedule not found');
    const missing = missingPmPlans(plan1, plan2);
    if (missing.length) throw new Error(`Both complete schedule proposals are required: ${missing.join(', ')}`);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectPmScheduleApi.submit(projectId, current.version, plan1, plan2);
      set((state) => ({ schedules: replace(state.schedules, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to submit this schedule');
    const status = nextPmScheduleStatus(current.status, 'submit');
    const timestamp = now();
    const updated = updateLocal(current, actor, 'SUBMITTED', status, {
      plan1,
      plan2,
      submittedBy: actor.id,
      submittedAt: timestamp,
      rejectReason: null,
      project: { ...current.project, status: projectStatusFor(status) },
    }, { plan1Rows: plan1.rows.length, plan2Rows: plan2.rows.length });
    useProjectStore.getState().updateProjectField(projectId, 'status', projectStatusFor(status));
    audit(updated, actor.id, 'SUBMIT', `PM schedule submitted for project ${projectId}`);
    set((state) => ({ schedules: replace(state.schedules, updated) }));
    return updated;
  },

  approve: async (projectId, selected, actor) => {
    const current = get().schedules.find((item) => item.projectId === projectId);
    if (!current) throw new Error('PM schedule not found');
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectPmScheduleApi.approve(projectId, current.version, selected);
      set((state) => ({ schedules: replace(state.schedules, updated) }));
      return updated;
    }
    if (!current.permissions.canReview) throw new Error('You do not have permission to approve this schedule');
    const selectedRows = selected === 'plan1' ? current.plan1.rows : current.plan2.rows;
    const conflicts = findPmScheduleConflicts(projectId, selectedRows, get().schedules);
    if (conflicts.length) throw new Error(`Schedule conflict: ${conflicts.map((item) => `${item.projectName} ${item.startDate}~${item.endDate}`).join(', ')}`);
    const status = nextPmScheduleStatus(current.status, 'approve');
    const updated = updateLocal(current, actor, 'APPROVED', status, {
      selectedProposal: selected,
      approvedPlan: selected,
      approvedBy: actor.id,
      approvedAt: now(),
      rejectReason: null,
      project: { ...current.project, status: projectStatusFor(status) },
    }, { approvedPlan: selected, rowCount: selectedRows.length });
    useProjectStore.getState().updateProjectField(projectId, 'status', projectStatusFor(status));
    audit(updated, actor.id, 'APPROVE', `PM schedule approved for project ${projectId}`);
    set((state) => ({ schedules: replace(state.schedules, updated) }));
    return updated;
  },

  reject: async (projectId, reason, actor) => {
    const current = get().schedules.find((item) => item.projectId === projectId);
    if (!current) throw new Error('PM schedule not found');
    if (!reason.trim()) throw new Error('A rejection reason is required');
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectPmScheduleApi.reject(projectId, current.version, reason.trim());
      set((state) => ({ schedules: replace(state.schedules, updated) }));
      return updated;
    }
    if (!current.permissions.canReview) throw new Error('You do not have permission to reject this schedule');
    const status = nextPmScheduleStatus(current.status, 'reject');
    const updated = updateLocal(current, actor, 'REJECTED', status, { rejectReason: reason.trim(), project: { ...current.project, status: projectStatusFor(status) } }, { reason: reason.trim() });
    useProjectStore.getState().updateProjectField(projectId, 'status', projectStatusFor(status));
    audit(updated, actor.id, 'REJECT', `PM schedule rejected for project ${projectId}`);
    set((state) => ({ schedules: replace(state.schedules, updated) }));
    return updated;
  },
}), {
  name: 'project-pm-schedule-storage-v1',
  partialize: (state) => ({ schedules: state.schedules }),
}));
