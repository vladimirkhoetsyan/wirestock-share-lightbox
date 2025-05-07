import { NextRequest, NextResponse } from 'next/server';

// POST /api/media/upload
export async function POST(req: NextRequest) {
  // TODO: Handle file upload, store in S3, generate thumbnail
  // Accept multipart/form-data
  return NextResponse.json({
    url: 's3://bucket/path.jpg',
    thumbnailUrl: '/thumb.jpg',
  });
} 