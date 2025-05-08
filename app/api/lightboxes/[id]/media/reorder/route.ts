import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { verifyJwt } from 'lib/auth-server';

// POST /api/lightboxes/[id]/media/reorder
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
  const { order } = await req.json();
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'Invalid order array' }, { status: 400 });
  }
  try {
    await Promise.all(order.map((mediaId, idx) =>
      prisma.media_items.update({
        where: { id: mediaId, lightbox_id: id },
        data: { order: idx },
      })
    ));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to reorder', debug: String(e) }, { status: 400 });
  }
} 