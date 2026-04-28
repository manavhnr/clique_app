import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './error.middleware';

export interface AuthPayload {
  userId: string;
  role: 'attendee' | 'host' | 'admin';
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(createError('No token provided', 401));
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(createError('Invalid or expired token', 401));
  }
}
