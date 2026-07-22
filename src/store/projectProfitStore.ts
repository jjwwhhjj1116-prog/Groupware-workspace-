import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { makeLocalProfitAnalysis, ProjectProfitActor, refreshLocalProfitAnalysis } from '@/lib/projectProfit';
import { ProjectProfitApiError, ProjectProfitUpdateInput, UnitPriceTableInput, projectProfitApi } from '@/lib/projectProfitApi';
import { useAuditStore } from '@/store/auditStore';
import { useAuthStore } from '@/store/authStore';
import { useProjectIntakeStore } from '@/store/projectIntakeStore';
import { useProjectPmScheduleStore } from '@/store/projectPmScheduleStore';
import { useProjectStore } from '@/store/projectStore';
import { ProjectProfitAnalysis, ProjectProfitMember, ProjectProfitRound, UnitPriceTable } from '@/types/models';

type PersistenceMode = 'CHECKING' | 'SERVER' | 'LOCAL_DEMO';
interface ProjectProfitState {
  analyses: ProjectProfitAnalysis[];
  unitPriceTables: UnitPriceTable[];
  persistenceMode: PersistenceMode;
  loading: boolean;
  error: string | null;
  sync: (projectId: string, actor: ProjectProfitActor) => Promise<void>;
  save: (projectId: string, input: ProjectProfitUpdateInput, actor: ProjectProfitActor) => Promise<ProjectProfitAnalysis>;
  createUnitPrices: (input: UnitPriceTableInput, actor: ProjectProfitActor) => Promise<UnitPriceTable>;
}

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
const replace = (items: ProjectProfitAnalysis[], analysis: ProjectProfitAnalysis) => items.some((item) => item.projectId === analysis.projectId) ? items.map((item) => item.projectId === analysis.projectId ? analysis : item) : [...items, analysis];
const canFallback = (error: unknown) => error instanceof TypeError || error instanceof ProjectProfitApiError && [401, 404].includes(error.status);
const audit = (analysis: ProjectProfitAnalysis, actorId: string, message: string) => useAuditStore.getState().addLog({ actorId, action: 'UPDATE', entityType: 'PROJECT_PROFIT', entityId: analysis.id, message });

export const useProjectProfitStore = create<ProjectProfitState>()(persist((set, get) => ({
  analyses: [], unitPriceTables: [], persistenceMode: 'CHECKING', loading: false, error: null,
  sync: async (projectId, actor) => {
    set({ loading: true, error: null });
    try {
      const analysis = await projectProfitApi.get(projectId);
      let tables = get().unitPriceTables;
      if (analysis.permissions.canViewUnitPrices) {
        try { tables = await projectProfitApi.listUnitPrices(); } catch { tables = analysis.unitPriceTable ? [analysis.unitPriceTable] : tables; }
      }
      set((state) => ({ analyses: replace(state.analyses, analysis), unitPriceTables: tables, persistenceMode: 'SERVER', loading: false }));
    } catch (error) {
      if (canFallback(error)) {
        const project = useProjectStore.getState().projects.find((item) => item.id === projectId && !item.isDeleted);
        if (!project) { set({ loading: false, error: 'Canonical project not found' }); return; }
        const schedule = useProjectPmScheduleStore.getState().schedules.find((item) => item.projectId === projectId);
        const intake = useProjectIntakeStore.getState().intakes.find((item) => item.projectId === projectId);
        const activeTable = get().unitPriceTables.find((table) => table.active) || null;
        set((state) => {
          const existing = state.analyses.find((item) => item.projectId === projectId);
          const analysis = existing
            ? refreshLocalProfitAnalysis({ ...existing, project: { ...existing.project, name: project.title, status: project.status, departmentId: project.departmentId, managerId: project.managerId || '', pmId: project.pmId || '' } }, actor, activeTable || existing.unitPriceTable)
            : makeLocalProfitAnalysis(project, actor, useAuthStore.getState().users, schedule, intake, activeTable);
          return { analyses: replace(state.analyses, analysis), persistenceMode: 'LOCAL_DEMO', loading: false };
        });
        return;
      }
      set({ loading: false, error: error instanceof Error ? error.message : 'Project profit synchronization failed' });
    }
  },
  save: async (projectId, input, actor) => {
    const current = get().analyses.find((item) => item.projectId === projectId);
    if (!current) throw new Error('Project profit analysis not found');
    if (get().persistenceMode === 'SERVER') {
      const updated = await projectProfitApi.update(projectId, current.version, input);
      set((state) => ({ analyses: replace(state.analyses, updated) })); return updated;
    }
    if (!current.permissions.canEdit) throw new Error('Project profit edit permission is required');
    const selected = get().unitPriceTables.find((table) => table.id === input.unitPriceTableId) || current.unitPriceTable || null;
    const rounds: ProjectProfitRound[] = input.rounds.map((round) => ({
      id: current.rounds.find((item) => item.roundNo === round.roundNo)?.id || id('profit-round'), roundNo: round.roundNo, startDate: round.startDate, endDate: round.endDate,
      members: round.members.map((member) => ({ id: current.rounds.flatMap((item) => item.members).find((item) => item.sourceScheduleRowId && item.sourceScheduleRowId === member.sourceScheduleRowId)?.id || id('profit-member'), ...member, days: new Set(member.workDates).size, cost: '0.00' }) as ProjectProfitMember),
      otherCosts: round.otherCosts,
    }));
    const timestamp = now();
    const provisional: ProjectProfitAnalysis = { ...current, unitPriceTableId: selected?.id || null, unitPriceTable: selected, contractAmounts: input.contractAmounts, rounds, updatedBy: actor.id, updatedAt: timestamp, histories: [{ id: id('profit-history'), projectProfitAnalysisId: current.id, action: 'ANALYSIS_UPDATED', details: {}, actorId: actor.id, createdAt: timestamp }, ...current.histories] };
    const updated = refreshLocalProfitAnalysis(provisional, actor, selected);
    audit(updated, actor.id, `Project profit analysis updated: result ${updated.summary.result}`);
    set((state) => ({ analyses: replace(state.analyses, updated) })); return updated;
  },
  createUnitPrices: async (input, actor) => {
    if (!['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) throw new Error('Only administrators can manage unit prices');
    if (get().persistenceMode === 'SERVER') {
      const table = await projectProfitApi.createUnitPrices(input);
      set((state) => ({ unitPriceTables: [table, ...state.unitPriceTables.map((item) => ({ ...item, active: false }))] })); return table;
    }
    const timestamp = now(); const table: UnitPriceTable = { id: id('unit-price-table'), version: Math.max(0, ...get().unitPriceTables.map((item) => item.version)) + 1, effectiveDate: input.effectiveDate, active: true, createdBy: actor.id, createdAt: timestamp, entries: input.entries.map((entry) => ({ id: id('unit-price-entry'), ...entry, createdAt: timestamp })) };
    set((state) => ({ unitPriceTables: [table, ...state.unitPriceTables.map((item) => ({ ...item, active: false }))] }));
    useAuditStore.getState().addLog({ actorId: actor.id, action: 'CREATE', entityType: 'UNIT_PRICE_TABLE', entityId: table.id, message: `Unit price table v${table.version} created` });
    return table;
  },
}), { name: 'project-profit-storage-v1', partialize: (state) => ({ analyses: state.analyses, unitPriceTables: state.unitPriceTables }) }));
