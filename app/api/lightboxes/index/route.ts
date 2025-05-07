export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyJwt } from '../../../../lib/auth-server';

// GET /api/lightboxes
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const lightboxes = await prisma.lightboxes.findMany({
    where: { /* Add user scoping if needed */ },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(lightboxes.map((lb: any) => ({
    id: lb.id,
    name: lb.name,
    description: lb.description,
    types: lb.types,
    keywords: lb.keywords,
    createdAt: lb.created_at,
  })));
}

// POST /api/lightboxes
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
  const { name, description, types, keywords } = await req.json();
  if (!name || !types || !Array.isArray(types)) {
    return NextResponse.json({ error: 'Name and types are required' }, { status: 400 });
  }
  const lightbox = await prisma.lightboxes.create({
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