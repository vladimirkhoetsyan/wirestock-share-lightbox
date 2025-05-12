import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { verifyJwt } from 'lib/auth-server';
import { getSignedS3Url } from 'lib/s3';
import { getMediaUrlsFromS3Uri } from 'lib/media-urls';

// GET /api/lightboxes/[id]/media
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const { id } = params;
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const cursor = searchParams.get('cursor'); // cursor is media_item id

  const where = { lightbox_id: id };
  const orderBy = [{ order: 'asc' as const }, { created_at: 'asc' as const }];

  let items;
  if (cursor) {
    // Find the current item's order
    const current = await prisma.media_items.findUnique({ where: { id: cursor } });
    if (!current) {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
    }
    items = await prisma.media_items.findMany({
      where: {
        ...where,
        OR: [
          { order: { gt: current.order ?? undefined } },
          { order: current.order ?? undefined, created_at: { gt: current.created_at ?? undefined } },
        ],
      },
      orderBy,
      take: limit,
    });
  } else {
    items = await prisma.media_items.findMany({
      where,
      orderBy,
      take: limit,
    });
  }
  // Only return originalUrl, thumbnailUrl, and previewUrl
  const result = await Promise.all(items.map(async (item: any) => {
    let urls = null;
    try {
      urls = await getMediaUrlsFromS3Uri(item.s3_uri);
    } catch (e) {}
    return {
      id: item.id,
      media_type: item.media_type,
      duration_seconds: item.duration_seconds,
      dimensions: item.dimensions,
      order: item.order === null ? undefined : item.order,
      createdAt: item.created_at === null ? undefined : item.created_at,
      originalUrl: urls?.original || '',
      thumbnailUrl: urls?.thumbnail || '',
      previewUrl: urls?.preview || '',
    };
  }));
  return NextResponse.json(result);
}

// POST /api/lightboxes/[id]/media
export async function POST(req: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { s3_uri, media_type, duration_seconds, dimensions, order } = await req.json();
  if (!s3_uri) {
    return NextResponse.json({ error: 's3_uri is required' }, { status: 400 });
  }
  // If order is not provided, set to max+1
  let newOrder = order;
  if (typeof newOrder !== 'number') {
    const max = await prisma.media_items.aggregate({
      where: { lightbox_id: id },
      _max: { order: true },
    });
    newOrder = (max._max.order ?? 0) + 1;
  }
  const item = await prisma.media_items.create({
    data: {
      lightbox_id: id,
      s3_uri,
      media_type: media_type || null,
      duration_seconds: duration_seconds || null,
      dimensions: dimensions || null,
      order: newOrder,
    },
  });
  return NextResponse.json({
    id: item.id,
    s3_uri: item.s3_uri,
    media_type: item.media_type,
    duration_seconds: item.duration_seconds,
    dimensions: item.dimensions,
    order: item.order === null ? undefined : item.order,
    createdAt: item.created_at === null ? undefined : item.created_at,
  });
} 