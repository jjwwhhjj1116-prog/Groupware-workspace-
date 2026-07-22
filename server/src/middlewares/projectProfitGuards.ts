import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { ProjectOperationScope } from '../domain/projectOperation';
import { canEditProjectProfit, canViewProjectProfit } from '../domain/projectProfit';

const parse = (value: string): Record<string, unknown> => { try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; } };
const scheduleIds = (schedule: { assignmentsJson: string; plan1Json: string; plan2Json: string; approvedPlan: string | null } | null) => {
  if (!schedule) return [];
  const assignment = Object.values(parse(schedule.assignmentsJson)).filter((value): value is string => typeof value === 'string' && Boolean(value));
  const plan = parse(schedule.approvedPlan === 'plan2' ? schedule.plan2Json : schedule.plan1Json);
  const rows = Array.isArray(plan.rows) ? plan.rows : [];
  const rowIds = rows.map((row) => typeof row === 'object' && row && 'assigneeId' in row ? String(row.assigneeId) : '').filter(Boolean);
  return [...new Set([...assignment, ...rowIds])];
};

export const projectProfitScope = async (projectId: string): Promise<ProjectOperationScope | null> => {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { manager: true, pmSchedule: true } });
  if (!project) return null;
  return { managerId: project.managerId, managerDepartmentId: project.manager.departmentId, pmId: project.pmId, assignmentIds: scheduleIds(project.pmSchedule) };
};

const guard = (mode: 'view' | 'edit') => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scope = await projectProfitScope(String(req.params.projectId));
    if (!scope) return res.status(404).json({ error: 'Project not found' });
    const allowed = mode === 'view' ? canViewProjectProfit(req.user!, scope) : canEditProjectProfit(req.user!, scope);
    if (!allowed) return res.status(403).json({ error: 'Forbidden: profit analysis is outside your role or project scope' });
    next();
  } catch (error) {
    console.error(`Project profit ${mode} guard error:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const requireProjectProfitView = guard('view');
export const requireProjectProfitEdit = guard('edit');
