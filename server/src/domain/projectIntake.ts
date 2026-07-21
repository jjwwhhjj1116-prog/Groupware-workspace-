import { z } from 'zod';

export const PROJECT_INTAKE_STATUSES = ['DRAFT', 'REVIEWED', 'ACCEPTED'] as const;
export type ProjectIntakeStatus = typeof PROJECT_INTAKE_STATUSES[number];

const optionalText = z.string().trim().max(10000).default('');
const optionalShortText = z.string().trim().max(500).default('');

export const projectIntakeContactSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: optionalShortText,
  role: optionalShortText,
  department: optionalShortText,
  telephone: optionalShortText,
  mobile: optionalShortText,
  email: z.union([z.literal(''), z.string().trim().email().max(320)]).default(''),
}).strict();

export const projectIntakeMaterialSchema = z.object({
  id: z.string().trim().min(1).max(100),
  category: optionalShortText,
  label: z.string().trim().min(1).max(500),
  memo: optionalText,
  status: z.enum(['NOT_RECEIVED', 'PARTIAL', 'RECEIVED', 'CONFIRMED']),
  comment: optionalText,
  confirmedBy: optionalShortText,
  originalName: optionalShortText,
  size: z.number().int().nonnegative().nullable().default(null),
  mimeType: optionalShortText,
  storageKey: optionalShortText,
}).strict();

export const projectIntakeSecretReferenceSchema = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(500),
  provider: z.string().trim().min(1).max(100),
  reference: z.string().trim().regex(
    /^(vault|secret|credential|ref):\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+$/,
    'Secret references must use vault://, secret://, credential://, or ref://',
  ).max(500),
  note: optionalText,
}).strict();

export const projectIntakeDraftSchema = z.object({
  projectName: z.string().trim().max(500).default(''),
  projectNo: z.string().trim().max(100).default(''),
  company: optionalShortText,
  client: optionalShortText,
  usage: optionalShortText,
  area: optionalShortText,
  buildings: optionalShortText,
  floors: optionalShortText,
  basementFloors: optionalShortText,
  groundFloors: optionalShortText,
  bidDate: optionalShortText,
  unitPrice: optionalShortText,
  businessTypes: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  scopes: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  contacts: z.array(projectIntakeContactSchema).max(20).default([]),
  materials: z.array(projectIntakeMaterialSchema).max(100).default([]),
  expectedStartDate: optionalShortText,
  firstDelivery: optionalShortText,
  secondDelivery: optionalShortText,
  thirdDelivery: optionalShortText,
  finalDelivery: optionalShortText,
  workContent: optionalText,
  notes: optionalText,
  request: optionalText,
  secretReferences: z.array(projectIntakeSecretReferenceSchema).max(20).default([]),
  source: z.object({
    estimateRequestId: z.string().trim().min(1),
    requestNo: z.string().trim().min(1),
    estimateId: z.string().trim().nullable().default(null),
    estimateSheetId: z.string().trim().nullable().default(null),
    estimateSubmissionId: z.string().trim().nullable().default(null),
    estimateDocumentHash: z.string().trim().nullable().default(null),
    commercialDecisionId: z.string().trim().min(1),
    projectId: z.string().trim().min(1),
  }).strict(),
  commercial: z.object({
    agreedAmount: z.string().trim().nullable().default(null),
    agreedScope: z.string().trim().nullable().default(null),
    agreedSchedule: z.string().trim().nullable().default(null),
    startCondition: z.string().trim().nullable().default(null),
  }).strict(),
}).strict();

export type ProjectIntakeDraft = z.infer<typeof projectIntakeDraftSchema>;

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
);
const text = (value: unknown) => typeof value === 'string' ? value : '';
const nullable = (value: unknown) => typeof value === 'string' && value ? value : null;
const stableId = (prefix: string, index: number) => `${prefix}-${index + 1}`;

const materialStatus = (value: unknown): ProjectIntakeDraft['materials'][number]['status'] => {
  const normalized = text(value).toUpperCase();
  if (['CONFIRMED', '확인완료'].includes(normalized)) return 'CONFIRMED';
  if (['RECEIVED', '접수'].includes(normalized)) return 'RECEIVED';
  if (['PARTIAL', '일부접수'].includes(normalized)) return 'PARTIAL';
  return 'NOT_RECEIVED';
};

