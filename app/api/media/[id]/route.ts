import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { verifyJwt } from 'lib/auth-server';
import { getMediaUrlsFromS3Uri } from 'lib/media-urls';

// GET /api/media/[id]
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const id = params.id;
  const item = await prisma.media_items.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  let urls = null;
  try {
    urls = await getMediaUrlsFromS3Uri(item.s3_uri);
  } catch (e) {}
  return NextResponse.json({
    id: item.id,
    s3_uri: item.s3_uri,
    media_type: item.media_type,
    duration_seconds: item.duration_seconds,
    dimensions: item.dimensions,
    order: item.order,
    createdAt: item.created_at,
    lightbox_id: item.lightbox_id,
    originalUrl: urls?.original || '',
    thumbnailUrl: urls?.thumbnail || '',
    previewUrl: urls?.preview || '',
  });
}

// PUT /api/media/[id]
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
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
  const data = await req.json();
  try {
    const updated = await prisma.media_items.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      id: updated.id,
      s3_uri: updated.s3_uri,
      media_type: updated.media_type,
      duration_seconds: updated.duration_seconds,
      dimensions: updated.dimensions,
      order: updated.order,
      createdAt: updated.created_at,
      lightbox_id: updated.lightbox_id,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Update failed', debug: String(e) }, { status: 400 });
  }
}

// DELETE /api/media/[id]
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
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
  try {
    await prisma.media_items.update({ where: { id }, data: { deleted: true } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Delete failed', debug: String(e) }, { status: 400 });
  }
} 