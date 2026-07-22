import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import {
  canApproveDailyReport,
  canApproveDownload,
  canManageProjectDelivery,
  canWriteDailyReport,
  dailyApprovalRequirements,
  dailyApprovalSchema,
  dailyReportSchema,
  deliveryFileSchema,
  deliveryRecordSchema,
  deliveryRoundSchema,
  downloadRequestSchema,
  downloadReviewSchema,
  workspaceStatus,
} from '../domain/projectDelivery';
import { ProjectOperationScope } from '../domain/projectOperation';
import { deliveryScope } from '../middlewares/projectDeliveryGuards';

const include = {
  project: { include: { manager: true, pm: true, pmSchedule: true } },
  rounds: { include: { files: { orderBy: [{ logicalFileKey: 'asc' as const }, { version: 'desc' as const }] } }, orderBy: { roundNo: 'desc' as const } },
  records: { orderBy: { occurredAt: 'desc' as const } },
  downloadRequests: { orderBy: { requestedAt: 'desc' as const } },
  dailyReports: { orderBy: [{ reportDate: 'desc' as const }, { createdAt: 'desc' as const }] },
  histories: { orderBy: { createdAt: 'desc' as const }, take: 100 },
} satisfies Prisma.ProjectDeliveryWorkspaceInclude;
type Workspace = Prisma.ProjectDeliveryWorkspaceGetPayload<{ include: typeof include }>;
type HttpError = Error & { status?: number; details?: unknown };

const httpError = (message: string, status: number, details?: unknown): HttpError => Object.assign(new Error(message), { status, details });
const parse = (value: string | null): Record<string, unknown> => { try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; } };
const load = (projectId: string) => prisma.projectDeliveryWorkspace.findUniqueOrThrow({ where: { projectId }, include });
const handleError = (res: Response, error: unknown, label: string) => {
  const typed = error as HttpError;
  if (typed.status) return res.status(typed.status).json({ error: typed.message, details: typed.details });
  console.error(`${label} error:`, error);
  return res.status(500).json({ error: 'Internal Server Error' });
};
const assignments = (workspace: Workspace) => {
  const schedule = workspace.project.pmSchedule;
  if (!schedule) return { rows: [] };
  const selected = schedule.approvedPlan === 'plan2' ? schedule.plan2Json : schedule.plan1Json;
  const value = parse(selected);
  return { rows: Array.isArray(value.rows) ? value.rows : [] };
};
type AuthenticatedActor = NonNullable<Request['user']>;
const serialize = async (workspace: Workspace, actor: AuthenticatedActor) => {
  const scope = await deliveryScope(workspace.projectId);
  if (!scope) throw httpError('Project delivery workspace not found', 404);
  return {
    ...workspace,
    project: { id: workspace.project.id, name: workspace.project.name, status: workspace.project.status, departmentId: workspace.project.manager.departmentId, managerId: workspace.project.managerId, pmId: workspace.project.pmId },
    assignments: assignments(workspace),
    histories: workspace.histories.map((history) => ({ ...history, details: parse(history.detailsJson) })),
    permissions: {
      canView: true,
      canManageDelivery: canManageProjectDelivery(actor, scope),
      canWriteDaily: canWriteDailyReport(actor, scope),
      canApproveDownload: canApproveDownload(actor, scope),
      canApprovePm: canApproveDailyReport(actor, scope, 'PM'),
      canApproveManager: canApproveDailyReport(actor, scope, 'MANAGER'),
      canApproveExecutive: canApproveDailyReport(actor, scope, 'EXECUTIVE'),
    },
  };
};
const respond = async (projectId: string, actor: AuthenticatedActor, res: Response, status = 200) => res.status(status).json(await serialize(await load(projectId), actor));
const claimVersion = async (tx: Prisma.TransactionClient, projectId: string, expectedVersion: number, actorId: string) => {
  const claimed = await tx.projectDeliveryWorkspace.updateMany({ where: { projectId, version: expectedVersion }, data: { version: { increment: 1 }, updatedBy: actorId } });
  if (claimed.count !== 1) throw httpError('Project delivery workspace was changed by another user', 409);
};
const history = (tx: Prisma.TransactionClient, projectId: string, entityType: string, entityId: string | null, action: string, actorId: string, details: Record<string, unknown>) => tx.projectDeliveryHistory.create({ data: { projectDeliveryWorkspaceId: projectId, entityType, entityId, action, actorId, detailsJson: JSON.stringify(details) } });
const audit = (tx: Prisma.TransactionClient, action: string, projectId: string, actorId: string, details: Record<string, unknown>) => tx.auditLog.create({ data: { action, entityType: 'ProjectDeliveryWorkspace', entityId: projectId, actorId, details: JSON.stringify(details) } });
const refreshStatus = async (tx: Prisma.TransactionClient, projectId: string) => {
  const [roundCount, reports, pendingDownloads] = await Promise.all([
    tx.projectDeliveryRound.count({ where: { projectDeliveryWorkspaceId: projectId } }),
    tx.projectDailyReport.findMany({ where: { projectDeliveryWorkspaceId: projectId }, select: { progressRate: true, stage: true, pmStatus: true, managerStatus: true, executiveStatus: true }, orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }] }),
    tx.projectDownloadRequest.count({ where: { projectDeliveryWorkspaceId: projectId, status: 'PENDING' } }),
  ]);
  const progressRate = reports.reduce((max, report) => Math.max(max, report.progressRate), 0);
  const currentStage = reports[0]?.stage ?? null;
  const pendingReports = reports.filter((report) => [report.pmStatus, report.managerStatus, report.executiveStatus].includes('PENDING')).length;
  await tx.projectDeliveryWorkspace.update({ where: { id: projectId }, data: { progressRate, currentStage, status: workspaceStatus(roundCount, pendingDownloads + pendingReports, progressRate) } });
};
const scopeOrThrow = async (projectId: string): Promise<ProjectOperationScope> => {
  const scope = await deliveryScope(projectId);
  if (!scope) throw httpError('Project delivery workspace not found', 404);
  return scope;
};

