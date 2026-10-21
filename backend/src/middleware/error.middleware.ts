import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err.statusCode ?? 500;
  let message = err.message;

  // Multer file-size / field-count limits
  const multerCode = (err as { code?: string }).code;
  if (multerCode === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File is too large';
  } else if (multerCode === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
  }

  // Map common Mongoose errors to sane client-facing statuses
  const name = (err as { name?: string }).name;
  if (name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier';
  } else if (name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    message = 'Duplicate value — this record already exists';
  } else if (name === 'JsonWebTokenError' || name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  if (statusCode === 500) {
    console.error('[500]', err.message, err.stack);
    message = 'Internal server error';
  }

  res.status(statusCode).json({ success: false, message });
}

export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  return err;
}
