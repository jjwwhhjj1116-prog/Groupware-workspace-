import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { estimateSheetApi, EstimateSheetApiError } from '@/lib/estimateSheetApi';
import { ESTIMATE_TEMPLATE_SPECS } from '@/lib/estimateSheetTemplates';
import { useEstimateRequestStore } from '@/store/estimateRequestStore';
import {
  EstimateSheet,
  EstimateSheetState,
  EstimateSubmission,
  EstimateSheetVersion,
  EstimateTemplateType,
} from '@/types/models';

type PersistenceMode = 'CHECKING' | 'SERVER' | 'LOCAL_DEMO';

interface EstimateSheetStore {
  sheets: Record<string, EstimateSheet>;
  persistenceMode: PersistenceMode;
  loading: boolean;
  error: string | null;
  sync: (requestId: string) => Promise<EstimateSheet | null>;
  createSheet: (requestId: string, type: EstimateTemplateType, state: EstimateSheetState, actorId: string) => Promise<EstimateSheet>;
  saveVersion: (requestId: string, state: EstimateSheetState, actorId: string) => Promise<EstimateSheet>;
  submitSheet: (requestId: string, actorId: string, recipient?: string, deliveryChannel?: string) => Promise<EstimateSheet>;
  sendSubmission: (requestId: string, actorId: string) => Promise<EstimateSheet>;
  startRevision: (requestId: string, actorId: string) => Promise<EstimateSheet>;
  recordExport: (requestId: string, format: 'XLSX' | 'PDF', fileName: string, actorId: string) => Promise<void>;
}

const id = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
const timestamp = () => new Date().toISOString();
const replace = (sheets: Record<string, EstimateSheet>, requestId: string, sheet: EstimateSheet) => ({ ...sheets, [requestId]: sheet });
const canFallback = (error: unknown) => error instanceof TypeError || (error instanceof EstimateSheetApiError && [401, 404].includes(error.status));
const assertRequestIsActive = (requestId: string) => {
  const request = useEstimateRequestStore.getState().requests.find((item) => item.id === requestId);
  if (request && ['WON', 'LOST', 'CANCELLED'].includes(request.status)) {
    throw new Error('A terminal estimate request cannot change its estimate submission');
  }
};

const sha256 = async (value: string) => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const submissionSummary = (requestId: string, sheet: EstimateSheet) => {
  const request = useEstimateRequestStore.getState().requests.find((item) => item.id === requestId);
  const version = sheet.versions.find((item) => item.version === sheet.currentVersion) || sheet.versions[0];
  const value = (key: string) => String(version?.state.cells[key]?.value ?? '');
  return {
    requestNo: request?.requestNo || '',
    projectName: value('6:2') || request?.projectName || '',
    company: value('5:2') || request?.company || request?.client || '',
    serviceDescription: value('7:2'),
    total: value('10:2'),
    templateType: sheet.templateType,
    version: sheet.currentVersion,
  };
};

