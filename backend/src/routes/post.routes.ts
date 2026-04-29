import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadMedia } from '../middleware/upload.middleware';
import { createPostSchema, createCommentSchema } from '../validators/post.validator';
import {
  create,
  getPost,
  removePost,
  like,
  unlike,
  comment,
  listComments,
} from '../controllers/post.controller';

const router = Router();

router.use(authenticate);

router.post('/', uploadMedia.array('media', 10), validate(createPostSchema), create);
router.get('/:postId', getPost);
router.delete('/:postId', removePost);
router.post('/:postId/like', like);
router.delete('/:postId/like', unlike);
router.post('/:postId/comments', validate(createCommentSchema), comment);
router.get('/:postId/comments', listComments);

export default router;
