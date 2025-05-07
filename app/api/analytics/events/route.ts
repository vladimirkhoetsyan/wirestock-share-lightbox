import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

function isValidUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// POST /api/analytics/events
export async function POST(req: NextRequest) {
  const data = await req.json();
  // Validate required fields (event, at least one of share_link_id or media_item_id)
  if (!data.event || (!data.share_link_id && !data.media_item_id)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate share_link_id format
  if (data.share_link_id && !isValidUUID(data.share_link_id)) {
    return NextResponse.json({ error: 'Invalid share_link_id format' }, { status: 400 });
  }
  // Validate media_item_id format
  if (data.media_item_id && !isValidUUID(data.media_item_id)) {
    return NextResponse.json({ error: 'Invalid media_item_id format' }, { status: 400 });
  }

  // Validate share_link_id exists
  if (data.share_link_id) {
    const shareLink = await prisma.share_links.findUnique({ where: { id: data.share_link_id } });
    if (!shareLink) {
      return NextResponse.json({ error: 'Invalid share_link_id' }, { status: 400 });
    }
  }
  // Validate media_item_id exists
  if (data.media_item_id) {
    const mediaItem = await prisma.media_items.findUnique({ where: { id: data.media_item_id } });
    if (!mediaItem) {
      return NextResponse.json({ error: 'Invalid media_item_id' }, { status: 400 });
    }
  }

  try {
    const analytics = await prisma.analytics.create({
      data: {
        share_link_id: data.share_link_id || null,
        media_item_id: data.media_item_id || null,
        event: data.event,
        duration_ms: data.duration_ms || null,
        ip: data.ip || null,
        user_agent: data.user_agent || null,
      },
    });
    return NextResponse.json({ success: true, id: analytics.id });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
} 