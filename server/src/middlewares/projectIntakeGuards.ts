import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/db';
import {
  canEditProjectIntake,
  canReviewProjectIntake,
  canViewProjectIntake,
} from '../domain/projectIntake';

const loadProjectIntake = async (req: Request) => {
  const id = String(req.params.id || '');
  if (!id) return null;
  return prisma.projectIntake.findUnique({
    where: { id },
    include: { estimateRequest: true },
  });
};

const guard = (mode: 'view' | 'edit' | 'review') => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const intake = await loadProjectIntake(req);
    if (!intake) return res.status(404).json({ error: 'Project intake not found' });
    const actor = req.user!;
    const scope = {
      ownerId: intake.estimateRequest.ownerId,
      departmentId: intake.estimateRequest.departmentId,
    };
    const allowed = mode === 'view'
      ? canViewProjectIntake(actor, scope)
      : mode === 'edit'
        ? canEditProjectIntake(actor, scope)
        : canReviewProjectIntake(actor, scope);
    if (!allowed) return res.status(403).json({ error: 'Forbidden: project intake is outside your scope' });
    next();
  } catch (error) {
    console.error(`Project intake ${mode} guard error:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const requireProjectIntakeView = guard('view');
export const requireProjectIntakeEdit = guard('edit');
export const requireProjectIntakeReview = guard('review');