export function buildProjectIntakeDraft(
  snapshotValue: unknown,
  ids: { projectId: string; commercialDecisionId: string; projectNo: string },
): ProjectIntakeDraft {
  const snapshot = record(snapshotValue);
  const source = record(snapshot.source);
  const project = record(snapshot.project);
  const decision = record(snapshot.decision);
  const sourceAttachments = Array.isArray(snapshot.attachments) ? snapshot.attachments.map(record) : [];
  const fixedMaterials = [
    ['drawing', '도면'],
    ['specification', '시방서'],
    ['site-briefing', '현장설명서'],
    ['statement', '내역서'],
    ['other', '기타자료'],
  ];
  const attachmentsByCategory = new Map(sourceAttachments.map((item) => [text(item.category), item]));
  const materials = fixedMaterials.map(([category, label], index) => {
    const item = attachmentsByCategory.get(category) || sourceAttachments[index] || {};
    return {
      id: text(item.id) || stableId('material', index),
      category,
      label,
      memo: text(item.memo),
      status: item.originalName ? 'RECEIVED' as const : materialStatus(item.status),
      comment: '',
      confirmedBy: '',
      originalName: text(item.originalName),
      size: typeof item.size === 'number' ? item.size : null,
      mimeType: text(item.mimeType),
      storageKey: text(item.storageKey),
    };
  });
  sourceAttachments.slice(fixedMaterials.length).forEach((item, index) => {
    materials.push({
      id: text(item.id) || stableId('material-extra', index),
      category: text(item.category) || 'other',
      label: text(item.label) || text(item.originalName) || '기타자료',
      memo: text(item.memo),
      status: item.originalName ? 'RECEIVED' : materialStatus(item.status),
      comment: '',
      confirmedBy: '',
      originalName: text(item.originalName),
      size: typeof item.size === 'number' ? item.size : null,
      mimeType: text(item.mimeType),
      storageKey: text(item.storageKey),
    });
  });

  const contactName = text(project.contact) || text(project.client);
  const contact = contactName || project.phone || project.email ? [{
    id: 'contact-1',
    name: contactName,
    role: '',
    department: text(project.contactDepartment),
    telephone: text(project.phone),
    mobile: '',
    email: text(project.email),
  }] : [];
  const deliveries = Array.isArray(project.deliveries) ? project.deliveries : [];
  const scope = text(project.scope);

  return projectIntakeDraftSchema.parse({
    projectName: text(project.projectName),
    projectNo: ids.projectNo,
    company: text(project.company),
    client: text(project.client),
    usage: text(project.usage),
    area: text(project.areaPy),
    buildings: text(project.buildingCount),
    floors: text(project.floors),
    basementFloors: '',
    groundFloors: '',
    bidDate: text(project.bidDate),
    unitPrice: text(project.unitWork),
    businessTypes: text(project.estimateType) ? [text(project.estimateType)] : [],
    scopes: scope ? scope.split(/[,/\n]/).map((item) => item.trim()).filter(Boolean) : [],
    contacts: contact,
    materials,
    expectedStartDate: text(project.expectedStartDate),
    firstDelivery: text(deliveries[0]),
    secondDelivery: text(deliveries[1]),
    thirdDelivery: text(deliveries[2]),
    finalDelivery: text(deliveries[3]),
    workContent: scope,
    notes: text(project.memo),
    request: text(project.rawMemo),
    secretReferences: [],
    source: {
      estimateRequestId: text(source.estimateRequestId),
      requestNo: text(source.requestNo) || ids.projectNo,
      estimateId: nullable(source.estimateId),
      estimateSheetId: nullable(source.estimateSheetId),
      estimateSubmissionId: nullable(source.estimateSubmissionId),
      estimateDocumentHash: nullable(source.estimateDocumentHash),
      commercialDecisionId: ids.commercialDecisionId,
      projectId: ids.projectId,
    },
    commercial: {
      agreedAmount: nullable(decision.agreedAmount),
      agreedScope: nullable(decision.agreedScope),
      agreedSchedule: nullable(decision.agreedSchedule),
      startCondition: nullable(decision.startCondition),
    },
  });
}

export function evaluateProjectIntakeCompleteness(draft: ProjectIntakeDraft): string[] {
  const missing: string[] = [];
  if (!draft.projectName) missing.push('projectName');
  if (!draft.projectNo) missing.push('projectNo');
  if (!draft.company && !draft.client) missing.push('client');
  if (!draft.workContent && draft.scopes.length === 0) missing.push('workContent');
  if (!draft.expectedStartDate) missing.push('expectedStartDate');
  if (!draft.firstDelivery && !draft.finalDelivery) missing.push('deliveryDate');
  if (!draft.contacts.some((contact) => contact.name && (contact.telephone || contact.mobile || contact.email))) {
    missing.push('contact');
  }
  if (draft.materials.length === 0) missing.push('materials');
  return missing;
}

export function assertProjectIntakeTransition(current: string, target: ProjectIntakeStatus): void {
  if (current === 'ACCEPTED') throw new Error('An accepted project intake is immutable');
  if (target === 'ACCEPTED' && current !== 'REVIEWED') {
    throw new Error('A project intake must be reviewed before acceptance');
  }
}

export type ProjectIntakeActor = { personnelId: string; role: string; departmentId: string };
export type ProjectIntakeScope = { ownerId: string | null; departmentId: string };

export function canViewProjectIntake(actor: ProjectIntakeActor, scope: ProjectIntakeScope): boolean {
  if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) return true;
  if (actor.role === 'DEPARTMENT_MANAGER') return actor.departmentId === scope.departmentId;
  return actor.role === 'PM' && (actor.personnelId === scope.ownerId || actor.departmentId === scope.departmentId);
}

export function canEditProjectIntake(actor: ProjectIntakeActor, scope: ProjectIntakeScope): boolean {
  if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) return true;
  if (actor.role === 'DEPARTMENT_MANAGER') return actor.departmentId === scope.departmentId;
  return actor.role === 'PM' && actor.personnelId === scope.ownerId;
}

export function canReviewProjectIntake(actor: ProjectIntakeActor, scope: ProjectIntakeScope): boolean {
  if (['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) return true;
  return actor.role === 'DEPARTMENT_MANAGER' && actor.departmentId === scope.departmentId;
}
