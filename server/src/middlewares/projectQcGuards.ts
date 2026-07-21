import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { ProjectOperationScope } from '../domain/projectOperation';
import { canEditProjectQc, canSendProjectQc, canViewProjectQc } from '../domain/projectQc';

const parse = (value: string): Record<string, unknown> => { try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; } };
const assignedIds = (schedule: { assignmentsJson: string; plan1Json: string; plan2Json: string; approvedPlan: string | null } | null) => {
  if (!schedule) return [];
  const assignmentIds = Object.values(parse(schedule.assignmentsJson)).filter((value): value is string => typeof value === 'string' && Boolean(value));
  const selected = schedule.approvedPlan === 'plan2' ? parse(schedule.plan2Json) : parse(schedule.plan1Json);
  const rows = Array.isArray(selected.rows) ? selected.rows : [];
  const rowIds = rows.map((row) => typeof row === 'object' && row && 'assigneeId' in row ? String(row.assigneeId) : '').filter(Boolean);
  return [...new Set([...assignmentIds, ...rowIds])];
};

const guard = (mode: 'view' | 'edit' | 'send') => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const checklist = await prisma.projectQcChecklist.findUnique({
      where: { projectId: String(req.params.projectId) },
      include: { project: { include: { manager: true, pmSchedule: true } } },
    });
    if (!checklist) return res.status(404).json({ error: 'Project QC checklist not found' });
    const scope: ProjectOperationScope = {
      managerId: checklist.project.managerId,
      managerDepartmentId: checklist.project.manager.departmentId,
      pmId: checklist.project.pmId,
      assignmentIds: assignedIds(checklist.project.pmSchedule),
    };
    const actor = req.user!;
    const allowed = mode === 'view' ? canViewProjectQc(actor, scope)
      : mode === 'edit' ? canEditProjectQc(actor, scope)
        : canSendProjectQc(actor, scope);
    if (!allowed) return res.status(403).json({ error: 'Forbidden: project QC is outside your role or project scope' });
    next();
  } catch (error) {
    console.error(`Project QC ${mode} guard error:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const requireProjectQcView = guard('view');
export const requireProjectQcEdit = guard('edit');
export const requireProjectQcSend = guard('send');
