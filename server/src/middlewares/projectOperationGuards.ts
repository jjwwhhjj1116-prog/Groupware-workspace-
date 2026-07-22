import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { canApproveProjectOperation, canEditProjectOperation, canViewProjectOperation, ProjectOperationScope } from '../domain/projectOperation';

const parse = (value: string): Record<string, unknown> => { try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; } };
const assignedIds = (schedule: { assignmentsJson: string; plan1Json: string; plan2Json: string; approvedPlan: string | null } | null) => {
  if (!schedule) return [];
  const assignment = Object.values(parse(schedule.assignmentsJson)).filter((value): value is string => typeof value === 'string' && Boolean(value));
  const selected = schedule.approvedPlan === 'plan2' ? parse(schedule.plan2Json) : parse(schedule.plan1Json);
  const rows = Array.isArray(selected.rows) ? selected.rows : [];
  const rowIds = rows.map((row) => typeof row === 'object' && row && 'assigneeId' in row ? String(row.assigneeId) : '').filter(Boolean);
  return [...new Set([...assignment, ...rowIds])];
};

const guard = (mode: 'view' | 'edit' | 'approve') => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operation = await prisma.projectOperation.findUnique({
      where: { projectId: String(req.params.projectId) },
      include: { project: { include: { manager: true, pmSchedule: true } } },
    });
    if (!operation) return res.status(404).json({ error: 'Project operation not found' });
    const scope: ProjectOperationScope = {
      managerId: operation.project.managerId,
      managerDepartmentId: operation.project.manager.departmentId,
      pmId: operation.project.pmId,
      assignmentIds: assignedIds(operation.project.pmSchedule),
    };
    const actor = req.user!;
    const allowed = mode === 'view' ? canViewProjectOperation(actor, scope)
      : mode === 'edit' ? canEditProjectOperation(actor, scope)
        : canApproveProjectOperation(actor, scope);
    if (!allowed) return res.status(403).json({ error: 'Forbidden: project operation is outside your role or project scope' });
    next();
  } catch (error) {
    console.error(`Project operation ${mode} guard error:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const requireProjectOperationView = guard('view');
export const requireProjectOperationEdit = guard('edit');
export const requireProjectOperationApprove = guard('approve');
