import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/db';
import {
  assignmentIds,
  canAssignProjectPmSchedule,
  canEditProjectPmSchedule,
  canReviewProjectPmSchedule,
  canViewProjectPmSchedule,
  emptyPmAssignment,
  pmAssignmentSchema,
  pmSchedulePlanSchema,
  ProjectPmScheduleScope,
} from '../domain/projectPmSchedule';

const parseJson = (value: string): unknown => { try { return JSON.parse(value); } catch { return {}; } };

const guard = (mode: 'view' | 'assign' | 'edit' | 'review') => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedule = await prisma.projectPmSchedule.findUnique({
      where: { projectId: String(req.params.projectId) },
      include: { project: { include: { manager: true } } },
    });
    if (!schedule) return res.status(404).json({ error: 'Project PM schedule not found' });
    const assignment = pmAssignmentSchema.safeParse(parseJson(schedule.assignmentsJson));
    const plan1 = pmSchedulePlanSchema.safeParse(parseJson(schedule.plan1Json));
    const plan2 = pmSchedulePlanSchema.safeParse(parseJson(schedule.plan2Json));
    const scope: ProjectPmScheduleScope = {
      managerId: schedule.project.managerId,
      managerDepartmentId: schedule.project.manager.departmentId,
      pmId: schedule.project.pmId,
      assignmentIds: assignmentIds(assignment.success ? assignment.data : emptyPmAssignment()),
      rowAssigneeIds: [...new Set([...(plan1.success ? plan1.data.rows : []), ...(plan2.success ? plan2.data.rows : [])].map((row) => row.assigneeId))],
    };
    const actor = req.user!;
    const allowed = mode === 'view' ? canViewProjectPmSchedule(actor, scope)
      : mode === 'assign' ? canAssignProjectPmSchedule(actor, scope)
        : mode === 'edit' ? canEditProjectPmSchedule(actor, scope)
          : canReviewProjectPmSchedule(actor, scope);
    if (!allowed) return res.status(403).json({ error: 'Forbidden: PM schedule is outside your role or project scope' });
    next();
  } catch (error) {
    console.error(`Project PM schedule ${mode} guard error:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const requireProjectPmScheduleView = guard('view');
export const requireProjectPmScheduleAssign = guard('assign');
export const requireProjectPmScheduleEdit = guard('edit');
export const requireProjectPmScheduleReview = guard('review');
