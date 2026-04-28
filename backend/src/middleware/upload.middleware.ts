import multer from 'multer';
import path from 'path';
import { createError } from './error.middleware';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, '/tmp/clique-uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  },
});

export const uploadMedia = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type'));
  },
});
