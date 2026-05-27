import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import {
  createSquad,
  getMySquad,
  getAllSquadsForEvent,
  inviteToSquad,
  respondToInvite,
  leaveSquad,
  approveGroup,
} from '../services/squad.service';

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { eventId, name } = req.body;
    const squad = await createSquad(req.user!.userId, eventId, name);
    sendSuccess(res, { squad }, 'Squad created', 201);
  } catch (err) { next(err); }
}

export async function mySquad(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { eventId } = req.params;
    const result = await getMySquad(req.user!.userId, eventId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function allSquads(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { eventId } = req.params;
    const result = await getAllSquadsForEvent(req.user!.userId, eventId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function invite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { squadId } = req.params;
    const { username } = req.body;
    const result = await inviteToSquad(squadId, req.user!.userId, username);
    sendSuccess(res, result, 'Invite sent');
  } catch (err) { next(err); }
}

export async function respond(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { squadId } = req.params;
    const { accept } = req.body;
    const result = await respondToInvite(squadId, req.user!.userId, accept);
    sendSuccess(res, result, accept ? 'Joined squad' : 'Invite declined');
  } catch (err) { next(err); }
}

export async function leave(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { squadId } = req.params;
    const result = await leaveSquad(squadId, req.user!.userId);
    sendSuccess(res, result, result.disbanded ? 'Squad disbanded' : 'Left squad');
  } catch (err) { next(err); }
}

export async function approveGroupHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { squadId } = req.params;
    const result = await approveGroup(squadId, req.user!.userId);
    sendSuccess(res, result, 'Group approved — passes issued to all members');
  } catch (err) { next(err); }
}
