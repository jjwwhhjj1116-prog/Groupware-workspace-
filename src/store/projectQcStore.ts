import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deriveLocalQcStatus, makeLocalProjectQcChecklist, ProjectQcActor, refreshLocalChecklist } from '@/lib/projectQc';
import { projectQcApi, ProjectQcApiError, ProjectQcAttachmentInput, ProjectQcItemInput, ProjectQcItemUpdate } from '@/lib/projectQcApi';
import { useAuditStore } from '@/store/auditStore';
import { useProjectPmScheduleStore } from '@/store/projectPmScheduleStore';
import { useProjectStore } from '@/store/projectStore';
import { ProjectQcAttachment, ProjectQcChecklist, ProjectQcCheck, ProjectQcHistory, ProjectQcItem, ProjectQcTerm } from '@/types/models';

type PersistenceMode = 'CHECKING' | 'SERVER' | 'LOCAL_DEMO';
interface ProjectQcState {
  checklists: ProjectQcChecklist[];
  terms: ProjectQcTerm[];
  persistenceMode: PersistenceMode;
  loading: boolean;
  error: string | null;
  sync: (projectId: string, actor: ProjectQcActor) => Promise<void>;
  createItem: (projectId: string, input: ProjectQcItemInput, actor: ProjectQcActor) => Promise<ProjectQcChecklist>;
  updateItem: (projectId: string, itemId: string, input: ProjectQcItemUpdate, actor: ProjectQcActor) => Promise<ProjectQcChecklist>;
  duplicateItem: (projectId: string, itemId: string, actor: ProjectQcActor) => Promise<ProjectQcChecklist>;
  deleteItem: (projectId: string, itemId: string, actor: ProjectQcActor) => Promise<ProjectQcChecklist>;
  addAttachment: (projectId: string, itemId: string, input: ProjectQcAttachmentInput, actor: ProjectQcActor) => Promise<ProjectQcChecklist>;
  removeAttachment: (projectId: string, itemId: string, attachmentId: string, actor: ProjectQcActor) => Promise<ProjectQcChecklist>;
  sendCategory: (projectId: string, group: string, actor: ProjectQcActor) => Promise<ProjectQcChecklist>;
  upsertTerm: (term: string, definition: string, actor: ProjectQcActor) => Promise<ProjectQcTerm>;
}

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
const replace = (items: ProjectQcChecklist[], checklist: ProjectQcChecklist) => items.some((item) => item.projectId === checklist.projectId)
  ? items.map((item) => item.projectId === checklist.projectId ? checklist : item)
  : [...items, checklist];
const canFallback = (error: unknown) => error instanceof TypeError || (error instanceof ProjectQcApiError && [401, 404].includes(error.status));
const audit = (checklist: ProjectQcChecklist, actorId: string, action: string, message: string) => useAuditStore.getState().addLog({ actorId, action, entityType: 'PROJECT_QC', entityId: checklist.id, message });
const scheduleAssignmentIds = (projectId: string) => {
  const schedule = useProjectPmScheduleStore.getState().schedules.find((item) => item.projectId === projectId);
  if (!schedule) return [];
  const rows = schedule.approvedPlan === 'plan2' ? schedule.plan2.rows : schedule.plan1.rows;
  return [...new Set([...Object.values(schedule.assignment).filter(Boolean) as string[], ...rows.map((row) => row.assigneeId).filter(Boolean)])];
};
const localHistory = (checklistId: string, itemId: string | null, action: string, actorId: string, details: Record<string, unknown>): ProjectQcHistory => ({ id: newId('qc-history'), projectQcChecklistId: checklistId, projectQcItemId: itemId, action, actorId, details, createdAt: now() });
const currentChecklist = (state: ProjectQcState, projectId: string) => {
  const checklist = state.checklists.find((item) => item.projectId === projectId);
  if (!checklist) throw new Error('Project QC checklist not found');
  return checklist;
};
const finishLocal = (checklist: ProjectQcChecklist, actor: ProjectQcActor) => refreshLocalChecklist({ ...checklist, version: checklist.version + 1, updatedBy: actor.id, updatedAt: now() }, actor, scheduleAssignmentIds(checklist.projectId));

