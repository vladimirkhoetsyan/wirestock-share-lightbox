import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { verifyJwt, hashPassword } from 'lib/auth-server';

// GET /api/lightboxes/[id]/share-links
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const id = params.id;
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const shareLinks = await prisma.share_links.findMany({
    where: { lightbox_id: id, revoked: false },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(
    shareLinks.map((link: any) => ({
      id: link.id,
      token: link.token,
      name: link.name,
      isPasswordProtected: !!link.password_hash,
      createdAt: link.created_at,
      theme: link.theme || "dark",
      analytics: {
        totalViews: link.analytics?.totalViews ?? 0,
        mediaInteractions: link.analytics?.mediaInteractions ?? 0,
        timeSpentPerMedia: link.analytics?.timeSpentPerMedia ?? 0,
      },
    }))
  );
}

// POST /api/lightboxes/[id]/share-links
export async function POST(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const id = params.id;
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, password, theme } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  // Generate a unique token for the share link
  const shareToken = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  let password_hash = undefined;
  if (password) {
    password_hash = await hashPassword(password);
  }
  const newLink = await prisma.share_links.create({
    data: {
      lightbox_id: id,
      token: shareToken,
      name,
      password_hash,
      theme: theme || "dark",
    },
  });
  return NextResponse.json({
    id: newLink.id,
    token: newLink.token,
    name: newLink.name,
    isPasswordProtected: !!newLink.password_hash,
    createdAt: newLink.created_at,
    theme: newLink.theme || "dark",
    analytics: {
      totalViews: 0,
      mediaInteractions: 0,
      timeSpentPerMedia: 0,
    },
  });
} 