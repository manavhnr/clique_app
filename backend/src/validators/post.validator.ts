import { z } from 'zod';

export const createPostSchema = z.object({
  text: z.string().max(2000).optional(),
  mediaType: z.enum(['image', 'video', 'mixed', 'none']).default('none'),
  linkedEventId: z.string().optional(),
  location: z.string().max(200).optional(),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
}).refine((d) => d.text || d.mediaType !== 'none', {
  message: 'Post must have text or media',
});

export const createCommentSchema = z.object({
  text: z.string().min(1).max(1000),
  parentCommentId: z.string().optional(),
});
