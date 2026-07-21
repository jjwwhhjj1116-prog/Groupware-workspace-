export type Role = 'SUPER_ADMIN' | 'DEPARTMENT_MANAGER' | 'PM' | 'WORKER' | 'EVALUATION_ADMIN' | 'SYSTEM_ADMIN';

export type CompanyId = 'CON_COST' | 'VIET_QS';
export type DepartmentKey = 'FINISH' | 'STRUCTURE' | 'CIVIL' | 'DEVELOP';
export type OrganizationRank = 'CEO' | 'COO' | 'VICE_PRESIDENT' | 'MANAGER' | 'PM' | 'TEAM_LEADER' | 'DEPUTY_TEAM_LEADER' | 'STAFF' | 'TRAINEE';
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'RESIGNED';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
}

export interface Company {
  id: CompanyId;
  name: string;
  country: 'KR' | 'VN';
  parentCompanyId?: string;
}

export interface Department {
  id: string;
  companyId: CompanyId;
  key: DepartmentKey;
  name: string;
}

export interface SubDepartment {
  id: string;
  companyId: CompanyId;
  departmentKey: DepartmentKey;
  name: string;
}

export type DepartmentId = string;
export type UserId = string;

export interface PersonnelCard {
  id: UserId;
  employeeNumber?: string;
  name: string;
  displayName?: string;
  koreanAlias?: string;
  vietnameseName?: string;
  email?: string;
  phone?: string;
  companyId?: CompanyId;
  companyName?: string;
  departmentId: string;
  departmentName?: string;
  subDepartmentId?: string;
  subDepartmentName?: string;
  teamId?: string;
  teamName?: string;
  role: Role; // keep for backward compatibility temporarily
  systemRole?: Role;
  permissionLevel?: number;
  organizationRank?: OrganizationRank;
  jobTitle?: string;
  position?: string;
  managerId?: string;
  pmId?: string;
  deputyApproverId?: string;
  employmentStatus: string;
  canDoDirectProduction?: boolean;
  defaultWorkHoursPerDay?: number;
  availableWorkHoursPerDay?: number; // fallback for older code
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ProjectStatus = 'INTAKE_RECEIVED' | 'MANAGER_REVIEW' | 'PM_ASSIGNED' | 'SCHEDULE_DRAFTING' | 'SCHEDULE_PENDING_APPROVAL' | 'SCHEDULE_REJECTED' | 'SCHEDULE_APPROVED' | 'IN_PROGRESS' | 'QA_REVIEW' | 'COMPLETED' | 'ON_HOLD' | 'ARCHIVED' | 'REVISION_REQUESTED';

export type ProjectSourceType = 'CLIENT_ORDER' | 'INTERNAL_DEVELOPMENT';

export type DataSourceMode = 'JSON_OPERATION_DATA' | 'EXCEL_IMPORT_DATA' | 'DEMO_SEED_DATA' | 'EMPTY';

export type EstimateRequestStatus =
  | 'REQUEST_MEMO'
  | 'ESTIMATE_DRAFTING'
  | 'WAITING'
  | 'WON'
  | 'LOST'
  | 'CANCELLED'
  | 'ON_HOLD'
  | 'OTHER';

export type CommercialDecisionType = 'WON' | 'LOST' | 'CANCELLED' | 'ON_HOLD';

export interface CommercialDecision {
  id: string;
  estimateRequestId: string;
  estimateSheetId?: string | null;
  estimateSubmissionId?: string | null;
  projectId?: string | null;
  idempotencyKey: string;
  decision: CommercialDecisionType;
  reason?: string | null;
  agreedAmount?: string | null;
  agreedScope?: string | null;
  agreedSchedule?: string | null;
  startCondition?: string | null;
  decidedAt: string;
  decidedBy: UserId;
  createdAt: string;
}

export type ProjectIntakeStatus = 'DRAFT' | 'REVIEWED' | 'ACCEPTED';
export type ProjectIntakeMaterialStatus = 'NOT_RECEIVED' | 'PARTIAL' | 'RECEIVED' | 'CONFIRMED';

export interface ProjectIntakeContact {
  id: string;
  name: string;
  role: string;
  department: string;
  telephone: string;
  mobile: string;
  email: string;
}

export interface ProjectIntakeMaterial {
  id: string;
  category: string;
  label: string;
  memo: string;
  status: ProjectIntakeMaterialStatus;
  comment: string;
  confirmedBy: string;
  originalName: string;
  size: number | null;
  mimeType: string;
  storageKey: string;
}

export interface ProjectIntakeSecretReference {
  id: string;
  label: string;
  provider: string;
  reference: string;
  note: string;
}

export interface ProjectIntakeDraft {
  projectName: string;
  projectNo: string;
  company: string;
  client: string;
  usage: string;
  area: string;
  buildings: string;
  floors: string;
  basementFloors: string;
  groundFloors: string;
  bidDate: string;
  unitPrice: string;
  businessTypes: string[];
  scopes: string[];
  contacts: ProjectIntakeContact[];
  materials: ProjectIntakeMaterial[];
  expectedStartDate: string;
  firstDelivery: string;
  secondDelivery: string;
  thirdDelivery: string;
  finalDelivery: string;
  workContent: string;
  notes: string;
  request: string;
  secretReferences: ProjectIntakeSecretReference[];
  source: {
    estimateRequestId: string;
    requestNo: string;
    estimateId: string | null;
    estimateSheetId: string | null;
    estimateSubmissionId: string | null;
    estimateDocumentHash: string | null;
    commercialDecisionId: string;
    projectId: string;
  };
  commercial: {
    agreedAmount: string | null;
    agreedScope: string | null;
    agreedSchedule: string | null;
    startCondition: string | null;
  };
}

export interface ProjectIntakeHistory {
  id: string;
  projectIntakeId: string;
  action: string;
  fromStatus?: ProjectIntakeStatus | null;
  toStatus?: ProjectIntakeStatus | null;
  changesJson?: string | null;
  actorId: UserId;
  createdAt: string;
}

export interface ProjectIntake {
  id: string;
  estimateRequestId: string;
  commercialDecisionId: string;
  projectId: string;
  status: ProjectIntakeStatus;
  projectNo: string;
  sourceSnapshotJson: string;
  draftJson?: string | null;
  draft?: ProjectIntakeDraft;
  reviewNote?: string | null;
  reviewedBy?: UserId | null;
  reviewedAt?: string | null;
  acceptedBy?: UserId | null;
  acceptedAt?: string | null;
  version: number;
  createdBy: UserId;
  updatedBy: UserId;
  createdAt: string;
  updatedAt: string;
  histories?: ProjectIntakeHistory[];
  commercialDecision?: CommercialDecision;
  project?: CommercialDecisionProject;
  estimateRequest?: EstimateRequest;
  completeness?: { missing: string[] };
  permissions?: { canEdit: boolean; canReview: boolean };
}

export interface CommercialDecisionInput {
  decision: CommercialDecisionType;
  reason?: string | null;
  agreedAmount?: string | null;
  agreedScope?: string | null;
  agreedSchedule?: string | null;
  startCondition?: string | null;
}

export interface CommercialDecisionProject {
  id: string;
  companyId: string;
  name: string;
  status: string;
  managerId: string;
  pmId: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type EstimateRequestActivityKind = 'CONSULTATION' | 'CALL' | 'EMAIL' | 'NOTE';

export interface EstimateRequestActivity {
  id: string;
  estimateRequestId: string;
  kind: EstimateRequestActivityKind;
  content: string;
  occurredAt: string;
  createdBy: UserId;
  createdAt: string;
}

export interface EstimateRequestAttachment {
  id: string;
  estimateRequestId: string;
  category: string;
  label: string;
  originalName: string;
  size: number;
  mimeType?: string | null;
  memo?: string | null;
  storageKey?: string | null;
  status: 'REGISTERED';
  createdBy: UserId;
  createdAt: string;
}

export interface EstimateRequestHistory {
  id: string;
  estimateRequestId: string;
  action: string;
  fromStatus?: EstimateRequestStatus | null;
  toStatus?: EstimateRequestStatus | null;
  changes?: string | null;
  actorId: UserId;
  createdAt: string;
}

export interface EstimateRequest {
  id: string;
  requestNo: string;
  status: EstimateRequestStatus;
  projectName: string;
  company?: string | null;
  client?: string | null;
  contact?: string | null;
  contactDepartment?: string | null;
  phone?: string | null;
  email?: string | null;
  ownerId?: UserId | null;
  departmentId: DepartmentId;
  requestDate: string;
  memo?: string | null;
  rawMemo?: string | null;
  firstDelivery?: string | null;
  secondDelivery?: string | null;
  thirdDelivery?: string | null;
  finalDelivery?: string | null;
  expectedStartDate?: string | null;
  areaPy?: string | null;
  floors?: string | null;
  scope?: string | null;
  usage?: string | null;
  buildingCount?: string | null;
  unitWork?: string | null;
  bidDate?: string | null;
  estimateType?: string | null;
  estimateId?: string | null;
  projectId?: string | null;
  version: number;
  createdBy: UserId;
  updatedBy: UserId;
  createdAt: string;
  updatedAt: string;
  activities: EstimateRequestActivity[];
  attachments: EstimateRequestAttachment[];
  histories: EstimateRequestHistory[];
  commercialDecisions?: CommercialDecision[];
  projectIntake?: ProjectIntake | null;
}

export interface CommercialDecisionResult {
  request: EstimateRequest;
  decision: CommercialDecision;
  intake: ProjectIntake | null;
  project: CommercialDecisionProject | null;
  idempotent: boolean;
}

export type EstimateTemplateType = '개산견적' | '공내역서' | '설계예가' | '공사비검증';
export type EstimateSheetStatus = 'DRAFT' | 'SUBMITTED' | 'SENT';
export type EstimateSubmissionStatus = 'SUBMITTED' | 'SENT';

export interface EstimateSheetCellState {
  value?: string | number | null;
  formula?: string;
  userFormula?: boolean;
}

export interface EstimateSheetState {
  type: EstimateTemplateType;
  cells: Record<string, EstimateSheetCellState>;
  maxRow: number;
  maxCol: number;
  rowHeights: number[];
  colWidths: number[];
  merges: [number, number, number, number][];
}

export interface EstimateTemplateRecord {
  id: string;
  type: EstimateTemplateType;
  sheetName: string;
  version: number;
  sourceHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateSheetVersion {
  id: string;
  estimateSheetId: string;
  version: number;
  templateVersion: number;
  templateHash: string;
  state: EstimateSheetState;
  createdBy: string;
  createdAt: string;
}

export interface EstimateSheetExport {
  id: string;
  estimateSheetId: string;
  version: number;
  format: 'XLSX' | 'PDF';
  fileName: string;
  actorId: string;
  createdAt: string;
}

export interface EstimateSubmissionSummary {
  requestNo: string;
  projectName: string;
  company: string;
  serviceDescription: string;
  total: string;
  templateType: EstimateTemplateType;
  version: number;
}

export interface EstimateSubmission {
  id: string;
  estimateSheetId: string;
  version: number;
  status: EstimateSubmissionStatus;
  submittedAt: string;
  submittedBy: string;
  sentAt?: string | null;
  sentBy?: string | null;
  recipient?: string | null;
  deliveryChannel?: string | null;
  documentHash: string;
  summary: EstimateSubmissionSummary;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateSubmissionListItem extends EstimateSubmission {
  estimateRequestId: string;
  requestNo: string;
  projectName: string;
  company?: string | null;
  ownerId?: string | null;
  departmentId: string;
  requestStatus: EstimateRequestStatus;
  templateType: EstimateTemplateType;
  decisionReady: boolean;
}

export interface EstimateSheet {
  id: string;
  estimateRequestId: string;
  templateId: string;
  templateType: EstimateTemplateType;
  status: EstimateSheetStatus;
  currentVersion: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  template: EstimateTemplateRecord;
  versions: EstimateSheetVersion[];
  exports: EstimateSheetExport[];
  submissions: EstimateSubmission[];
}

export type EstimateDbSection = 'PJ' | 'PROGRESS' | 'MEP_CONTRACT';
export type EstimateDbTargetType = 'ORDER' | 'SALES' | 'DEPOSIT';
export type EstimateDbValue = string | number | boolean | null;
export type EstimateDbPayload = Record<string, EstimateDbValue>;

export interface EstimateDbRecord {
  id: string;
  section: EstimateDbSection;
  projectId?: string | null;
  sourceRecordId?: string | null;
  pjNo?: string | null;
  year?: number | null;
  sortOrder: number;
  schemaVersion: number;
  data: EstimateDbPayload;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateDbVendor {
  id: string;
  normalizedName: string;
  normalizedTrade: string;
  data: EstimateDbPayload;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateDbMonthlyTarget {
  id: string;
  type: EstimateDbTargetType;
  year: number;
  month: number;
  amount: string;
  version: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateDbAnnualPoint {
  month: number;
  amount: string;
}

export interface EstimateDbAnnualReport {
  year: number;
  order: EstimateDbAnnualPoint[];
  sales: EstimateDbAnnualPoint[];
  deposit: EstimateDbAnnualPoint[];
  targets: Array<Pick<EstimateDbMonthlyTarget, 'type' | 'month' | 'amount' | 'version'>>;
}

export type DeliveryLifecycle =
  | "UNSCHEDULED"
  | "UPCOMING"
  | "DUE_WITHIN_1_MONTH"
  | "DUE_WITHIN_2_WEEKS"
  | "DUE_WITHIN_1_WEEK"
  | "DUE_TODAY"
  | "OVERDUE"
  | "DELIVERY_CLOSED_AUTO"
  | "DELIVERY_CLOSED_MANUAL"
  | "POST_DELIVERY_WORK_REQUESTED"
  | "POST_DELIVERY_WORK_IN_PROGRESS"
  | "REOPENED";

export type ProjectPmScheduleStatus =
  | 'PENDING_ASSIGNMENT'
  | 'PM_ASSIGNED'
  | 'DRAFT_REQUESTED'
  | 'DRAFTING'
  | 'SUBMITTED'
  | 'REJECTED'
  | 'APPROVED';

export interface PmAssignment {
  primaryPmId: UserId | '';
  finishPmId: UserId | '';
  structurePmId: UserId | '';
  bimPmId: UserId | '';
  civilPmId: UserId | '';
}

export interface PmRequestTargets {
  pmIds: UserId[];
  teamLeaderIds: UserId[];
}

export interface PmScheduleRow {
  id: string;
  assigneeId: UserId;
  departmentId: DepartmentId | '';
  category: 'STRUCTURE' | 'FINISH' | 'BIM' | 'CIVIL' | 'OTHER';
  scope: string;
  people: number;
  workDays: number;
  totalDays: number;
  startDate: string;
  endDate: string;
}

export interface PmSchedulePlan {
  id: 'plan1' | 'plan2';
  title: string;
  rows: PmScheduleRow[];
}

export interface ProjectPmScheduleHistory {
  id: string;
  projectPmScheduleId: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  detailsJson: string;
  actorId: UserId;
  createdAt: string;
}

export interface ProjectPmSchedule {
  id: string;
  projectId: string;
  status: ProjectPmScheduleStatus;
  assignment: PmAssignment;
  requestTargets: PmRequestTargets;
  requestMemo: string;
  plan1: PmSchedulePlan;
  plan2: PmSchedulePlan;
  selectedProposal?: 'plan1' | 'plan2' | null;
  approvedPlan?: 'plan1' | 'plan2' | null;
  rejectReason?: string | null;
  requestedBy?: UserId | null;
  requestedAt?: string | null;
  submittedBy?: UserId | null;
  submittedAt?: string | null;
  approvedBy?: UserId | null;
  approvedAt?: string | null;
  version: number;
  createdBy: UserId;
  updatedBy: UserId;
  createdAt: string;
  updatedAt: string;
  completeness: { missing: string[] };
  permissions: { canView: boolean; canAssign: boolean; canEdit: boolean; canReview: boolean };
  histories: ProjectPmScheduleHistory[];
  project: {
    id: string;
    name: string;
    status: string;
    departmentId: DepartmentId;
    managerId: UserId;
    pmId: UserId;
  };
}

export interface PmScheduleConflict {
  assigneeId: UserId;
  projectId: string;
  projectName: string;
  candidateRowId: string;
  conflictingRowId: string;
  startDate: string;
  endDate: string;
}

export type ProjectOperationActivityKind = 'MEETING' | 'CALL' | 'EMAIL' | 'AWARD' | 'START_APPROVAL' | 'COMPLETION_CHANGED' | 'COMPLETED' | 'NOTE';
export type ProjectStartApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ProjectOperationActivity {
  id: string;
  projectOperationId: string;
  kind: ProjectOperationActivityKind;
  occurredAt: string;
  title: string;
  body: string;
  metadata: Record<string, string | number | boolean | null>;
  createdBy: UserId;
  createdAt: string;
}

export interface ProjectOperation {
  id: string;
  projectId: string;
  awardDate?: string | null;
  expectedCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  startApprovalStatus: ProjectStartApprovalStatus;
  startApprovedBy?: UserId | null;
  startApprovedAt?: string | null;
  version: number;
  createdBy: UserId;
  updatedBy: UserId;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    status: string;
    departmentId: DepartmentId;
    managerId: UserId;
    pmId: UserId;
    manager?: PersonnelCard;
    pm?: PersonnelCard;
  };
  activities: ProjectOperationActivity[];
  assignments: { assignment: Partial<PmAssignment>; rows: PmScheduleRow[] };
  sourceTrace: {
    canonicalProjectId: string;
    projectIntakeId?: string | null;
    estimateRequestId?: string | null;
    requestNo?: string | null;
    commercialDecisionId?: string | null;
  };
  permissions: { canView: boolean; canEdit: boolean; canApprove: boolean };
}

export type ProjectQcItemStatus = 'PENDING' | 'PARTIAL' | 'CONFIRMED' | 'SENT';

export interface ProjectQcCheck {
  target: string;
  done: boolean;
  na: boolean;
  checkedBy: string;
  checkedAt: string;
}

export interface ProjectQcAttachment {
  id: string;
  projectQcItemId: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey?: string | null;
  checksum?: string | null;
  createdBy: UserId;
  createdAt: string;
}

export interface ProjectQcHistory {
  id: string;
  projectQcChecklistId: string;
  projectQcItemId?: string | null;
  action: string;
  details: Record<string, unknown>;
  actorId: UserId;
  createdAt: string;
}

export interface ProjectQcItem {
  id: string;
  projectQcChecklistId: string;
  group: string;
  middleCategory?: string | null;
  subCategory?: string | null;
  trade: string;
  serialNo: string;
  item: string;
  method: string;
  targets: string[];
  checks: ProjectQcCheck[];
  status: ProjectQcItemStatus;
  comment: string;
  objection: Record<string, unknown>;
  eliminated: boolean;
  sentAt?: string | null;
  sentBy?: UserId | null;
  createdBy: UserId;
  updatedBy: UserId;
  createdAt: string;
  updatedAt: string;
  attachments: ProjectQcAttachment[];
  histories: ProjectQcHistory[];
}

export interface ProjectQcChecklist {
  id: string;
  projectId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  version: number;
  createdBy: UserId;
  updatedBy: UserId;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; status: string; departmentId: DepartmentId; managerId: UserId; pmId: UserId };
  items: ProjectQcItem[];
  histories: ProjectQcHistory[];
  permissions: { canView: boolean; canEdit: boolean; canSend: boolean };
}

export interface ProjectQcTerm {
  id: string;
  term: string;
  definition: string;
  createdBy: UserId;
  updatedBy: UserId;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  projectSourceType?: ProjectSourceType; // Default to CLIENT_ORDER if undefined
  clientId?: string;
  clientName?: string;
  title: string;
  description?: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: ProjectStatus;
  departmentId: DepartmentId;
  managerId?: UserId;
  pmId?: UserId;
  startDate?: string;
  dueDate?: string;
  approvedStartDate?: string;
  approvedDueDate?: string;
  progress?: number;
  archiveStatus?: 'ACTIVE' | 'ARCHIVED' | 'RESTORED';
  isDeleted?: boolean;
  source?: string;
  deliveryDate?: string;
  targetDate?: string; // For INTERNAL_DEVELOPMENT
  deliveryDateStatus?: "UNSET" | "SCHEDULED" | "CHANGED" | "OVERDUE" | "DELIVERED";
  deliveryDateUpdatedAt?: string;
  deliveryDateUpdatedBy?: string;
  deliveryDateChangeReason?: string;
  deliveryLifecycle?: DeliveryLifecycle;
  deliveryClosedAt?: string;
  deliveryClosedBy?: string;
  deliveryCloseReason?: string;
  createdAt?: string;
  updatedAt?: string;
  projectNameI18n?: MultiLangText;
  clientRequestI18n?: MultiLangText;
  internalMemoI18n?: MultiLangText;
}

export interface ProjectWorkPart {
  id: string;
  projectId: string;
  departmentId?: string;
  teamName?: string;
  groupName?: string;
  partName: string;
  scopeNames: string[];
  source: "EXCEL_TEAM" | "EXCEL_SCOPE" | "MANUAL" | "SYSTEM";
  orderIndex: number;
  managerId?: string;
  pmId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'TODO' | 'READY' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'HOLD' | 'REJECTED';
export type CompletionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'WORKER_DONE' | 'PM_REVIEWING' | 'PM_APPROVED' | 'MANAGER_REVIEWING' | 'MANAGER_APPROVED' | 'COMPLETED' | 'REOPENED' | 'REJECTED';

export interface TaskCard {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  scopeName?: string;
  status: TaskStatus;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  assigneeId?: UserId;
  pmId?: UserId;
  managerId?: UserId;
  departmentId: DepartmentId;
  startDate?: string;
  dueDate?: string;
  progress?: number;
  orderIndex: number;
  parentTaskId?: string;
  isAdditionalTask?: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvalRequestId?: string;
  estimatedHours?: number;
  completionStatus?: CompletionStatus;
  isDeleted?: boolean;
  sourceType?: string;
  sourceSheet?: string;
  sourceMonth?: number;
  sourceAssignmentIds?: string[];
  createdBy?: UserId;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  titleI18n?: MultiLangText;
  descriptionI18n?: MultiLangText;
  isOutsourced?: boolean;
  billingAmount?: number;
  billingStatus?: 'PENDING' | 'INVOICED' | 'PAID';
  workScopeI18n?: MultiLangText;
  memoI18n?: MultiLangText;
  translationReviewStatus?: TranslationStatus;
}

export interface TaskWorkSegment {
  id: string;
  taskId: string;
  workerId: UserId;
  startDate: string;
  endDate: string;
  progress: number;
  description: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RECORDED';
  isOvertime: boolean;
  approvalRequestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressUpdate {
  id: string;
  taskId: string;
  authorId: UserId;
  progressBefore: number;
  progressAfter: number;
  workSummary: string;
  workSummaryI18n?: MultiLangText;
  blocker?: string;
  createdAt: string;
}

export interface TaskChecklistItem {
  id: string;
  taskId: string;
  content: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: UserId;
}

export interface TaskArtifact {
  id: string;
  taskId: string;
  title: string;
  url: string;
  type: 'LINK' | 'FILE' | 'GITHUB' | 'FIGMA' | 'DOCUMENT';
  addedBy: UserId;
  createdAt: string;
}

export interface TaskBlocker {
  id: string;
  taskId: string;
  reporterId: UserId;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: UserId;
}

export interface ProcessTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessStage {
  id: string;
  templateId: string;
  name: string;
  orderIndex: number;
}

export interface ProcessTask {
  id: string;
  stageId: string;
  name: string;
  defaultAssigneeRole?: string;
  orderIndex: number;
}

export interface ProcessScheduleSnapshot {
  id: string;
  processStageId: string;
  processTaskId: string;
  startDate?: string;
  endDate?: string;
  executionDate?: string;
  status: string;
  progress: number;
  category: string;
  assigneeId?: UserId;
  isOfficial: boolean;
  estimatedHours?: number;
  description?: string;
}

export interface AssignmentRevisionSnapshot {
  revisionNo: number;
  rejectionReason?: string;
  reviewedBy?: UserId;
  reviewedAt?: string;
  schedules: ProcessScheduleSnapshot[];
  snapshottedAt: string;
}

export interface ProcessTemplateAssignment {
  id: string;
  taskId: string;
  templateId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  pmId: UserId;
  managerId?: UserId;
  rejectionReason?: string;
  reviewedBy?: UserId;
  reviewedAt?: string;
  revisionNo?: number;
  previousAssignmentId?: string;
  parentAssignmentId?: string;
  approvalRequestId?: string;
  historySnapshot?: AssignmentRevisionSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcessSchedule {
  id: string;
  assignmentId: string;
  processStageId: string;
  processTaskId: string;
  startDate?: string;
  endDate?: string;
  executionDate?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  progress: number;
  category: string;
  assigneeId?: UserId;
  isOfficial: boolean;
  estimatedHours?: number;
  description?: string;
}

export type ApprovalRequestType = 'SCHEDULE_APPROVAL' | 'SCHEDULE_REJECTION' | 'ADDITIONAL_TASK' | 'OVERTIME_REQUEST' | 'DEADLINE_EXTENSION' | 'TASK_REORDER' | 'PM_ASSIGNMENT' | 'MANPOWER_SUPPORT' | 'PRIORITY_CHANGE' | 'SCHEDULE_REPLAN' | 'PROCESS_SCHEDULE_APPROVAL';

export interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  projectId?: string;
  taskId?: string;
  requestedBy: UserId;
  pmId?: UserId;
  managerId?: UserId;
  status: 'PENDING' | 'PM_REVIEWING' | 'PM_APPROVED' | 'MANAGER_REVIEWING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  title: string;
  reason: string;
  requestedStartDate?: string;
  requestedDueDate?: string;
  reviewedBy?: UserId;
  reviewComment?: string;
  alternativeType?: ApprovalRequestType;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostDeliveryWorkRequest {
  id: string;
  projectId: string;
  taskId?: string;
  requestedBy: string;
  title: string;
  description: string;
  reason: string;
  requestedStartDate?: string;
  requestedEndDate?: string;
  estimatedHours?: number;
  impactDeliveryDate?: boolean;
  newSuggestedDeliveryDate?: string;
  status: "DRAFT" | "PENDING_PM" | "PENDING_MANAGER" | "PENDING_SUPER_ADMIN" | "APPROVED" | "REJECTED" | "APPLIED" | "CANCELLED";
  approvalRequestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionRequest {
  id: string;
  projectId: string;
  title: string;
  description: string;
  requestedByClient: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalWorkflowStep {
  stepIndex: number;
  role: Role;
  required: boolean;
}

export interface ApprovalWorkflowTemplate {
  id: string;
  requestType: ApprovalRequestType;
  steps: ApprovalWorkflowStep[];
  isActive: boolean;
}

export type ScheduleType = 'PERSONAL_WORK' | 'MEETING' | 'REVIEW' | 'CLIENT_MEETING' | 'INTERNAL_REPORT' | 'PM_PLANNING' | 'MANAGER_REVIEW' | 'DEPARTMENT_MANAGEMENT' | 'ETC' | 'OFF';

export interface PersonalSchedule {
  id: string;
  userId: UserId;
  ownerRole: Role;
  departmentId: DepartmentId;
  title: string;
  description?: string;
  scheduleType: ScheduleType;
  startDateTime: string;
  endDateTime: string;
  isAllDay: boolean;
  visibility: 'PRIVATE' | 'DEPARTMENT' | 'PROJECT_MEMBERS' | 'MANAGER_ONLY' | 'SUPER_ADMIN_ONLY';
  status: 'SCHEDULED' | 'CHANGED' | 'CANCELLED' | 'COMPLETED';
  createdBy?: UserId;
  updatedBy?: UserId;
  changeNotifyTargetIds?: UserId[];
  requiresApproval?: boolean;
  approvalStatus?: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  relatedProjectId?: string;
  relatedTaskId?: string;
  sourceSheet?: string;
  sourceMonth?: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ConflictResolutionStatus = 'PENDING' | 'RESOLVED_DELAYED' | 'RESOLVED_REASSIGNED' | 'RESOLVED_OVERLAP_ALLOWED' | 'RESOLVED_OVERTIME_APPROVED' | 'RESOLVED_ESCALATED';

export interface ScheduleConflict {
  id: string;
  userId: UserId;
  startDate: string;
  endDate: string;
  conflictType: 'LEAVE_OVERLAP' | 'PROJECT_OVERLAP' | 'WORK_OVERLOAD';
  relatedTaskIds: string[];
  relatedScheduleIds: string[];
  description: string;
  status: ConflictResolutionStatus;
  resolvedBy?: UserId;
  resolutionComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: UserId;
  type: string;
  title: string;
  message: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  relatedProjectId?: string;
  relatedTaskId?: string;
  relatedApprovalId?: string;
  groupId?: string;
  count?: number;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: UserId;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue?: string;
  afterValue?: string;
  message: string;
  createdAt: string;
}

export interface DeliveryDateChange {
  id: string;
  projectId: string;
  beforeDeliveryDate?: string;
  afterDeliveryDate: string;
  changedBy: string;
  reason: string;
  createdAt: string;
}

export interface ImportPreviewSession {
  id: string;
  fileName: string;
  filePath?: string;
  targetSheet: string;
  targetMonths: number[];
  status: 'DETECTED' | 'ANALYZED' | 'VALIDATED' | 'READY_TO_APPLY' | 'APPLIED' | 'FAILED' | 'CANCELLED';
  totalRows: number;
  totalAssignments: number;
  totalProjects: number;
  totalPersonnel: number;
  totalWarnings: number;
  totalErrors: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportValidationIssue {
  id: string;
  importSessionId: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'BLOCKER';
  issueType: string;
  title: string;
  description: string;
  sourceSheet?: string;
  sourceMonth?: number;
  sourceRow?: number;
  sourceColumn?: number;
  suggestedFix?: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  resolvedBy?: string;
  resolvedAt?: string;
}


export interface DataQualityCheck {
  id: string;
  category: 'IMPORT' | 'PROJECT' | 'SCHEDULE' | 'PERSONNEL' | 'PERMISSION' | 'BOARD' | 'EVALUATION' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'BLOCKER';
  title: string;
  description: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  detectedAt: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  suggestedFix?: string;
}


export interface PermissionSimulationResult {
  id: string;
  simulatedUserId: string;
  simulatedBy: string;
  targetScreen: string;
  targetProjectId?: string;
  targetMonth?: string;
  visibleProjects: string[];
  hiddenProjects: string[];
  visibleEmployees: string[];
  hiddenEmployees: string[];
  visibleSchedules: string[];
  hiddenSchedules: string[];
  warnings: string[];
  createdAt: string;
}


export interface WorkspaceSetting {
  id: string;
  category: string;
  key: string;
  value: string | number | boolean | Record<string, string>;
  description?: string;
  editableByRoles: string[];
  updatedBy: string;
  updatedAt: string;
}


export interface BulkEditSession {
  id: string;
  targetEntityType: string;
  totalItems: number;
  changedItems: number;
  status: 'DRAFT' | 'PREVIEW' | 'APPLIED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  appliedAt?: string;
}

export type LanguageCode = 'ko' | 'vi' | 'en';

export type WorkspaceLanguage = 'ko' | 'vi';

export type TranslationStatus =
  | 'NONE'
  | 'NEEDS_TRANSLATION'
  | 'AUTO_TRANSLATED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'HUMAN_APPROVED'
  | 'TRANSLATION_FAILED'
  | 'SKIPPED_BY_USER'
  | 'PROVIDER_LIMIT_EXCEEDED';

export type TranslationProvider =
  | 'DISABLED'
  | 'MANUAL_ONLY'
  | 'MYMEMORY_PUBLIC_NO_KEY'
  | 'LIBRETRANSLATE_PUBLIC_NO_KEY'
  | 'LIBRETRANSLATE_SELF_HOSTED'
  | 'LOCAL_PROXY'
  | 'GOOGLE_CLOUD_TRANSLATION';

export type MultiLangText = {
  originalLanguage: LanguageCode;
  originalText: string;
  translations: Partial<Record<LanguageCode, {
    text: string;
    status: TranslationStatus;
    provider?: TranslationProvider;
    translatedAt?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    sourceHash?: string;
    errorMessage?: string;
  }>>;
};

export type TranslationProviderHealth = {
  provider: TranslationProvider;
  endpoint?: string;
  requiresApiKey: boolean;
  corsOk: boolean;
  koToViOk: boolean;
  viToKoOk: boolean;
  quotaWarning?: string;
  lastCheckedAt: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'LIMITED' | 'UNKNOWN';
};

export type TranslationCacheItem = {
  sourceHash: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  sourceText: string;
  translatedText: string;
  provider: TranslationProvider;
  status: TranslationStatus;
  createdAt: string;
  expiresAt?: string;
};
