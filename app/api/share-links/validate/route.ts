import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { comparePassword } from 'lib/auth-server';

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
  return NextResponse.json({
    valid: true,
    shareLink: {
      id: shareLink.id,
      token: shareLink.token,
      name: shareLink.name,
      isPasswordProtected: !!shareLink.password_hash,
      createdAt: shareLink.created_at,
    },
  });
} 