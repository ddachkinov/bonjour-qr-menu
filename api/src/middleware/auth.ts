import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenant_id: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        tenant_id: decoded.tenant_id,
        role: decoded.role,
      };
      next();
    } catch (err) {
      logger.warn('Invalid token', { error: err });
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Authentication error', error);
    return res.status(500).json({ error: 'InternalError', message: 'Authentication failed' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireTenantAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated' });
  }

  const tenantId = req.params.tenantId || req.body.tenant_id;

  if (tenantId && tenantId !== req.user.tenant_id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Access to different tenant denied' });
  }

  next();
};
