import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/**
 * Upload a raw Buffer to Cloudinary and return the secure CDN URL.
 * The resulting URL is served with Cloudinary's Cache-Control headers
 * (immutable, long-lived) so browsers cache the QR image.
 *
 * @param buffer    PNG/JPEG buffer to upload
 * @param publicId  Unique identifier (used as filename in Cloudinary)
 * @param folder    Cloudinary folder path (default: clique/qr-passes)
 */
export async function uploadBuffer(
  buffer: Buffer,
  publicId: string,
  folder = 'clique/qr-passes'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id:     publicId,
        folder,
        resource_type: 'image',
        format:        'png',
        overwrite:     true,
        invalidate:    true,
        // Cloudinary will serve with Cache-Control: max-age=31536000, immutable
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload returned no result'));
        resolve(result.secure_url);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

export { cloudinary };
