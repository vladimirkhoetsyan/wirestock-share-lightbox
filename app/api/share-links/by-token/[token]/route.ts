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
    id: shareLink.id,
    token: shareLink.token,
    name: shareLink.name,
    lightbox_id: shareLink.lightbox_id,
    isPasswordProtected: !!shareLink.password_hash,
    createdAt: shareLink.created_at,
    analytics: {
      totalViews: shareLink.analytics?.totalViews ?? 0,
      mediaInteractions: shareLink.analytics?.mediaInteractions ?? 0,
      timeSpentPerMedia: shareLink.analytics?.timeSpentPerMedia ?? 0,
    },
  });
} 