import { z } from 'zod';

export const createSquadSchema = z.object({
  eventId: z.string().min(1),
  name:    z.string().min(1).max(50).optional(),
});

export const inviteToSquadSchema = z.object({
  username: z.string().min(1).max(30),
});

export const respondInviteSchema = z.object({
  accept: z.boolean(),
});