export const getProjectDelivery = async (req: Request, res: Response) => {
  try { await respond(String(req.params.projectId), req.user!, res); }
  catch (error) { handleError(res, error, 'Get project delivery workspace'); }
};

export const createDeliveryRound = async (req: Request, res: Response) => {
  const parsed = deliveryRoundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid delivery round', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId); const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      if (parsed.data.parentRoundId) {
        const parent = await tx.projectDeliveryRound.findFirst({ where: { id: parsed.data.parentRoundId, projectDeliveryWorkspaceId: projectId } });
        if (!parent) throw httpError('Parent delivery round not found', 422);
      }
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const last = await tx.projectDeliveryRound.aggregate({ where: { projectDeliveryWorkspaceId: projectId }, _max: { roundNo: true } });
      const round = await tx.projectDeliveryRound.create({ data: { projectDeliveryWorkspaceId: projectId, roundNo: (last._max.roundNo || 0) + 1, kind: parsed.data.kind, parentRoundId: parsed.data.parentRoundId, label: parsed.data.label, deliveryDate: parsed.data.deliveryDate, memo: parsed.data.memo, createdBy: actor.personnelId } });
      await history(tx, projectId, 'DELIVERY_ROUND', round.id, parsed.data.kind === 'REDELIVERY' ? 'REDELIVERY_CREATED' : 'DELIVERY_CREATED', actor.personnelId, { roundNo: round.roundNo, parentRoundId: round.parentRoundId });
      await audit(tx, 'PROJECT_DELIVERY_ROUND_CREATED', projectId, actor.personnelId, { roundId: round.id, roundNo: round.roundNo, kind: round.kind });
      await refreshStatus(tx, projectId);
    });
    await respond(projectId, actor, res, 201);
  } catch (error) { handleError(res, error, 'Create delivery round'); }
};

