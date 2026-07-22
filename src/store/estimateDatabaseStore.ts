import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { estimateDatabaseApi, EstimateDatabaseApiError, EstimateDbRecordInput } from '@/lib/estimateDatabaseApi';
import { buildEstimateDbReport, calculateEstimateDbPayload } from '@/lib/estimateDatabase';
import type { EstimateDbAnnualReport, EstimateDbMonthlyTarget, EstimateDbPayload, EstimateDbRecord, EstimateDbSection, EstimateDbTargetType, EstimateDbVendor } from '@/types/models';

type PersistenceMode = 'CHECKING' | 'SERVER' | 'LOCAL_DEMO';
interface EstimateDatabaseState {
  records: EstimateDbRecord[];
  vendors: EstimateDbVendor[];
  targets: EstimateDbMonthlyTarget[];
  persistenceMode: PersistenceMode;
  loading: boolean;
  error: string | null;
  sync: (year: number) => Promise<void>;
  createRecord: (input: EstimateDbRecordInput, actorId: string) => Promise<EstimateDbRecord>;
  updateRecord: (record: EstimateDbRecord, data: EstimateDbPayload, actorId: string) => Promise<EstimateDbRecord>;
  deleteRecord: (record: EstimateDbRecord) => Promise<void>;
  duplicateRecord: (record: EstimateDbRecord, actorId: string) => Promise<EstimateDbRecord>;
  createVendor: (data: EstimateDbPayload, actorId: string) => Promise<EstimateDbVendor>;
  updateVendor: (vendor: EstimateDbVendor, data: EstimateDbPayload, actorId: string) => Promise<EstimateDbVendor>;
  deleteVendor: (vendor: EstimateDbVendor) => Promise<void>;
  putTarget: (type: EstimateDbTargetType, year: number, month: number, amount: string, actorId: string) => Promise<EstimateDbMonthlyTarget>;
  report: (year: number) => EstimateDbAnnualReport;
}

const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
const canFallback = (error: unknown) => error instanceof TypeError || (error instanceof EstimateDatabaseApiError && [401, 404].includes(error.status));
const VENDOR_SEED = [
  ['㈜대신적산엔지니어링', '기계'], ['㈜조인적산', '기계'], ['㈜타임엔지니어링', '전기'],
  ['㈜동양엔지니어링', '전기'], ['㈜우성엔지니어링', '전기'], ['경신Cost Engineering', '전기'],
];
const seededVendors = (): EstimateDbVendor[] => VENDOR_SEED.map(([name, trade], index) => ({ id: `legacy-vendor-${index + 1}`, normalizedName: name.toLowerCase(), normalizedTrade: trade.toLowerCase(), data: { NO: String(index + 1), '업체명': name, '공종': trade }, version: 1, createdBy: 'legacy-seed', updatedBy: 'legacy-seed', createdAt: now(), updatedAt: now() }));

const linked = (record: EstimateDbRecord, section: EstimateDbSection, actorId: string): EstimateDbRecord => ({ id: uid(section.toLowerCase()), section, projectId: record.projectId, sourceRecordId: record.id, pjNo: record.pjNo, year: record.year, sortOrder: record.sortOrder, schemaVersion: 1, data: calculateEstimateDbPayload(section, { 'PJ NO': record.pjNo || '', 'PJ명': record.data['프로젝트명'] || '', '업체명': record.data['거래처명'] || '' }), version: 1, createdBy: actorId, updatedBy: actorId, createdAt: now(), updatedAt: now() });

