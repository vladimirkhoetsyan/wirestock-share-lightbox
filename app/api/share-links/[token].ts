import { NextRequest, NextResponse } from 'next/server';

// GET /api/share-links/[token]
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  // TODO: Validate token, return shared lightbox data
  return NextResponse.json({
    id: 'lb_1',
    name: 'Nature Collection',
    description: 'Beautiful nature shots',
    types: ['image', 'video'],
    keywords: ['nature', 'landscape'],
    createdAt: new Date().toISOString(),
    mediaItems: [],
    shareLinks: [],
  });
} 