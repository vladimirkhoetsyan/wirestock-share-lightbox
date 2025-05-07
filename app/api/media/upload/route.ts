import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { verifyJwt } from 'lib/auth-server';

// POST /api/media/upload
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { lightbox_id, s3_uri, media_type, duration_seconds, dimensions, order } = await req.json();
  if (!lightbox_id || !s3_uri) {
    return NextResponse.json({ error: 'lightbox_id and s3_uri are required' }, { status: 400 });
  }
  let newOrder = order;
  if (typeof newOrder !== 'number') {
    const max = await prisma.media_items.aggregate({
      where: { lightbox_id },
      _max: { order: true },
    });
    newOrder = (max._max.order ?? 0) + 1;
  }
  const item = await prisma.media_items.create({
    data: {
      lightbox_id,
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
    order: item.order,
    createdAt: item.created_at,
    lightbox_id: item.lightbox_id,
  });
} 