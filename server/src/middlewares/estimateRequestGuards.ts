import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';
import { canManageEstimateRequest, canViewEstimateRequest } from '../domain/estimateRequest';

const loadEstimateRequest = async (req: Request) => {
  const id = String(req.params.id || '');
  if (!id) return null;
  return prisma.estimateRequest.findUnique({ where: { id } });
};

export const requireEstimateRequestView = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await loadEstimateRequest(req);
    if (!request) return res.status(404).json({ error: 'Estimate request not found' });
    if (!canViewEstimateRequest((req as any).user, request)) {
      return res.status(403).json({ error: 'Forbidden: estimate request is outside your scope' });
    }
    (req as any).estimateRequest = request;
    next();
  } catch (error) {
    console.error('Estimate request view guard error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const requireEstimateRequestManage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await loadEstimateRequest(req);
    if (!request) return res.status(404).json({ error: 'Estimate request not found' });
    if (!canManageEstimateRequest((req as any).user, request)) {
      return res.status(403).json({ error: 'Forbidden: estimate request cannot be modified' });
    }
    (req as any).estimateRequest = request;
    next();
  } catch (error) {
    console.error('Estimate request manage guard error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
