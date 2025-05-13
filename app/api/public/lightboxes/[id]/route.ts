import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { getSignedS3Url } from 'lib/s3';
import { verifyJwt } from 'lib/auth-server';
import { getMediaUrlsFromS3Uri } from 'lib/media-urls';

// GET /api/public/lightboxes/[id]?shareToken=...
// Note: For password-protected share links, the frontend must enforce password validation before calling this endpoint.
export async function GET(req: NextRequest, paramsContext: { params: { id: string } }) {
  const { params } = paramsContext;
  const { searchParams } = new URL(req.url);
  const shareToken = searchParams.get('shareToken');
  if (!shareToken) {
    return NextResponse.json({ error: 'Missing shareToken' }, { status: 400 });
  }
  // Find the share link for this lightbox and token
  const shareLink = await prisma.share_links.findFirst({
    where: { token: shareToken, lightbox_id: params.id, revoked: false },
  });
  if (!shareLink) {
    return NextResponse.json({ error: 'Share link not found or revoked' }, { status: 404 });
  }
  // If password protected, require JWT
  if (shareLink.password_hash) {
    const auth = req.headers.get('authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = auth.replace('Bearer ', '');
    const payload = verifyJwt(token);
    if (!payload || payload.type !== 'share-link' || payload.shareLinkToken !== shareLink.token || (payload.exp && Date.now() / 1000 > payload.exp)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  // Fetch the lightbox and its media items
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 100);
  const lightbox = await prisma.lightboxes.findUnique({
    where: { id: params.id },
    include: {
      media_items: {
        orderBy: { order: 'asc' },
        skip: offset,
        take: limit,
      },
    },
  });
  if (!lightbox) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  // Generate signed URLs for each media item (server-side)
  const mediaItems = await Promise.all((lightbox.media_items || []).map(async (item: any) => {
    let urls = null;
    try {
      urls = await getMediaUrlsFromS3Uri(item.s3_uri);
    } catch {}
    return {
      id: item.id,
      url: item.s3_uri,
      type: item.media_type,
      title: item.s3_uri, // Placeholder, update if you have a title field
      description: '', // Placeholder, update if you have a description field
      originalUrl: urls?.original || '',
      thumbnailUrl: urls?.thumbnail || '',
      previewUrl: urls?.preview || '',
      duration_seconds: item.duration_seconds,
      dimensions: item.dimensions,
      order: item.order,
      createdAt: item.created_at,
    };
  }));
  return NextResponse.json({
    id: lightbox.id,
    name: lightbox.name,
    description: lightbox.description,
    types: lightbox.types,
    keywords: lightbox.keywords,
    createdAt: lightbox.created_at,
    mediaItems,
  });
} 