export const addDeliveryFile = async (req: Request, res: Response) => {
  const parsed = deliveryFileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid delivery file metadata', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId); const roundId = String(req.params.roundId); const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      const round = await tx.projectDeliveryRound.findFirst({ where: { id: roundId, projectDeliveryWorkspaceId: projectId } });
      if (!round) throw httpError('Delivery round not found', 404);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const latest = await tx.projectDeliveryFile.aggregate({ where: { projectDeliveryRoundId: roundId, logicalFileKey: parsed.data.logicalFileKey }, _max: { version: true } });
      const file = await tx.projectDeliveryFile.create({ data: { projectDeliveryRoundId: roundId, logicalFileKey: parsed.data.logicalFileKey, version: (latest._max.version || 0) + 1, originalName: parsed.data.originalName, mimeType: parsed.data.mimeType, size: parsed.data.size, storageKey: parsed.data.storageKey, checksum: parsed.data.checksum, memo: parsed.data.memo, createdBy: actor.personnelId } });
      await history(tx, projectId, 'DELIVERY_FILE', file.id, 'FILE_VERSION_ADDED', actor.personnelId, { roundId, logicalFileKey: file.logicalFileKey, version: file.version });
      await audit(tx, 'PROJECT_DELIVERY_FILE_VERSION_ADDED', projectId, actor.personnelId, { roundId, fileId: file.id, version: file.version });
    });
    await respond(projectId, actor, res, 201);
  } catch (error) { handleError(res, error, 'Add delivery file'); }
};

export const addDeliveryRecord = async (req: Request, res: Response) => {
  const parsed = deliveryRecordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid delivery record', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId); const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const record = await tx.projectDeliveryRecord.create({ data: { projectDeliveryWorkspaceId: projectId, occurredAt: parsed.data.occurredAt, type: parsed.data.type, memo: parsed.data.memo, writerId: actor.personnelId } });
      await history(tx, projectId, 'DELIVERY_RECORD', record.id, 'RECORD_ADDED', actor.personnelId, { type: record.type });
      await audit(tx, 'PROJECT_DELIVERY_RECORD_ADDED', projectId, actor.personnelId, { recordId: record.id, type: record.type });
    });
    await respond(projectId, actor, res, 201);
  } catch (error) { handleError(res, error, 'Add delivery record'); }
};

export const createDownloadRequest = async (req: Request, res: Response) => {
  const parsed = downloadRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid download request', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId); const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const request = await tx.projectDownloadRequest.create({ data: { projectDeliveryWorkspaceId: projectId, targetFile: parsed.data.targetFile, reason: parsed.data.reason, requestedBy: actor.personnelId } });
      await history(tx, projectId, 'DOWNLOAD_REQUEST', request.id, 'DOWNLOAD_REQUESTED', actor.personnelId, { targetFile: request.targetFile });
      await audit(tx, 'PROJECT_DELIVERY_DOWNLOAD_REQUESTED', projectId, actor.personnelId, { requestId: request.id, targetFile: request.targetFile });
      await refreshStatus(tx, projectId);
    });
    await respond(projectId, actor, res, 201);
  } catch (error) { handleError(res, error, 'Create download request'); }
};

