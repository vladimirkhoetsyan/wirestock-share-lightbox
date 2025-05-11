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

  // Get IP address from request
  let ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

  // Fetch geolocation info
  let geo_country = null;
  let geo_region = null;
  if (ip && ip !== '::1' && ip !== '127.0.0.1') {
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
      if (geoRes.ok) {
        const geo = await geoRes.json();
        geo_country = geo.countryCode || null;
        geo_region = geo.regionName || null;
      }
    } catch {}
  }

  try {
    const analytics = await prisma.analytics.create({
      data: {
        share_link_id: data.share_link_id || null,
        media_item_id: data.media_item_id || null,
        event: data.event,
        duration_ms: data.duration_ms || null,
        ip: ip,
        user_agent: data.user_agent || null,
        session_id: data.session_id || null,
        referrer: data.referrer || null,
        screen_size: data.screen_size || null,
        geo_country,
        geo_region,
        // created_at is handled by Prisma default
      },
    });

    // --- Notification logic for lightbox_open ---
    if (data.event === 'lightbox_open' && data.share_link_id) {
      try {
        // Fetch the share link and its lightbox
        const shareLink = await prisma.share_links.findUnique({
          where: { id: data.share_link_id },
          include: { lightboxes: true },
        });
        if (shareLink && shareLink.lightbox_id && shareLink.lightboxes) {
          // Create the notification event
          const notification = await prisma.notification.create({
            data: {
              lightbox_id: shareLink.lightbox_id,
              share_link_id: shareLink.id,
              session_id: data.session_id || '',
              password_correct: !!data.password_correct,
              entered_at: new Date(),
            },
          });
          // Fetch all admin users (assume all users are admins)
          const admins = await prisma.users.findMany({ select: { id: true } });
          // Create a NotificationReceipt for each user
          await Promise.all(admins.map((user: { id: string }) =>
            prisma.notificationReceipt.create({
              data: {
                notification_id: notification.id,
                admin_user_id: user.id,
                seen: false,
              },
            })
          ));
        }
      } catch (notifErr) {
        // Log but do not block analytics event creation
        console.error('Notification creation error:', notifErr);
      }
    }

    return NextResponse.json({ success: true, id: analytics.id });
  } catch (e) {
    console.error('Analytics event error:', e);
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
} 