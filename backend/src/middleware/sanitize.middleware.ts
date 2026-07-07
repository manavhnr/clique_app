import { Request, Response, NextFunction } from 'express';

/**
 * Strip MongoDB operator injection from user-supplied objects.
 * Removes any key beginning with `$` or containing `.` from body/params
 * (query is read-only in Express 5 but mutated in place here defensively).
 */
function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      out[key] = scrub(val);
    }
    return out;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  // Skip raw-body routes (e.g. payment webhooks) where req.body is a Buffer.
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req.body = scrub(req.body);
  }
  if (req.params && typeof req.params === 'object') req.params = scrub(req.params) as typeof req.params;
  next();
}

/** Minimal security headers (helmet-equivalent essentials, no dependency). */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.removeHeader('X-Powered-By');
  next();
}