export const reviewDownloadRequest = async (req: Request, res: Response) => {
  const parsed = downloadReviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid download review', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId); const requestId = String(req.params.requestId); const actor = req.user!;
    if (!canApproveDownload(actor, await scopeOrThrow(projectId))) throw httpError('Forbidden: download approval requires manager access', 403);
    await prisma.$transaction(async (tx) => {
      const request = await tx.projectDownloadRequest.findFirst({ where: { id: requestId, projectDeliveryWorkspaceId: projectId } });
      if (!request) throw httpError('Download request not found', 404);
      if (request.status !== 'PENDING') throw httpError('Download request was already reviewed', 409);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      await tx.projectDownloadRequest.update({ where: { id: requestId }, data: { status: parsed.data.decision, reviewedBy: actor.personnelId, reviewedAt: new Date(), reviewNote: parsed.data.note } });
      await history(tx, projectId, 'DOWNLOAD_REQUEST', requestId, `DOWNLOAD_${parsed.data.decision}`, actor.personnelId, { note: parsed.data.note });
      await audit(tx, `PROJECT_DELIVERY_DOWNLOAD_${parsed.data.decision}`, projectId, actor.personnelId, { requestId, note: parsed.data.note });
      await refreshStatus(tx, projectId);
    });
    await respond(projectId, actor, res);
  } catch (error) { handleError(res, error, 'Review download request'); }
};

export const createDailyReport = async (req: Request, res: Response) => {
  const parsed = dailyReportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid daily report', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId); const actor = req.user!;
    await prisma.$transaction(async (tx) => {
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      const approvals = dailyApprovalRequirements(parsed.data);
      const report = await tx.projectDailyReport.create({ data: { projectDeliveryWorkspaceId: projectId, scheduleRowId: parsed.data.scheduleRowId, reportDate: parsed.data.reportDate, stage: parsed.data.stage, planMemo: parsed.data.planMemo, resultMemo: parsed.data.resultMemo, progressRate: parsed.data.progressRate, delayReason: parsed.data.delayReason, overtimeReason: parsed.data.overtimeReason, ...approvals, createdBy: actor.personnelId, updatedBy: actor.personnelId } });
      await history(tx, projectId, 'DAILY_REPORT', report.id, 'DAILY_REPORT_CREATED', actor.personnelId, { stage: report.stage, progressRate: report.progressRate });
      await audit(tx, 'PROJECT_DAILY_REPORT_CREATED', projectId, actor.personnelId, { reportId: report.id, stage: report.stage, progressRate: report.progressRate });
      await refreshStatus(tx, projectId);
    });
    await respond(projectId, actor, res, 201);
  } catch (error) { handleError(res, error, 'Create daily report'); }
};

export const approveDailyReport = async (req: Request, res: Response) => {
  const parsed = dailyApprovalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid daily report approval', details: parsed.error.issues });
  try {
    const projectId = String(req.params.projectId); const reportId = String(req.params.reportId); const actor = req.user!;
    if (!canApproveDailyReport(actor, await scopeOrThrow(projectId), parsed.data.step)) throw httpError('Forbidden: daily report approval is outside your role', 403);
    await prisma.$transaction(async (tx) => {
      const report = await tx.projectDailyReport.findFirst({ where: { id: reportId, projectDeliveryWorkspaceId: projectId } });
      if (!report) throw httpError('Daily report not found', 404);
      const field = parsed.data.step === 'PM' ? 'pmStatus' : parsed.data.step === 'MANAGER' ? 'managerStatus' : 'executiveStatus';
      if (report[field] === 'NOT_REQUIRED') throw httpError('This approval step is not required', 409);
      if (report[field] === 'APPROVED') throw httpError('This approval step was already completed', 409);
      if (parsed.data.step !== 'PM' && report.pmStatus !== 'APPROVED') throw httpError('PM approval must be completed first', 409);
      await claimVersion(tx, projectId, parsed.data.expectedVersion, actor.personnelId);
      await tx.projectDailyReport.update({ where: { id: reportId }, data: { [field]: 'APPROVED', updatedBy: actor.personnelId } });
      await history(tx, projectId, 'DAILY_REPORT', reportId, `DAILY_${parsed.data.step}_APPROVED`, actor.personnelId, {});
      await audit(tx, `PROJECT_DAILY_${parsed.data.step}_APPROVED`, projectId, actor.personnelId, { reportId });
      await refreshStatus(tx, projectId);
    });
    await respond(projectId, actor, res);
  } catch (error) { handleError(res, error, 'Approve daily report'); }
};
