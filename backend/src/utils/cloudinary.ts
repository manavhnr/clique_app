import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

/**
 * Upload a raw Buffer to Cloudinary and return the secure CDN URL.
 */
export async function uploadBuffer(
  buffer: Buffer,
  publicId: string,
  folder = 'clique/qr-passes',
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'image'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id:     publicId,
        folder,
        resource_type: resourceType,
        overwrite:     true,
        invalidate:    true,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload returned no result'));
        resolve(result.secure_url);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

/**
 * Upload a Multer memory-storage file to Cloudinary.
 * Auto-detects image vs video from mimetype.
 * Returns the secure CDN URL.
 */
export async function uploadFile(
  file: Express.Multer.File,
  folder: string,
  publicId?: string
): Promise<string> {
  const resourceType: 'image' | 'video' = VIDEO_MIMES.has(file.mimetype) ? 'video' : 'image';
  const id = publicId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return uploadBuffer(file.buffer, id, folder, resourceType);
}

export { cloudinary };