export const useEstimateDatabaseStore = create<EstimateDatabaseState>()(persist((set, get) => ({
  records: [], vendors: seededVendors(), targets: [], persistenceMode: 'CHECKING', loading: false, error: null,
  sync: async (year) => {
    set({ loading: true, error: null });
    try {
      const [pj, progress, mep, vendors, targets] = await Promise.all([
        estimateDatabaseApi.listRecords('PJ'), estimateDatabaseApi.listRecords('PROGRESS'), estimateDatabaseApi.listRecords('MEP_CONTRACT'), estimateDatabaseApi.listVendors(), estimateDatabaseApi.listTargets(year),
      ]);
      set({ records: [...pj.rows, ...progress.rows, ...mep.rows], vendors, targets, persistenceMode: 'SERVER', loading: false });
    } catch (error) {
      if (canFallback(error)) set({ persistenceMode: 'LOCAL_DEMO', loading: false });
      else { set({ error: error instanceof Error ? error.message : 'Database synchronization failed', loading: false }); throw error; }
    }
  },
  createRecord: async (input, actorId) => {
    if (get().persistenceMode === 'SERVER') { const row = await estimateDatabaseApi.createRecord(input); set((state) => ({ records: [...state.records, row] })); return row; }
    const timestamp = now();
    const row: EstimateDbRecord = { id: uid('db'), section: input.section, projectId: input.projectId, sourceRecordId: input.sourceRecordId, pjNo: input.pjNo, year: input.year, sortOrder: input.sortOrder || 0, schemaVersion: 1, data: calculateEstimateDbPayload(input.section, input.data), version: 1, createdBy: actorId, updatedBy: actorId, createdAt: timestamp, updatedAt: timestamp };
    set((state) => ({ records: [...state.records, row, ...(row.section === 'PJ' ? [linked(row, 'PROGRESS', actorId), linked(row, 'MEP_CONTRACT', actorId)] : [])] }));
    return row;
  },
  updateRecord: async (record, data, actorId) => {
    const pjNo = String(data['PJ NO'] ?? record.pjNo ?? '').trim() || null;
    if (get().persistenceMode === 'SERVER') { const row = await estimateDatabaseApi.updateRecord(record.id, record.version, { data, pjNo }); set((state) => ({ records: state.records.map((item) => item.id === row.id ? row : item) })); return row; }
    const row = { ...record, pjNo, data: calculateEstimateDbPayload(record.section, data), version: record.version + 1, updatedBy: actorId, updatedAt: now() };
    set((state) => ({ records: state.records.map((item) => {
      if (item.id === row.id) return row;
      if (row.section !== 'PJ' || item.sourceRecordId !== row.id) return item;
      const linkedData = calculateEstimateDbPayload(item.section, {
        ...item.data,
        'PJ NO': row.pjNo || row.data['PJ NO'] || '',
        'PJ명': row.data['프로젝트명'] || '',
        '업체명': row.data['거래처명'] || '',
      });
      return { ...item, pjNo: row.pjNo, year: row.year, data: linkedData, version: item.version + 1, updatedBy: actorId, updatedAt: now() };
    }) })); return row;
  },
  deleteRecord: async (record) => { if (get().persistenceMode === 'SERVER') await estimateDatabaseApi.deleteRecord(record.id, record.version); set((state) => ({ records: state.records.filter((item) => item.id !== record.id && item.sourceRecordId !== record.id) })); },
  duplicateRecord: async (record, actorId) => {
    if (get().persistenceMode === 'SERVER') { const row = await estimateDatabaseApi.duplicateRecord(record.id); set((state) => ({ records: [...state.records, row] })); return row; }
    return get().createRecord({ section: record.section, pjNo: record.pjNo ? `${record.pjNo}-COPY` : null, year: record.year, sortOrder: record.sortOrder + 1, data: { ...record.data } }, actorId);
  },
  createVendor: async (data, actorId) => { const name = String(data['업체명'] || ''); const trade = String(data['공종'] || ''); if (get().persistenceMode === 'SERVER') { const vendor = await estimateDatabaseApi.createVendor(name, trade, data); set((state) => ({ vendors: [...state.vendors.filter((item) => item.id !== vendor.id), vendor] })); return vendor; } const vendor: EstimateDbVendor = { id: uid('vendor'), normalizedName: name.trim().toLowerCase(), normalizedTrade: trade.trim().toLowerCase(), data, version: 1, createdBy: actorId, updatedBy: actorId, createdAt: now(), updatedAt: now() }; set((state) => ({ vendors: [...state.vendors, vendor] })); return vendor; },
  updateVendor: async (vendor, data, actorId) => { const saved = get().persistenceMode === 'SERVER' ? await estimateDatabaseApi.updateVendor(vendor, data) : { ...vendor, data, version: vendor.version + 1, updatedBy: actorId, updatedAt: now() }; set((state) => ({ vendors: state.vendors.map((item) => item.id === saved.id ? saved : item) })); return saved; },
  deleteVendor: async (vendor) => { if (get().persistenceMode === 'SERVER') await estimateDatabaseApi.deleteVendor(vendor); set((state) => ({ vendors: state.vendors.filter((item) => item.id !== vendor.id) })); },
  putTarget: async (type, year, month, value, actorId) => { const current = get().targets.find((item) => item.type === type && item.year === year && item.month === month); const saved = get().persistenceMode === 'SERVER' ? await estimateDatabaseApi.putTarget(type, year, month, value, current?.version) : { id: current?.id || uid('target'), type, year, month, amount: value, version: (current?.version || 0) + 1, updatedBy: actorId, createdAt: current?.createdAt || now(), updatedAt: now() }; set((state) => ({ targets: [...state.targets.filter((item) => !(item.type === type && item.year === year && item.month === month)), saved] })); return saved; },
  report: (year) => buildEstimateDbReport(get().records, get().targets, year),
}), { name: 'estimate-database-storage-v1', partialize: (state) => ({ records: state.records, vendors: state.vendors, targets: state.targets }) }));
