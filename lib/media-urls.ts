// Utility for resolving media URLs (thumbnail, preview, original) from S3 URI

import { getSignedS3Url } from './s3';
import crypto from 'crypto';

export interface MediaUrls {
  original: string;
  thumbnail: string;
  preview: string;
}

const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'heic', 'avif'
];
const VIDEO_EXTENSIONS = [
  'mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv', 'ogv', '3gp', '3g2', 'hls', 'm3u8'
];

export function getMediaTypeFromKey(key: string): 'image' | 'video' | undefined {
  const extMatch = key.split('?')[0].split('.').pop();
  if (!extMatch) return undefined;
  const ext = extMatch.toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (key.toLowerCase().includes('.m3u8')) return 'video';
  return undefined;
}

// --- Serverless image handler helpers ---
const IMAGE_HANDLER_CLOUDFRONT = process.env.IMAGE_HANDLER_CLOUDFRONT!;
const IMAGE_HANDLER_SIGNATURE_SECRET = process.env.IMAGE_HANDLER_SIGNATURE_SECRET!;

// Special CDN for 'wirestock-original-production' bucket
const WIRESTOCK_ORIGINAL_PRODUCTION_CLOUDFRONT = process.env.WIRESTOCK_ORIGINAL_PRODUCTION_CLOUDFRONT!;
const WIRESTOCK_ORIGINAL_PRODUCTION_SIGNATURE_SECRET = process.env.WIRESTOCK_ORIGINAL_PRODUCTION_SIGNATURE_SECRET!;

function getServerlessImageHandlerTransformationUrl(s3Path: string, bucket: string, width: number, height: number): string {
  const request = {
    key: s3Path,
    bucket: bucket,
    edits: {
      resize: {
        width,
        height,
      },
    },
  };
  const requestJsonData = JSON.stringify(request);
  const transformationRequest = Buffer.from(requestJsonData, 'utf8').toString('base64');
  const signature = getTransformationSignature(transformationRequest, IMAGE_HANDLER_SIGNATURE_SECRET);
  return `${IMAGE_HANDLER_CLOUDFRONT}/${transformationRequest}?signature=${signature}`;
}

function getImageCdnTransformationUrl(s3Path: string, bucket: string, width: number, height: number): string {
  const request = {
    key: s3Path,
    bucket: bucket,
    edits: {
      resize: {
        width,
        height,
      },
    },
  };
  const requestJsonData = JSON.stringify(request);
  const transformationRequest = Buffer.from(requestJsonData, 'utf8').toString('base64');
  const signature = getTransformationSignature(transformationRequest, WIRESTOCK_ORIGINAL_PRODUCTION_SIGNATURE_SECRET);
  return `${WIRESTOCK_ORIGINAL_PRODUCTION_CLOUDFRONT}/${transformationRequest}?signature=${signature}`;
}

function getTransformationSignature(encodedRequest: string, secret: string) {
  const hmac = crypto.createHmac('sha256', Buffer.from(secret, 'ascii'));
  hmac.update(`/${encodedRequest}`, 'ascii');
  const signature1 = hmac.digest();
  if (!signature1) {
    throw new Error('No request was provided.');
  }
  return signature1.toString('hex');
}

// --- Strategy pattern for bucket-specific logic ---

type MediaUrlResolver = (bucket: string, key: string, type: 'image' | 'video') => Promise<MediaUrls | null>;

const fallbackResolver: MediaUrlResolver = async (bucket, key, type) => {
  const original = await getSignedS3Url(`s3://${bucket}/${key}`);
  if (type === 'video') {
    // Try to get a thumbnail image for the video
    let thumbnail = original;
    try {
      thumbnail = await getSignedS3Url(`s3://${bucket}/${key}.0000000.jpg`);
    } catch {}
    return {
      original,
      thumbnail,
      preview: original,
    };
  }
  // Default for images and unknown types
  return {
    original,
    thumbnail: original,
    preview: original,
  };
};

const bucketResolvers: Record<string, MediaUrlResolver> = {
  'wirestock-data-program-project-media-production': async (bucket, key, type) => {
    const expiresInSeconds = 3600;
    if (type === 'video') {
      const original = await getSignedS3Url(`s3://${bucket}/${key}`, expiresInSeconds);
      const thumbnail = await getSignedS3Url(`s3://${bucket}/${key}.0000000.jpg`, expiresInSeconds);
      const preview = await getSignedS3Url(`s3://${bucket}/${key}.preview.mp4`, expiresInSeconds);
      return { original, thumbnail, preview };
    } else if (type === 'image') {
      const original = await getSignedS3Url(`s3://${bucket}/${key}`, expiresInSeconds);
      const thumbnail = getServerlessImageHandlerTransformationUrl(key, bucket, 512, 512);
      const preview = getServerlessImageHandlerTransformationUrl(key, bucket, 1024, 1024);
      return { original, thumbnail, preview };
    }
    return null;
  },
  'wirestock-original-production': async (bucket, key, type) => {
    const expiresInSeconds = 3600;
    if (type === 'image') {
      const original = await getSignedS3Url(`s3://${bucket}/${key}`, expiresInSeconds);
      const thumbnail = getImageCdnTransformationUrl(key, bucket, 512, 512);
      const preview = getImageCdnTransformationUrl(key, bucket, 1024, 1024);
      return { original, thumbnail, preview };
    } else if (type === 'video') {
      const original = await getSignedS3Url(`s3://${bucket}/${key}`, expiresInSeconds);
      // Thumbnail: s3://${bucket}/${key}/preview.jpeg (transformed to 512x512)
      const thumbnailKey = `${key}/preview.jpeg`;
      const thumbnail = getImageCdnTransformationUrl(thumbnailKey, bucket, 512, 512);
      // Preview: s3://${bucket}/${key}/{filename-without-ext}-preview.mp4
      const filenameWithoutExt = key.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
      const previewKey = `${key}/${filenameWithoutExt}-preview.mp4`;
      const preview = await getSignedS3Url(`s3://${bucket}/${previewKey}`, expiresInSeconds);
      return { original, thumbnail, preview };
    }
    return null;
  },
};

export async function getMediaUrlsFromS3Uri(s3Uri: string): Promise<MediaUrls | null> {
  const match = s3Uri.match(/^s3:\/\/(.+?)\/(.+)$/);
  if (!match) throw new Error('Invalid S3 URI');
  const [, bucket, key] = match;

  const type = getMediaTypeFromKey(key);
  if (!type) return null;

  // Use bucket-specific resolver if available, otherwise fallback
  const resolver = bucketResolvers[bucket] || fallbackResolver;
  return resolver(bucket, key, type);
} 