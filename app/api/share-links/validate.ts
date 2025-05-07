import { NextRequest, NextResponse } from 'next/server';

// POST /api/share-links/validate
export async function POST(req: NextRequest) {
  // TODO: Validate share link token and password
  return NextResponse.json({
    valid: true,
    shareLink: {
      id: 'share_1',
      token: 'share_token',
      name: 'Client Preview',
      isPasswordProtected: true,
      createdAt: new Date().toISOString(),
    },
  });
} 