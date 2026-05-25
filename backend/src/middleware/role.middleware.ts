import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { createError } from './error.middleware';
import { User } from '../models/User';
import { Event } from '../models/Event';

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

// Allows verified hosts OR users with scanner permission for the target event
export async function requireScanPermission(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(createError('Unauthorized', 401));
    const user = await User.findById(req.user.userId).select('isVerifiedHost isBanned');
    if (!user || user.isBanned) return next(createError('Forbidden', 403));

    if (user.isVerifiedHost) return next();

    const eventId = req.body?.eventId;
    if (!eventId) return next(createError('eventId required for scan', 400));

    const event = await Event.findById(eventId).select('scanners hostId');
    if (!event) return next(createError('Event not found', 404));

    const isScannerForEvent = event.scanners.some(
      (s) => s.userId.toString() === req.user!.userId
    );
    if (!isScannerForEvent) return next(createError('Scanner permission required', 403));

    next();
  } catch (err) {
    next(err);
  }
}