export const useProjectQcStore = create<ProjectQcState>()(persist((set, get) => ({
  checklists: [], terms: [], persistenceMode: 'CHECKING', loading: false, error: null,
  sync: async (projectId, actor) => {
    set({ loading: true, error: null });
    try {
      const [checklist, terms] = await Promise.all([projectQcApi.get(projectId), projectQcApi.listTerms()]);
      set((state) => ({ checklists: replace(state.checklists, checklist), terms, persistenceMode: 'SERVER', loading: false }));
    } catch (error) {
      if (canFallback(error)) {
        const project = useProjectStore.getState().projects.find((item) => item.id === projectId && !item.isDeleted);
        if (!project) { set({ loading: false, error: 'Canonical project not found' }); return; }
        const schedule = useProjectPmScheduleStore.getState().schedules.find((item) => item.projectId === projectId);
        set((state) => {
          const existing = state.checklists.find((item) => item.projectId === projectId);
          const hydrated = existing
            ? refreshLocalChecklist({ ...existing, project: { ...existing.project, name: project.title, status: project.status, departmentId: project.departmentId, managerId: project.managerId || '', pmId: project.pmId || '' } }, actor, scheduleAssignmentIds(projectId))
            : makeLocalProjectQcChecklist(project, actor, schedule);
          return { checklists: replace(state.checklists, hydrated), persistenceMode: 'LOCAL_DEMO', loading: false };
        });
        return;
      }
      set({ loading: false, error: error instanceof Error ? error.message : 'Project QC synchronization failed' });
    }
  },
  createItem: async (projectId, input, actor) => {
    const current = currentChecklist(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectQcApi.createItem(projectId, current.version, input);
      set((state) => ({ checklists: replace(state.checklists, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to update this project QC checklist');
    const timestamp = now();
    const itemId = newId('qc-item');
    const history = localHistory(current.id, itemId, 'CREATED', actor.id, { group: input.group, serialNo: input.serialNo });
    const attachments: ProjectQcAttachment[] = input.attachments.map((attachment) => ({ id: newId('qc-attachment'), projectQcItemId: itemId, ...attachment, createdBy: actor.id, createdAt: timestamp }));
    const checks: ProjectQcCheck[] = input.targets.map((target) => ({ target, done: false, na: false, checkedBy: '', checkedAt: '' }));
    const item: ProjectQcItem = { id: itemId, projectQcChecklistId: current.id, ...input, checks, status: 'PENDING', objection: {}, eliminated: false, createdBy: actor.id, updatedBy: actor.id, createdAt: timestamp, updatedAt: timestamp, attachments, histories: [history] };
    const updated = finishLocal({ ...current, items: [...current.items, item], histories: [history, ...current.histories] }, actor);
    audit(updated, actor.id, 'CREATE', `QC item ${item.serialNo} created for project ${projectId}`);
    set((state) => ({ checklists: replace(state.checklists, updated) }));
    return updated;
  },
  updateItem: async (projectId, itemId, input, actor) => {
    const current = currentChecklist(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectQcApi.updateItem(projectId, itemId, current.version, input);
      set((state) => ({ checklists: replace(state.checklists, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to update this project QC checklist');
    const existing = current.items.find((item) => item.id === itemId);
    if (!existing) throw new Error('Project QC item not found');
    if (existing.sentAt) throw new Error('Sent QC items are locked');
    const targets = input.targets || existing.targets;
    const checks = input.checks || targets.map((target) => existing.checks.find((check) => check.target === target) || { target, done: false, na: false, checkedBy: '', checkedAt: '' });
    const history = localHistory(current.id, itemId, input.checks ? 'CHECK_UPDATED' : 'UPDATED', actor.id, { fields: Object.keys(input) });
    const item: ProjectQcItem = { ...existing, ...input, targets, checks, status: deriveLocalQcStatus(checks), objection: input.objection === undefined ? existing.objection : input.objection || {}, updatedBy: actor.id, updatedAt: now(), histories: [history, ...existing.histories] };
    const updated = finishLocal({ ...current, items: current.items.map((entry) => entry.id === itemId ? item : entry), histories: [history, ...current.histories] }, actor);
    audit(updated, actor.id, 'UPDATE', `QC item ${item.serialNo} updated for project ${projectId}`);
    set((state) => ({ checklists: replace(state.checklists, updated) }));
    return updated;
  },
  duplicateItem: async (projectId, itemId, actor) => {
    const current = currentChecklist(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectQcApi.duplicateItem(projectId, itemId, current.version);
      set((state) => ({ checklists: replace(state.checklists, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to update this project QC checklist');
    const source = current.items.find((item) => item.id === itemId);
    if (!source) throw new Error('Project QC item not found');
    const timestamp = now();
    const copyId = newId('qc-item');
    const history = localHistory(current.id, copyId, 'DUPLICATED', actor.id, { sourceItemId: itemId });
    const copy: ProjectQcItem = { ...source, id: copyId, serialNo: `${source.serialNo}-COPY`, checks: source.targets.map((target) => ({ target, done: false, na: false, checkedBy: '', checkedAt: '' })), status: 'PENDING', sentAt: null, sentBy: null, createdBy: actor.id, updatedBy: actor.id, createdAt: timestamp, updatedAt: timestamp, attachments: source.attachments.map((file) => ({ ...file, id: newId('qc-attachment'), projectQcItemId: copyId, createdBy: actor.id, createdAt: timestamp })), histories: [history] };
    const updated = finishLocal({ ...current, items: [...current.items, copy], histories: [history, ...current.histories] }, actor);
    audit(updated, actor.id, 'CREATE', `QC item ${source.serialNo} duplicated for project ${projectId}`);
    set((state) => ({ checklists: replace(state.checklists, updated) }));
    return updated;
  },
  deleteItem: async (projectId, itemId, actor) => {
    const current = currentChecklist(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectQcApi.deleteItem(projectId, itemId, current.version);
      set((state) => ({ checklists: replace(state.checklists, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to update this project QC checklist');
    const item = current.items.find((entry) => entry.id === itemId);
    if (!item) throw new Error('Project QC item not found');
    if (item.sentAt) throw new Error('Sent QC items are locked');
    const history = localHistory(current.id, itemId, 'DELETED', actor.id, { serialNo: item.serialNo });
    const updated = finishLocal({ ...current, items: current.items.filter((entry) => entry.id !== itemId), histories: [history, ...current.histories] }, actor);
    audit(updated, actor.id, 'DELETE', `QC item ${item.serialNo} deleted from project ${projectId}`);
    set((state) => ({ checklists: replace(state.checklists, updated) }));
    return updated;
  },
  addAttachment: async (projectId, itemId, input, actor) => {
    const current = currentChecklist(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectQcApi.addAttachment(projectId, itemId, current.version, input);
      set((state) => ({ checklists: replace(state.checklists, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to update this project QC checklist');
    const item = current.items.find((entry) => entry.id === itemId);
    if (!item || item.sentAt) throw new Error('Project QC item is not editable');
    const attachment: ProjectQcAttachment = { id: newId('qc-attachment'), projectQcItemId: itemId, ...input, createdBy: actor.id, createdAt: now() };
    const history = localHistory(current.id, itemId, 'ATTACHMENT_ADDED', actor.id, { attachmentId: attachment.id, originalName: attachment.originalName });
    const updated = finishLocal({
      ...current,
      items: current.items.map((entry) => entry.id === itemId
        ? { ...entry, attachments: [attachment, ...entry.attachments], histories: [history, ...entry.histories], updatedBy: actor.id, updatedAt: now() }
        : entry),
      histories: [history, ...current.histories],
    }, actor);
    audit(updated, actor.id, 'UPDATE', `Attachment ${attachment.originalName} added to QC item ${item.serialNo}`);
    set((state) => ({ checklists: replace(state.checklists, updated) }));
    return updated;
  },
  removeAttachment: async (projectId, itemId, attachmentId, actor) => {
    const current = currentChecklist(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectQcApi.removeAttachment(projectId, itemId, attachmentId, current.version);
      set((state) => ({ checklists: replace(state.checklists, updated) }));
      return updated;
    }
    if (!current.permissions.canEdit) throw new Error('You do not have permission to update this project QC checklist');
    const item = current.items.find((entry) => entry.id === itemId);
    if (!item || item.sentAt) throw new Error('Project QC item is not editable');
    const history = localHistory(current.id, itemId, 'ATTACHMENT_REMOVED', actor.id, { attachmentId });
    const updated = finishLocal({ ...current, items: current.items.map((entry) => entry.id === itemId ? { ...entry, attachments: entry.attachments.filter((file) => file.id !== attachmentId), histories: [history, ...entry.histories] } : entry), histories: [history, ...current.histories] }, actor);
    set((state) => ({ checklists: replace(state.checklists, updated) }));
    return updated;
  },
  sendCategory: async (projectId, group, actor) => {
    const current = currentChecklist(get(), projectId);
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectQcApi.sendCategory(projectId, current.version, group);
      set((state) => ({ checklists: replace(state.checklists, updated) }));
      return updated;
    }
    if (!current.permissions.canSend) throw new Error('You do not have permission to send this QC category');
    const timestamp = now();
    const histories: ProjectQcHistory[] = [];
    const items = current.items.map((item) => {
      if (item.group !== group) return item;
      const entry = localHistory(current.id, item.id, 'CATEGORY_SENT', actor.id, { group });
      histories.push(entry);
      return { ...item, checks: item.checks.map((check) => check.target === 'PM' ? { ...check, done: true, na: false, checkedBy: actor.id, checkedAt: timestamp } : check), status: 'SENT' as const, sentAt: timestamp, sentBy: actor.id, updatedBy: actor.id, updatedAt: timestamp, histories: [entry, ...item.histories] };
    });
    if (!histories.length) throw new Error('No project QC items exist in this category');
    const updated = finishLocal({ ...current, items, histories: [...histories, ...current.histories] }, actor);
    audit(updated, actor.id, 'APPROVE', `QC category ${group} sent for project ${projectId}`);
    set((state) => ({ checklists: replace(state.checklists, updated) }));
    return updated;
  },
  upsertTerm: async (term, definition, actor) => {
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectQcApi.upsertTerm(term, definition);
      set((state) => ({ terms: state.terms.some((item) => item.id === updated.id) ? state.terms.map((item) => item.id === updated.id ? updated : item) : [...state.terms, updated] }));
      return updated;
    }
    if (!['SUPER_ADMIN', 'SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'].includes(actor.role)) throw new Error('QC glossary management requires manager access');
    const existing = get().terms.find((item) => item.term === term);
    const timestamp = now();
    const updated: ProjectQcTerm = existing ? { ...existing, definition, updatedBy: actor.id, updatedAt: timestamp } : { id: newId('qc-term'), term, definition, createdBy: actor.id, updatedBy: actor.id, createdAt: timestamp, updatedAt: timestamp };
    set((state) => ({ terms: existing ? state.terms.map((item) => item.id === existing.id ? updated : item) : [...state.terms, updated] }));
    return updated;
  },
}), { name: 'project-qc-storage-v1', partialize: (state) => ({ checklists: state.checklists, terms: state.terms }) }));
