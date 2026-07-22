import {
  ProjectIntake,
  ProjectIntakeDraft,
  ProjectIntakeMaterial,
  ProjectIntakeSecretReference,
} from '@/types/models';

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
);
const text = (value: unknown) => typeof value === 'string' ? value : '';
const nullable = (value: unknown) => typeof value === 'string' && value ? value : null;

export const isSafeSecretReference = (value: string) => (
  /^(vault|secret|credential|ref):\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+$/.test(value)
);

export const buildProjectIntakeDraft = (intake: ProjectIntake): ProjectIntakeDraft => {
  if (intake.draft) return structuredClone(intake.draft);
  if (intake.draftJson) {
    try {
      return JSON.parse(intake.draftJson) as ProjectIntakeDraft;
    } catch {
      // Fall through to the immutable source snapshot.
    }
  }
  let snapshot: UnknownRecord = {};
  try {
    snapshot = record(JSON.parse(intake.sourceSnapshotJson));
  } catch {
    snapshot = {};
  }
  const source = record(snapshot.source);
  const project = record(snapshot.project);
  const decision = record(snapshot.decision);
  const attachments = Array.isArray(snapshot.attachments) ? snapshot.attachments.map(record) : [];
  const fixedMaterials = [
    ['drawing', '도면'],
    ['specification', '시방서'],
    ['site-briefing', '현장설명서'],
    ['statement', '내역서'],
    ['other', '기타자료'],
  ];
  const byCategory = new Map(attachments.map((item) => [text(item.category), item]));
  const materials: ProjectIntakeMaterial[] = fixedMaterials.map(([category, label], index) => {
    const attachment = byCategory.get(category) || attachments[index] || {};
    return {
      id: text(attachment.id) || `material-${index + 1}`,
      category,
      label,
      memo: text(attachment.memo),
      status: attachment.originalName ? 'RECEIVED' : 'NOT_RECEIVED',
      comment: '',
      confirmedBy: '',
      originalName: text(attachment.originalName),
      size: typeof attachment.size === 'number' ? attachment.size : null,
      mimeType: text(attachment.mimeType),
      storageKey: text(attachment.storageKey),
    };
  });
  const deliveries = Array.isArray(project.deliveries) ? project.deliveries : [];
  const contactName = text(project.contact) || text(project.client);
  const scope = text(project.scope);
  return {
    projectName: text(project.projectName),
    projectNo: intake.projectNo,
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
    contacts: contactName || project.phone || project.email ? [{
      id: 'contact-1',
      name: contactName,
      role: '',
      department: text(project.contactDepartment),
      telephone: text(project.phone),
      mobile: '',
      email: text(project.email),
    }] : [],
    materials,
    expectedStartDate: text(project.expectedStartDate),
    firstDelivery: text(project.firstDelivery) || text(deliveries[0]),
    secondDelivery: text(project.secondDelivery) || text(deliveries[1]),
    thirdDelivery: text(project.thirdDelivery) || text(deliveries[2]),
    finalDelivery: text(project.finalDelivery) || text(deliveries[3]),
    workContent: scope,
    notes: text(project.memo),
    request: text(project.rawMemo),
    secretReferences: [],
    source: {
      estimateRequestId: text(source.estimateRequestId) || intake.estimateRequestId,
      requestNo: text(source.requestNo) || intake.projectNo,
      estimateId: nullable(source.estimateId),
      estimateSheetId: nullable(source.estimateSheetId),
      estimateSubmissionId: nullable(source.estimateSubmissionId),
      estimateDocumentHash: nullable(source.estimateDocumentHash),
      commercialDecisionId: intake.commercialDecisionId,
      projectId: intake.projectId,
    },
    commercial: {
      agreedAmount: nullable(decision.agreedAmount),
      agreedScope: nullable(decision.agreedScope),
      agreedSchedule: nullable(decision.agreedSchedule),
      startCondition: nullable(decision.startCondition),
    },
  };
};

export const evaluateProjectIntakeCompleteness = (draft: ProjectIntakeDraft) => {
  const missing: string[] = [];
  if (!draft.projectName.trim()) missing.push('projectName');
  if (!draft.projectNo.trim()) missing.push('projectNo');
  if (!draft.company.trim() && !draft.client.trim()) missing.push('client');
  if (!draft.workContent.trim() && draft.scopes.length === 0) missing.push('workContent');
  if (!draft.expectedStartDate.trim()) missing.push('expectedStartDate');
  if (!draft.firstDelivery.trim() && !draft.finalDelivery.trim()) missing.push('deliveryDate');
  if (!draft.contacts.some((contact) => contact.name.trim() && (contact.telephone || contact.mobile || contact.email))) {
    missing.push('contact');
  }
  if (draft.materials.length === 0) missing.push('materials');
  return missing;
};

export const validateSecretReferences = (references: ProjectIntakeSecretReference[]) => {
  const invalid = references.find((item) => !isSafeSecretReference(item.reference));
  if (invalid) throw new Error('Secret references must use vault://, secret://, credential://, or ref://');
};
