import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { createError } from './error.middleware';
import { User } from '../models/User';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createError('Forbidden', 403));
    }
    next();
  };
}

// DB-verified check — host status may change after JWT was issued
export async function requireVerifiedHost(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(createError('Unauthorized', 401));
    const user = await User.findById(req.user.userId).select('isVerifiedHost isBanned');
    if (!user || !user.isVerifiedHost || user.isBanned) {
      return next(createError('Verified host access required', 403));
    }
    next();
  } catch (err) {
    next(err);
  }
}
