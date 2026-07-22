import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { ProjectOperationScope } from '../domain/projectOperation';
import { canManageProjectDelivery, canViewProjectDelivery, canWriteDailyReport } from '../domain/projectDelivery';

const parse = (value: string): Record<string, unknown> => { try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; } };
const assignedIds = (schedule: { assignmentsJson: string; plan1Json: string; plan2Json: string; approvedPlan: string | null } | null) => {
  if (!schedule) return [];
  const assignment = Object.values(parse(schedule.assignmentsJson)).filter((value): value is string => typeof value === 'string' && Boolean(value));
  const selected = schedule.approvedPlan === 'plan2' ? parse(schedule.plan2Json) : parse(schedule.plan1Json);
  const rows = Array.isArray(selected.rows) ? selected.rows : [];
  const rowIds = rows.map((row) => typeof row === 'object' && row && 'assigneeId' in row ? String(row.assigneeId) : '').filter(Boolean);
  return [...new Set([...assignment, ...rowIds])];
};

export const deliveryScope = async (projectId: string): Promise<ProjectOperationScope | null> => {
  const workspace = await prisma.projectDeliveryWorkspace.findUnique({
    where: { projectId },
    include: { project: { include: { manager: true, pmSchedule: true } } },
  });
  if (!workspace) return null;
  return {
    managerId: workspace.project.managerId,
    managerDepartmentId: workspace.project.manager.departmentId,
    pmId: workspace.project.pmId,
    assignmentIds: assignedIds(workspace.project.pmSchedule),
  };
};

const guard = (mode: 'view' | 'delivery' | 'daily') => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scope = await deliveryScope(String(req.params.projectId));
    if (!scope) return res.status(404).json({ error: 'Project delivery workspace not found' });
    const actor = req.user!;
    const allowed = mode === 'view' ? canViewProjectDelivery(actor, scope)
      : mode === 'delivery' ? canManageProjectDelivery(actor, scope)
        : canWriteDailyReport(actor, scope);
    if (!allowed) return res.status(403).json({ error: 'Forbidden: delivery workspace is outside your role or project scope' });
    next();
  } catch (error) {
    console.error(`Project delivery ${mode} guard error:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const requireProjectDeliveryView = guard('view');
export const requireProjectDeliveryManage = guard('delivery');
export const requireProjectDailyWrite = guard('daily');
