import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { projectIntakeApi, ProjectIntakeApiError } from '@/lib/projectIntakeApi';
import {
  buildProjectIntakeDraft,
  evaluateProjectIntakeCompleteness,
  validateSecretReferences,
} from '@/lib/projectIntake';
import { useEstimateRequestStore } from '@/store/estimateRequestStore';
import { useProjectStore } from '@/store/projectStore';
import {
  ProjectIntake,
  ProjectIntakeDraft,
  ProjectIntakeHistory,
  ProjectIntakeStatus,
  Role,
} from '@/types/models';

type PersistenceMode = 'CHECKING' | 'SERVER' | 'LOCAL_DEMO';
type IntakeActor = { id: string; role: Role; departmentId: string };

interface ProjectIntakeState {
  intakes: ProjectIntake[];
  persistenceMode: PersistenceMode;
  loading: boolean;
  error: string | null;
  sync: (actor: IntakeActor) => Promise<void>;
  saveDraft: (id: string, draft: ProjectIntakeDraft, actor: IntakeActor) => Promise<ProjectIntake>;
  review: (id: string, draft: ProjectIntakeDraft, note: string, actor: IntakeActor) => Promise<ProjectIntake>;
  accept: (id: string, note: string, actor: IntakeActor) => Promise<ProjectIntake>;
}

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
const replace = (items: ProjectIntake[], intake: ProjectIntake) =>
  items.map((item) => item.id === intake.id ? intake : item);

const findSourceRequest = (intake: ProjectIntake) =>
  useEstimateRequestStore.getState().requests.find((request) => request.id === intake.estimateRequestId);

const localPermissions = (intake: ProjectIntake, actor: IntakeActor) => {
  const source = findSourceRequest(intake);
  const isAdmin = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role);
  const isManager = actor.role === 'DEPARTMENT_MANAGER' && source?.departmentId === actor.departmentId;
  const isOwner = actor.role === 'PM' && source?.ownerId === actor.id;
  return {
    canEdit: intake.status !== 'ACCEPTED' && (isAdmin || isManager || isOwner),
    canReview: intake.status !== 'ACCEPTED' && (isAdmin || isManager),
  };
};

const hydrateLocal = (intake: ProjectIntake, actor: IntakeActor): ProjectIntake => {
  const draft = buildProjectIntakeDraft(intake);
  return {
    ...intake,
    draft,
    draftJson: JSON.stringify(draft),
    completeness: { missing: evaluateProjectIntakeCompleteness(draft) },
    permissions: localPermissions(intake, actor),
    histories: intake.histories || [],
  };
};

const localHistory = (
  intake: ProjectIntake,
  action: string,
  actorId: string,
  fromStatus: ProjectIntakeStatus,
  toStatus: ProjectIntakeStatus,
  changes: Record<string, unknown>,
): ProjectIntakeHistory => ({
  id: newId('project-intake-history'),
  projectIntakeId: intake.id,
  action,
  fromStatus,
  toStatus,
  changesJson: JSON.stringify(changes),
  actorId,
  createdAt: now(),
});

