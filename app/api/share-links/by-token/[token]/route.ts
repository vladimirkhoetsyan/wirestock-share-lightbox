import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

// GET /api/share-links/by-token/[token]
export async function GET(req: NextRequest, paramsContext: { params: { token: string } }) {
  const { params } = paramsContext;
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
    theme: shareLink.theme || "dark",
    analytics: {
      totalViews: 0,
      mediaInteractions: 0,
      timeSpentPerMedia: 0,
    },
  });
} 