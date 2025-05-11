export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyJwt } from '../../../../lib/auth-server';

// GET /api/lightboxes/[id]
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const lightbox = await prisma.lightboxes.findUnique({
    where: { id: params.id },
    include: {
      media_items: { orderBy: { order: 'asc' } }
    }
  });
  if (!lightbox) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const mediaItems = (lightbox.media_items || []).map((item: any) => ({
    id: item.id,
    url: item.s3_uri,
    type: item.media_type,
    title: item.s3_uri, // Placeholder, update if you have a title field
    description: '', // Placeholder, update if you have a description field
    thumbnailUrl: '', // Placeholder, update if you have a thumbnail field
    duration_seconds: item.duration_seconds,
    dimensions: item.dimensions,
    order: item.order,
    createdAt: item.created_at,
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

// PUT /api/lightboxes/[id]
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, description, types, keywords } = await req.json();
  const lightbox = await prisma.lightboxes.update({
    where: { id: params.id },
    data: {
      name,
      description: description || null,
      types,
      keywords: keywords || [],
    },
  });
  return NextResponse.json({
    id: lightbox.id,
    name: lightbox.name,
    description: lightbox.description,
    types: lightbox.types,
    keywords: lightbox.keywords,
    createdAt: lightbox.created_at,
  });
}

// DELETE /api/lightboxes/[id]
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await prisma.lightboxes.update({ where: { id: params.id }, data: { deleted: true } });
  return NextResponse.json({ success: true });
} 