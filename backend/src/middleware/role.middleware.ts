import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { createError } from './error.middleware';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createError('Forbidden', 403));
    }
    next();
  };
}

export function requireVerifiedHost(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'host') {
    return next(createError('Verified host access required', 403));
  }
  next();
}
