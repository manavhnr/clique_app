import multer from 'multer';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB

// Store files in memory as buffers — each controller uploads to Cloudinary
const memory = multer.memoryStorage();

export const uploadImage = multer({
  storage: memory,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  },
});

export const uploadMedia = multer({
  storage: memory,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type — allowed: JPEG, PNG, WebP, MP4, MOV, WebM'));
  },
});
