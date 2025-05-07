import { NextRequest, NextResponse } from 'next/server';

// GET /api/lightboxes/[id]/share-links
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Fetch share links for lightbox
  return NextResponse.json([
    {
      id: 'share_1',
      token: 'share_token',
      name: 'Client Preview',
      isPasswordProtected: true,
      createdAt: new Date().toISOString(),
      analytics: {
        totalViews: 10,
        mediaInteractions: 5,
        timeSpentPerMedia: 12,
      },
    },
  ]);
}

// POST /api/lightboxes/[id]/share-links
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Validate input, create share link
  return NextResponse.json({
    id: 'share_2',
    token: 'new_share_token',
    name: 'New Share',
    isPasswordProtected: false,
    createdAt: new Date().toISOString(),
    analytics: {
      totalViews: 0,
      mediaInteractions: 0,
      timeSpentPerMedia: 0,
    },
  });
} 