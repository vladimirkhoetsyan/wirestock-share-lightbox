import { NextRequest, NextResponse } from 'next/server';

// GET /api/lightboxes/[id]/media
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Fetch media items for lightbox
  return NextResponse.json([
    {
      id: 'media_1',
      url: 's3://bucket/path.jpg',
      type: 'image',
      title: 'Title',
      description: 'Desc',
      thumbnailUrl: '/thumb.jpg',
    },
  ]);
}

// POST /api/lightboxes/[id]/media
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Validate input, create media item
  return NextResponse.json({
    id: 'media_2',
    url: 's3://bucket/path2.jpg',
    type: 'image',
    title: 'New Title',
    description: 'New Desc',
    thumbnailUrl: '/thumb2.jpg',
  });
} 