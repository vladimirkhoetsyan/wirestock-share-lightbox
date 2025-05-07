export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyJwt } from '../../../../lib/auth-server';

// GET /api/lightboxes/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
  });
  if (!lightbox) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({
    id: lightbox.id,
    name: lightbox.name,
    description: lightbox.description,
    types: lightbox.types,
    keywords: lightbox.keywords,
    createdAt: lightbox.created_at,
  });
}

// PUT /api/lightboxes/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await prisma.lightboxes.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
} 