import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import {
  createEvent,
  getEventById,
  updateEvent,
  publishEvent,
  cancelEvent,
  deleteEvent,
  saveEvent,
  unsaveEvent,
  getHostEvents,
  getEventsFeed,
  getPublicEvents,
  addCoHost,
  removeCoHost,
  addScanner,
  removeScanner,
} from '../services/event.service';

const parsePage = (q: unknown) => Math.max(1, parseInt(String(q ?? 1)));
const parseLimit = (q: unknown) => Math.min(50, Math.max(1, parseInt(String(q ?? 20))));

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = (req.files as Express.Multer.File[]) ?? [];
    const event = await createEvent(req.user!.userId, req.body, files);
    sendSuccess(res, { event }, 'Event created', 201);
  } catch (err) { next(err); }
}

export async function getEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getEventById(req.params.eventId, req.user!.userId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await updateEvent(req.params.eventId, req.user!.userId, req.body);
    sendSuccess(res, { event }, 'Event updated');
  } catch (err) { next(err); }
}

export async function publish(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await publishEvent(req.params.eventId, req.user!.userId);
    sendSuccess(res, null, 'Event published');
  } catch (err) { next(err); }
}

export async function cancel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await cancelEvent(req.params.eventId, req.user!.userId, req.user!.role);
    sendSuccess(res, null, 'Event cancelled');
  } catch (err) { next(err); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteEvent(req.params.eventId, req.user!.userId);
    sendSuccess(res, null, 'Event deleted');
  } catch (err) { next(err); }
}

export async function save(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await saveEvent(req.user!.userId, req.params.eventId);
    sendSuccess(res, null, 'Event saved');
  } catch (err) { next(err); }
}

export async function unsave(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await unsaveEvent(req.user!.userId, req.params.eventId);
    sendSuccess(res, null, 'Event unsaved');
  } catch (err) { next(err); }
}

export async function myEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const result = await getHostEvents(req.user!.userId, page, limit);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function publicEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const events = await getPublicEvents(20);
    sendSuccess(res, { events });
  } catch (err) { next(err); }
}

export async function feed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const events = await getEventsFeed(page, limit, req.user!.userId);
    sendSuccess(res, { events, page, limit });
  } catch (err) { next(err); }
}

export async function addCoHostHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await addCoHost(req.params.eventId, req.user!.userId, req.body.username);
    sendSuccess(res, { coHosts: event.coHosts }, 'Co-host added');
  } catch (err) { next(err); }
}

export async function removeCoHostHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await removeCoHost(req.params.eventId, req.user!.userId, req.params.userId);
    sendSuccess(res, { coHosts: event.coHosts }, 'Co-host removed');
  } catch (err) { next(err); }
}

export async function addScannerHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await addScanner(req.params.eventId, req.user!.userId, req.body.username);
    sendSuccess(res, { scanners: event.scanners }, 'Scanner added');
  } catch (err) { next(err); }
}

export async function removeScannerHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await removeScanner(req.params.eventId, req.user!.userId, req.params.userId);
    sendSuccess(res, { scanners: event.scanners }, 'Scanner removed');
  } catch (err) { next(err); }
}
