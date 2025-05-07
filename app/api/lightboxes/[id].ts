import { NextRequest, NextResponse } from 'next/server';

// GET /api/lightboxes/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Fetch lightbox by ID
  return NextResponse.json({
    id: params.id,
    name: 'Nature Collection',
    description: 'Beautiful nature shots',
    types: ['image', 'video'],
    keywords: ['nature', 'landscape'],
    createdAt: new Date().toISOString(),
    mediaItems: [],
    shareLinks: [],
  });
}

// PUT /api/lightboxes/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Validate input, update lightbox
  return NextResponse.json({
    id: params.id,
    name: 'Updated Lightbox',
    description: 'Updated description',
    types: ['image'],
    keywords: ['tag1'],
    createdAt: new Date().toISOString(),
  });
}

// DELETE /api/lightboxes/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Delete lightbox
  return NextResponse.json({ success: true });
} 