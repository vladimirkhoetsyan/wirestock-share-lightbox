import { NextRequest, NextResponse } from 'next/server';

// GET /api/lightboxes
export async function GET(req: NextRequest) {
  // TODO: Fetch all lightboxes for user
  return NextResponse.json([
    {
      id: 'lb_1',
      name: 'Nature Collection',
      description: 'Beautiful nature shots',
      types: ['image', 'video'],
      keywords: ['nature', 'landscape'],
      createdAt: new Date().toISOString(),
    },
  ]);
}

// POST /api/lightboxes
export async function POST(req: NextRequest) {
  // TODO: Validate input, create lightbox
  return NextResponse.json({
    id: 'lb_2',
    name: 'New Lightbox',
    description: 'Description',
    types: ['image'],
    keywords: ['tag1', 'tag2'],
    createdAt: new Date().toISOString(),
  });
} 