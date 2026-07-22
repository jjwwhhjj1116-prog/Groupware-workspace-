import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sid = req.cookies.sid;
    if (!sid) {
      return res.status(401).json({ error: 'Unauthorized: No session cookie' });
    }

    const session = await prisma.session.findUnique({ where: { sid } });
    if (!session) {
      res.clearCookie('sid');
      return res.status(401).json({ error: 'Unauthorized: Invalid session' });
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      res.clearCookie('sid');
      return res.status(401).json({ error: 'Unauthorized: Session expired' });
    }

    const data = JSON.parse(session.data);
    
    // Check if account is still active and session version matches
    const account = await prisma.accountUser.findUnique({
      where: { id: data.accountId },
      include: { personnel: true }
    });

    if (!account || account.status !== 'ACTIVE' || account.sessionVersion !== data.sessionVersion) {
      await prisma.session.delete({ where: { id: session.id } });
      res.clearCookie('sid');
      return res.status(401).json({ error: 'Unauthorized: Account inactive or session revoked' });
    }

    // Attach user context to request
    req.user = {
      accountId: account.id,
      personnelId: account.personnelId,
      email: account.email,
      role: account.personnel.role,
      departmentId: account.personnel.departmentId
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
    next();
  };
};

export const requireSystemAdmin = requireRole(['SUPER_ADMIN', 'SYSTEM_ADMIN']);
