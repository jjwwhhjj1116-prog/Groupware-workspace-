import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  estimateRequestApi,
  EstimateRequestApiError,
  EstimateRequestDraft,
} from '@/lib/estimateRequestApi';
import { useProjectStore } from '@/store/projectStore';
import {
  EstimateRequest,
  EstimateRequestActivityKind,
  EstimateRequestHistory,
  EstimateRequestStatus,
} from '@/types/models';

type PersistenceMode = 'CHECKING' | 'SERVER' | 'LOCAL_DEMO';

interface EstimateRequestState {
  requests: EstimateRequest[];
  persistenceMode: PersistenceMode;
  loading: boolean;
  error: string | null;
  sync: () => Promise<void>;
  createRequest: (draft: EstimateRequestDraft, actorId: string) => Promise<EstimateRequest>;
  updateRequest: (id: string, updates: Partial<EstimateRequest>, actorId: string) => Promise<EstimateRequest>;
  changeStatus: (id: string, status: EstimateRequestStatus, actorId: string) => Promise<EstimateRequest>;
  addActivity: (id: string, kind: EstimateRequestActivityKind, content: string, actorId: string) => Promise<void>;
  addAttachments: (id: string, category: string, files: File[], actorId: string) => Promise<void>;
  removeAttachment: (id: string, attachmentId: string, actorId: string) => Promise<void>;
}