const mergeIntakesFromRequests = (existing: ProjectIntake[], actor: IntakeActor) => {
  const byId = new Map(existing.map((item) => [item.id, item]));
  useEstimateRequestStore.getState().requests.forEach((request) => {
    if (!request.projectIntake) return;
    if (!byId.has(request.projectIntake.id)) byId.set(request.projectIntake.id, request.projectIntake);
  });
  return Array.from(byId.values()).map((item) => hydrateLocal(item, actor))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

const assertEdit = (intake: ProjectIntake, actor: IntakeActor) => {
  if (!localPermissions(intake, actor).canEdit) throw new Error('You do not have permission to edit this project intake');
  if (intake.status === 'ACCEPTED') throw new Error('An accepted project intake is immutable');
};

const assertReview = (intake: ProjectIntake, actor: IntakeActor) => {
  if (!localPermissions(intake, actor).canReview) throw new Error('You do not have permission to review this project intake');
  if (intake.status === 'ACCEPTED') throw new Error('An accepted project intake is immutable');
};

export const useProjectIntakeStore = create<ProjectIntakeState>()(persist((set, get) => ({
  intakes: [],
  persistenceMode: 'CHECKING',
  loading: false,
  error: null,

  sync: async (actor) => {
    set({ loading: true, error: null });
    try {
      const intakes = await projectIntakeApi.list();
      set({ intakes, persistenceMode: 'SERVER', loading: false });
    } catch (caught) {
      if (caught instanceof TypeError || (caught instanceof ProjectIntakeApiError && [401, 404].includes(caught.status))) {
        set((state) => ({
          intakes: mergeIntakesFromRequests(state.intakes, actor),
          persistenceMode: 'LOCAL_DEMO',
          loading: false,
        }));
        return;
      }
      set({ loading: false, error: caught instanceof Error ? caught.message : 'Project intake synchronization failed' });
    }
  },

  saveDraft: async (id, draft, actor) => {
    const current = get().intakes.find((item) => item.id === id);
    if (!current) throw new Error('Project intake not found');
    validateSecretReferences(draft.secretReferences);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectIntakeApi.save(id, current.version, draft);
      set((state) => ({ intakes: replace(state.intakes, updated) }));
      return updated;
    }
    assertEdit(current, actor);
    const timestamp = now();
    const changes = {
      version: current.version + 1,
      contactCount: draft.contacts.length,
      materialCount: draft.materials.length,
      secretReferenceCount: draft.secretReferences.length,
    };
    const updated = hydrateLocal({
      ...current,
      projectNo: draft.projectNo,
      draft,
      draftJson: JSON.stringify(draft),
      version: current.version + 1,
      updatedBy: actor.id,
      updatedAt: timestamp,
      histories: [localHistory(current, 'DRAFT_SAVED', actor.id, current.status, current.status, changes), ...(current.histories || [])],
    }, actor);
    set((state) => ({ intakes: replace(state.intakes, updated) }));
    return updated;
  },

  review: async (id, draft, note, actor) => {
    const current = get().intakes.find((item) => item.id === id);
    if (!current) throw new Error('Project intake not found');
    validateSecretReferences(draft.secretReferences);
    const missing = evaluateProjectIntakeCompleteness(draft);
    if (missing.length) throw new Error(`Project intake is incomplete: ${missing.join(', ')}`);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectIntakeApi.review(id, current.version, draft, note);
      set((state) => ({ intakes: replace(state.intakes, updated) }));
      return updated;
    }
    assertReview(current, actor);
    const timestamp = now();
    const updated = hydrateLocal({
      ...current,
      status: 'REVIEWED',
      projectNo: draft.projectNo,
      draft,
      draftJson: JSON.stringify(draft),
      reviewNote: note,
      reviewedBy: actor.id,
      reviewedAt: timestamp,
      version: current.version + 1,
      updatedBy: actor.id,
      updatedAt: timestamp,
      histories: [localHistory(current, 'REVIEWED', actor.id, current.status, 'REVIEWED', { note }), ...(current.histories || [])],
    }, actor);
    set((state) => ({ intakes: replace(state.intakes, updated) }));
    return updated;
  },

  accept: async (id, note, actor) => {
    const current = get().intakes.find((item) => item.id === id);
    if (!current) throw new Error('Project intake not found');
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectIntakeApi.accept(id, current.version, note);
      set((state) => ({ intakes: replace(state.intakes, updated) }));
      return updated;
    }
    assertReview(current, actor);
    if (current.status !== 'REVIEWED') throw new Error('A project intake must be reviewed before acceptance');
    const draft = buildProjectIntakeDraft(current);
    const missing = evaluateProjectIntakeCompleteness(draft);
    if (missing.length) throw new Error(`Project intake is incomplete: ${missing.join(', ')}`);
    const timestamp = now();
    useProjectStore.getState().updateProjectField(current.projectId, 'status', 'MANAGER_REVIEW');
    const updated = {
      ...current,
      status: 'ACCEPTED' as const,
      reviewNote: note || current.reviewNote,
      acceptedBy: actor.id,
      acceptedAt: timestamp,
      version: current.version + 1,
      updatedBy: actor.id,
      updatedAt: timestamp,
      permissions: { canEdit: false, canReview: false },
      histories: [localHistory(current, 'ACCEPTED', actor.id, current.status, 'ACCEPTED', { note, projectStatus: 'MANAGER_REVIEW' }), ...(current.histories || [])],
    };
    set((state) => ({ intakes: replace(state.intakes, updated) }));
    return updated;
  },
}), {
  name: 'project-intake-storage-v1',
  partialize: (state) => ({ intakes: state.intakes }),
}));
