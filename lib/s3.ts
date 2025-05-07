import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function getSignedS3Url(s3Uri: string, expiresInSeconds = 3600): Promise<string> {
  // s3Uri format: s3://bucket/key
  const match = s3Uri.match(/^s3:\/\/(.+?)\/(.+)$/);
  if (!match) throw new Error('Invalid S3 URI');
  const [, bucket, key] = match;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
} 