const newId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
const now = () => new Date().toISOString();
const requestNo = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `ER-${date}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

const replaceRequest = (requests: EstimateRequest[], request: EstimateRequest) =>
  requests.map((item) => item.id === request.id ? request : item);

const ensureLinkedProject = (request: EstimateRequest) => {
  if (request.status !== 'WON' || !request.ownerId) return request.projectId || null;
  const projectStore = useProjectStore.getState();
  const existing = projectStore.projects.find((project) => project.id === request.projectId);
  if (existing) {
    if (existing.source !== 'ESTIMATE_REQUEST') {
      projectStore.updateProjectField(existing.id, 'source', 'ESTIMATE_REQUEST');
    }
    return existing.id;
  }
  if (request.projectId) {
    projectStore.replaceProjects([...projectStore.projects, {
      id: request.projectId,
      projectSourceType: 'CLIENT_ORDER',
      source: 'ESTIMATE_REQUEST',
      title: request.projectName,
      description: request.memo || undefined,
      priority: 'NORMAL',
      status: 'INTAKE_RECEIVED',
      departmentId: request.departmentId,
      managerId: request.ownerId,
      pmId: request.ownerId,
      startDate: request.expectedStartDate || undefined,
      deliveryDate: request.finalDelivery || request.firstDelivery || undefined,
      progress: 0,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    }]);
    return request.projectId;
  }
  return projectStore.addProject({
    projectSourceType: 'CLIENT_ORDER',
    source: 'ESTIMATE_REQUEST',
    title: request.projectName,
    description: request.memo || undefined,
    priority: 'NORMAL',
    departmentId: request.departmentId,
    managerId: request.ownerId,
    pmId: request.ownerId,
    startDate: request.expectedStartDate || undefined,
    deliveryDate: request.finalDelivery || request.firstDelivery || undefined,
  }).id;
};

export const useEstimateRequestStore = create<EstimateRequestState>()(persist((set, get) => ({
  requests: [],
  persistenceMode: 'CHECKING',
  loading: false,
  error: null,

  sync: async () => {
    set({ loading: true, error: null });
    try {
      const requests = await estimateRequestApi.list();
      set({ requests, persistenceMode: 'SERVER', loading: false });
    } catch (caught) {
      if (caught instanceof TypeError || (caught instanceof EstimateRequestApiError && [401, 404].includes(caught.status))) {
        set({ persistenceMode: 'LOCAL_DEMO', loading: false });
        return;
      }
      set({
        loading: false,
        error: caught instanceof Error ? caught.message : 'Estimate request synchronization failed',
      });
    }
  },

  createRequest: async (draft, actorId) => {
    if (get().persistenceMode === 'SERVER') {
      const created = await estimateRequestApi.create(draft);
      set((state) => ({ requests: [created, ...state.requests] }));
      return created;
    }
    const timestamp = now();
    const created: EstimateRequest = {
      ...draft,
      id: newId('estimate-request'),
      requestNo: draft.requestNo || requestNo(),
      status: draft.status || 'REQUEST_MEMO',
      projectName: draft.projectName,
      departmentId: draft.departmentId,
      requestDate: draft.requestDate || timestamp,
      version: 1,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: timestamp,
      updatedAt: timestamp,
      activities: [],
      attachments: [],
      histories: [{
        id: newId('history'),
        estimateRequestId: '',
        action: 'CREATED',
        toStatus: draft.status || 'REQUEST_MEMO',
        actorId,
        createdAt: timestamp,
      }],
    };
    created.histories[0].estimateRequestId = created.id;
    set((state) => ({ requests: [created, ...state.requests] }));
    return created;
  },

  updateRequest: async (id, updates, actorId) => {
    const current = get().requests.find((item) => item.id === id);
    if (!current) throw new Error('Estimate request not found');
    if (get().persistenceMode === 'SERVER') {
      const updated = await estimateRequestApi.update(id, current.version, updates);
      set((state) => ({ requests: replaceRequest(state.requests, updated) }));
      return updated;
    }
    const timestamp = now();
    const updated: EstimateRequest = {
      ...current,
      ...updates,
      version: current.version + 1,
      updatedBy: actorId,
      updatedAt: timestamp,
      histories: [{
        id: newId('history'),
        estimateRequestId: id,
        action: 'UPDATED',
        changes: JSON.stringify(updates),
        actorId,
        createdAt: timestamp,
      }, ...current.histories],
    };
    set((state) => ({ requests: replaceRequest(state.requests, updated) }));
    return updated;
  },

  changeStatus: async (id, status, actorId) => {
    const current = get().requests.find((item) => item.id === id);
    if (!current) throw new Error('Estimate request not found');
    if (get().persistenceMode === 'SERVER') {
      const updated = await estimateRequestApi.changeStatus(id, current.version, status);
      ensureLinkedProject(updated);
      set((state) => ({ requests: replaceRequest(state.requests, updated) }));
      return updated;
    }
    const timestamp = now();
    let updated: EstimateRequest = {
      ...current,
      status,
      projectId: current.projectId,
      version: current.version + 1,
      updatedBy: actorId,
      updatedAt: timestamp,
      histories: [{
        id: newId('history'),
        estimateRequestId: id,
        action: 'STATUS_CHANGED',
        fromStatus: current.status,
        toStatus: status,
        actorId,
        createdAt: timestamp,
      }, ...current.histories],
    };
    const projectId = ensureLinkedProject(updated);
    if (projectId && projectId !== updated.projectId) updated = { ...updated, projectId };
    set((state) => ({ requests: replaceRequest(state.requests, updated) }));
    return updated;
  },

  addActivity: async (id, kind, content, actorId) => {
    const current = get().requests.find((item) => item.id === id);
    if (!current) throw new Error('Estimate request not found');
    if (get().persistenceMode === 'SERVER') {
      await estimateRequestApi.addActivity(id, kind, content);
      const refreshed = await estimateRequestApi.get(id);
      set((state) => ({ requests: replaceRequest(state.requests, refreshed) }));
      return;
    }
    const timestamp = now();
    const created = {
      id: newId('activity'),
      estimateRequestId: id,
      kind,
      content,
      occurredAt: timestamp,
      createdBy: actorId,
      createdAt: timestamp,
    };
    set((state) => ({
      requests: state.requests.map((item) => item.id === id
        ? {
            ...item,
            activities: [created, ...item.activities],
            histories: [{
              id: newId('history'),
              estimateRequestId: id,
              action: `ACTIVITY_${kind}`,
              changes: content,
              actorId,
              createdAt: timestamp,
            }, ...item.histories],
          }
        : item),
    }));
  },

  addAttachments: async (id, category, files, actorId) => {
    const current = get().requests.find((item) => item.id === id);
    if (!current) throw new Error('Estimate request not found');
    const created = await Promise.all(files.map(async (file) => {
      const metadata = {
        category,
        label: category,
        originalName: file.name,
        size: file.size,
        mimeType: file.type || null,
        memo: null,
      };
      if (get().persistenceMode === 'SERVER') return estimateRequestApi.addAttachment(id, metadata);
      const timestamp = now();
      return {
        ...metadata,
        id: newId('attachment'),
        estimateRequestId: id,
        status: 'REGISTERED' as const,
        createdBy: actorId,
        createdAt: timestamp,
      };
    }));
    if (get().persistenceMode === 'SERVER') {
      const refreshed = await estimateRequestApi.get(id);
      set((state) => ({ requests: replaceRequest(state.requests, refreshed) }));
      return;
    }
    const timestamp = now();
    set((state) => ({
      requests: state.requests.map((item) => item.id === id
        ? {
            ...item,
            attachments: [...created, ...item.attachments],
            histories: created.map<EstimateRequestHistory>((attachment) => ({
              id: newId('history'),
              estimateRequestId: id,
              action: 'ATTACHMENT_ADDED',
              changes: attachment.originalName,
              actorId,
              createdAt: timestamp,
            })).concat(item.histories),
          }
        : item),
    }));
  },

  removeAttachment: async (id, attachmentId, actorId) => {
    const current = get().requests.find((item) => item.id === id);
    const attachment = current?.attachments.find((item) => item.id === attachmentId);
    if (!current || !attachment) throw new Error('Attachment not found');
    if (get().persistenceMode === 'SERVER') {
      await estimateRequestApi.removeAttachment(id, attachmentId);
      const refreshed = await estimateRequestApi.get(id);
      set((state) => ({ requests: replaceRequest(state.requests, refreshed) }));
      return;
    }
    const timestamp = now();
    set((state) => ({
      requests: state.requests.map((item) => item.id === id
        ? {
            ...item,
            attachments: item.attachments.filter((entry) => entry.id !== attachmentId),
            histories: [{
              id: newId('history'),
              estimateRequestId: id,
              action: 'ATTACHMENT_REMOVED',
              changes: attachment.originalName,
              actorId,
              createdAt: timestamp,
            }, ...item.histories],
          }
        : item),
    }));
  },
}), {
  name: 'estimate-request-storage-v1',
  partialize: (state) => ({ requests: state.requests }),
}));
