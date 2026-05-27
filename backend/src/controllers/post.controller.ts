import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { uploadFile } from '../utils/cloudinary';
import {
  createPost,
  getPostById,
  deletePost,
  likePost,
  unlikePost,
  addComment,
  getComments,
} from '../services/post.service';

const parsePage = (q: unknown) => Math.max(1, parseInt(String(q ?? 1)));
const parseLimit = (q: unknown) => Math.min(50, Math.max(1, parseInt(String(q ?? 20))));

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = (req.files as Express.Multer.File[]) ?? [];
    const mediaUrls = await Promise.all(files.map((f) => uploadFile(f, 'clique/posts')));
    const post = await createPost(req.user!.userId, req.body, mediaUrls);
    sendSuccess(res, { post }, 'Post created', 201);
  } catch (err) { next(err); }
}

export async function getPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getPostById(req.params.postId, req.user!.userId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function removePost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await deletePost(req.params.postId, req.user!.userId, req.user!.role);
    sendSuccess(res, null, 'Post deleted');
  } catch (err) { next(err); }
}

export async function like(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await likePost(req.params.postId, req.user!.userId);
    sendSuccess(res, null, 'Post liked');
  } catch (err) { next(err); }
}

export async function unlike(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await unlikePost(req.params.postId, req.user!.userId);
    sendSuccess(res, null, 'Post unliked');
  } catch (err) { next(err); }
}

export async function comment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await addComment(req.params.postId, req.user!.userId, req.body);
    sendSuccess(res, { comment: result }, 'Comment added', 201);
  } catch (err) { next(err); }
}

export async function listComments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const comments = await getComments(req.params.postId, page, limit);
    sendSuccess(res, { comments, page, limit });
  } catch (err) { next(err); }
}
