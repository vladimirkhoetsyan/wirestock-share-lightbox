import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

// GET /api/share-links/by-token/[token]
export async function GET(req: NextRequest, contextPromise: Promise<{ params: { token: string } }>) {
  const { params } = await contextPromise;
  const { token } = params;
  const shareLink = await prisma.share_links.findUnique({
    where: { token },
    include: {
      lightboxes: {
        include: {
          media_items: true,
          share_links: true,
        },
      },
    },
  });
  if (!shareLink || shareLink.revoked) {
    return NextResponse.json({ error: 'Share link not found or revoked' }, { status: 404 });
  }
  return NextResponse.json({
    ...shareLink.lightboxes,
    shareLink: {
      id: shareLink.id,
      token: shareLink.token,
      name: shareLink.name,
      isPasswordProtected: !!shareLink.password_hash,
      createdAt: shareLink.created_at,
    },
  });
} 