export const useEstimateSheetStore = create<EstimateSheetStore>()(persist((set, get) => ({
  sheets: {},
  persistenceMode: 'CHECKING',
  loading: false,
  error: null,

  sync: async (requestId) => {
    set({ loading: true, error: null });
    try {
      const sheet = await estimateSheetApi.get(requestId);
      set((state) => ({ sheets: sheet ? replace(state.sheets, requestId, sheet) : state.sheets, persistenceMode: 'SERVER', loading: false }));
      return sheet;
    } catch (error) {
      if (canFallback(error)) {
        set({ persistenceMode: 'LOCAL_DEMO', loading: false });
        return get().sheets[requestId] || null;
      }
      set({ loading: false, error: error instanceof Error ? error.message : 'Estimate sheet synchronization failed' });
      throw error;
    }
  },

  createSheet: async (requestId, type, state, actorId) => {
    assertRequestIsActive(requestId);
    const spec = ESTIMATE_TEMPLATE_SPECS[type];
    if (get().persistenceMode === 'SERVER') {
      const sheet = await estimateSheetApi.create(requestId, type, spec.sourceHash, state);
      set((current) => ({ sheets: replace(current.sheets, requestId, sheet) }));
      await useEstimateRequestStore.getState().sync();
      return sheet;
    }
    const now = timestamp();
    const sheetId = id('estimate-sheet');
    const version: EstimateSheetVersion = {
      id: id('estimate-version'), estimateSheetId: sheetId, version: 1, templateVersion: 1,
      templateHash: spec.sourceHash, state, createdBy: actorId, createdAt: now,
    };
    const sheet: EstimateSheet = {
      id: sheetId, estimateRequestId: requestId, templateId: `legacy-${type}`, templateType: type,
      status: 'DRAFT', currentVersion: 1, createdBy: actorId, updatedBy: actorId, createdAt: now, updatedAt: now,
      template: { id: `legacy-${type}`, type, sheetName: spec.sheet, version: 1, sourceHash: spec.sourceHash, active: true, createdAt: now, updatedAt: now },
      versions: [version], exports: [], submissions: [],
    };
    set((current) => ({ sheets: replace(current.sheets, requestId, sheet) }));
    await useEstimateRequestStore.getState().updateRequest(requestId, {
      estimateId: sheet.id,
      estimateType: type,
      status: 'ESTIMATE_DRAFTING',
    }, actorId);
    return sheet;
  },

  saveVersion: async (requestId, state, actorId) => {
    const current = get().sheets[requestId];
    if (!current) throw new Error('Estimate sheet not found');
    if (current.status !== 'DRAFT') throw new Error('Sent estimate sheets are immutable');
    const hash = ESTIMATE_TEMPLATE_SPECS[current.templateType].sourceHash;
    if (get().persistenceMode === 'SERVER') {
      const sheet = await estimateSheetApi.saveVersion(requestId, current.currentVersion, hash, state);
      set((value) => ({ sheets: replace(value.sheets, requestId, sheet) }));
      return sheet;
    }
    const now = timestamp();
    const versionNumber = current.currentVersion + 1;
    const sheet = {
      ...current,
      currentVersion: versionNumber,
      updatedBy: actorId,
      updatedAt: now,
      versions: [{ id: id('estimate-version'), estimateSheetId: current.id, version: versionNumber, templateVersion: current.template.version, templateHash: hash, state, createdBy: actorId, createdAt: now }, ...current.versions],
    };
    set((value) => ({ sheets: replace(value.sheets, requestId, sheet) }));
    return sheet;
  },

  submitSheet: async (requestId, actorId, recipient, deliveryChannel) => {
    assertRequestIsActive(requestId);
    const current = get().sheets[requestId];
    if (!current) throw new Error('Estimate sheet not found');
    if (current.status !== 'DRAFT') throw new Error('Only a draft estimate sheet can be submitted');
    if (get().persistenceMode === 'SERVER') {
      const sheet = await estimateSheetApi.submit(requestId, current.currentVersion, recipient, deliveryChannel);
      set((value) => ({ sheets: replace(value.sheets, requestId, sheet) }));
      return sheet;
    }
    const now = timestamp();
    const summary = submissionSummary(requestId, current);
    const version = current.versions.find((item) => item.version === current.currentVersion);
    if (!version) throw new Error('Current estimate sheet version is missing');
    const submission: EstimateSubmission = {
      id: id('estimate-submission'), estimateSheetId: current.id, version: current.currentVersion,
      status: 'SUBMITTED', submittedAt: now, submittedBy: actorId, recipient: recipient || summary.company || null,
      deliveryChannel: deliveryChannel || null, documentHash: await sha256(JSON.stringify(version.state)),
      summary, createdAt: now, updatedAt: now,
    };
    const sheet = { ...current, status: 'SUBMITTED' as const, updatedBy: actorId, updatedAt: now, submissions: [submission, ...(current.submissions || [])] };
    set((value) => ({ sheets: replace(value.sheets, requestId, sheet) }));
    return sheet;
  },

  sendSubmission: async (requestId, actorId) => {
    assertRequestIsActive(requestId);
    const current = get().sheets[requestId];
    if (!current) throw new Error('Estimate sheet not found');
    if (current.status !== 'SUBMITTED') throw new Error('Submit the current version before sending it');
    const submission = (current.submissions || []).find((item) => item.version === current.currentVersion);
    if (!submission) throw new Error('Current estimate submission not found');
    if (get().persistenceMode === 'SERVER') {
      const sheet = await estimateSheetApi.sendSubmission(requestId, submission.id, current.currentVersion);
      set((value) => ({ sheets: replace(value.sheets, requestId, sheet) }));
      await useEstimateRequestStore.getState().sync();
      return sheet;
    }
    const now = timestamp();
    const sheet = {
      ...current,
      status: 'SENT' as const,
      updatedBy: actorId,
      updatedAt: now,
      submissions: (current.submissions || []).map((item) => item.id === submission.id
        ? { ...item, status: 'SENT' as const, sentAt: now, sentBy: actorId, updatedAt: now }
        : item),
    };
    set((value) => ({ sheets: replace(value.sheets, requestId, sheet) }));
    await useEstimateRequestStore.getState().changeStatus(requestId, 'WAITING', actorId);
    return sheet;
  },

  startRevision: async (requestId, actorId) => {
    assertRequestIsActive(requestId);
    const current = get().sheets[requestId];
    if (!current) throw new Error('Estimate sheet not found');
    if (current.status !== 'SENT') throw new Error('A new version can only start from a sent estimate sheet');
    if (get().persistenceMode === 'SERVER') {
      const sheet = await estimateSheetApi.createRevision(requestId, current.currentVersion);
      set((value) => ({ sheets: replace(value.sheets, requestId, sheet) }));
      await useEstimateRequestStore.getState().sync();
      return sheet;
    }
    const now = timestamp();
    const source = current.versions.find((item) => item.version === current.currentVersion);
    if (!source) throw new Error('Current estimate sheet version is missing');
    const nextVersion = current.currentVersion + 1;
    const next: EstimateSheetVersion = {
      ...source,
      id: id('estimate-version'),
      version: nextVersion,
      state: JSON.parse(JSON.stringify(source.state)),
      createdBy: actorId,
      createdAt: now,
    };
    const sheet = { ...current, status: 'DRAFT' as const, currentVersion: nextVersion, updatedBy: actorId, updatedAt: now, versions: [next, ...current.versions] };
    set((value) => ({ sheets: replace(value.sheets, requestId, sheet) }));
    await useEstimateRequestStore.getState().changeStatus(requestId, 'ESTIMATE_DRAFTING', actorId);
    return sheet;
  },

  recordExport: async (requestId, format, fileName, actorId) => {
    const current = get().sheets[requestId];
    if (!current) throw new Error('Estimate sheet not found');
    if (get().persistenceMode === 'SERVER') {
      await estimateSheetApi.recordExport(requestId, current.currentVersion, format, fileName);
      const refreshed = await estimateSheetApi.get(requestId);
      if (refreshed) set((value) => ({ sheets: replace(value.sheets, requestId, refreshed) }));
      return;
    }
    const exported = { id: id('estimate-export'), estimateSheetId: current.id, version: current.currentVersion, format, fileName, actorId, createdAt: timestamp() };
    set((value) => ({ sheets: replace(value.sheets, requestId, { ...current, exports: [exported, ...current.exports] }) }));
  },
}), {
  name: 'estimate-sheet-storage-v1',
  partialize: (state) => ({ sheets: state.sheets }),
}));
