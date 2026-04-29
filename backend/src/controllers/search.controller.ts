import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { getEventsNearMe, searchEvents, globalSearch } from '../services/search.service';

export async function nearMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, message: 'lat and lng are required' });
      return;
    }

    const events = await getEventsNearMe(
      {
        latitude: lat,
        longitude: lng,
        radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
        date: req.query.date as string | undefined,
        category: req.query.category as string | undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        sort: req.query.sort as 'distance' | 'trending' | 'date' | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      },
      req.user!.userId
    );

    sendSuccess(res, { events });
  } catch (err) { next(err); }
}

export async function eventSearch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const events = await searchEvents(
      {
        q: req.query.q as string | undefined,
        latitude: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
        longitude: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
        radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
        date: req.query.date as string | undefined,
        category: req.query.category as string | undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      },
      req.user!.userId
    );

    sendSuccess(res, { events });
  } catch (err) { next(err); }
}

export async function search(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query.q as string;
    if (!q) {
      sendSuccess(res, { users: [], hosts: [], events: [] });
      return;
    }
    const results = await globalSearch(q, req.user!.userId);
    sendSuccess(res, results);
  } catch (err) { next(err); }
}
