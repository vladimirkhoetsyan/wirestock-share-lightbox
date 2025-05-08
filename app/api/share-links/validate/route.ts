import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { comparePassword, signJwt } from 'lib/auth-server';

// POST /api/share-links/validate
export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  const shareLink = await prisma.share_links.findUnique({ where: { token } });
  if (!shareLink || shareLink.revoked) {
    return NextResponse.json({ valid: false, error: 'Invalid or revoked share link' }, { status: 404 });
  }
  if (shareLink.password_hash) {
    if (!password) {
      return NextResponse.json({ valid: false, error: 'Password required' }, { status: 401 });
    }
    const valid = await comparePassword(password, shareLink.password_hash);
    if (!valid) {
      return NextResponse.json({ valid: false, error: 'Invalid password' }, { status: 401 });
    }
  }
  // Issue a JWT token valid for 24 hours
  const accessToken = signJwt({
    shareLinkToken: shareLink.token,
    type: 'share-link',
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  });
  return NextResponse.json({
    valid: true,
    accessToken,
    shareLink: {
      id: shareLink.id,
      token: shareLink.token,
      name: shareLink.name,
      isPasswordProtected: !!shareLink.password_hash,
      createdAt: shareLink.created_at,
    },
  });
} 