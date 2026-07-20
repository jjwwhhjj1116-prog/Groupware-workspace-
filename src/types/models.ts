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
  | 'OTHER';

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
