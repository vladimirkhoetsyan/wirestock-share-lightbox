import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { verifyJwt } from 'lib/auth-server';
import Fuse from 'fuse.js';

// GET /api/admin/notifications?limit=10&page=1&seen=true&dateFrom=2024-05-01&dateTo=2024-05-10&lightboxId=...&shareLinkId=...&q=search
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
  const adminUserId = payload.id;
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const offset = (page - 1) * limit;

  // Filters
  const seen = searchParams.get('seen');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const lightboxId = searchParams.get('lightboxId');
  const shareLinkId = searchParams.get('shareLinkId');
  const q = searchParams.get('q');

  // Build Prisma where clause
  const where: any = { admin_user_id: adminUserId };
  if (seen === 'true') where.seen = true;
  if (seen === 'false') where.seen = false;
  if (dateFrom || dateTo || lightboxId || shareLinkId) {
    where.notification = {};
    if (dateFrom) where.notification.entered_at = { ...(where.notification.entered_at || {}), gte: new Date(dateFrom) };
    if (dateTo) where.notification.entered_at = { ...(where.notification.entered_at || {}), lte: new Date(dateTo) };
    if (lightboxId) where.notification.lightbox_id = lightboxId;
    if (shareLinkId) where.notification.share_link_id = shareLinkId;
  }

  // Find receipts for this user with filters
  let receipts = await prisma.notificationReceipt.findMany({
    where,
    orderBy: { id: 'desc' },
    include: { notification: { include: { lightbox: true, share_link: true } } },
  });

  // Fuzzy search in-memory if q is provided
  if (q) {
    const fuse = new Fuse(receipts, {
      keys: [
        'notification.lightbox.name',
        'notification.share_link.name',
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
    receipts = fuse.search(q).map((r: any) => r.item);
  }

  // Pagination after fuzzy search
  const paginated = receipts.slice(offset, offset + limit);

  // Get total unread count for this user (ignoring filters)
  const unreadCount = await prisma.notificationReceipt.count({
    where: { admin_user_id: adminUserId, seen: false },
  });

  // Get analytics for session_id to resolve IP and country
  const sessionIds = paginated.map(r => r.notification.session_id).filter((id: string | null | undefined) => typeof id === 'string' && !!id);
  let analyticsMap: Record<string, any> = {};
  if (sessionIds.length > 0) {
    const analytics = await prisma.analytics.findMany({
      where: { session_id: { in: sessionIds } },
      select: { session_id: true, ip: true, geo_country: true },
    });
    analytics.forEach(a => { if (a.session_id) analyticsMap[a.session_id] = a; });
  }

  // Format notifications
  const formatted = paginated.map((r: any) => {
    const analytics = analyticsMap[r.notification.session_id] || {};
    return {
      id: r.notification.id,
      lightboxName: r.notification.lightbox?.name || '',
      shareLinkName: r.notification.share_link?.name || '',
      enteredAt: r.notification.entered_at,
      enteredAtRelative: getRelativeTime(r.notification.entered_at),
      passwordCorrect: r.notification.password_correct,
      analyticsLink: `/admin/analytics/share-link/${r.notification.share_link_id}`,
      sessionDuration: null, // can be filled in if needed
      seen: r.seen,
      seenAt: r.seen_at,
      sessionId: r.notification.session_id,
      ip: analytics.ip || null,
      country: analytics.geo_country || null,
    };
  });

  return NextResponse.json({ notifications: formatted, unreadCount, total: receipts.length });
}

// Helper: relative time (e.g., '3 minutes ago')
function getRelativeTime(date: Date) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

// POST /api/admin/notifications
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
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { lightbox_id, share_link_id, session_id, password_correct } = body;
  if (!lightbox_id || !share_link_id || !session_id || typeof password_correct !== 'boolean') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  try {
    // Create the notification event
    const notification = await prisma.notification.create({
      data: {
        lightbox_id,
        share_link_id,
        session_id,
        password_correct,
        entered_at: new Date(),
      },
    });
    // Fetch all users
    const users = await prisma.users.findMany({ select: { id: true } });
    // Create a NotificationReceipt for each user
    const receipts = await Promise.all(users.map((user: { id: string }) =>
      prisma.notificationReceipt.create({
        data: {
          notification_id: notification.id,
          admin_user_id: user.id,
          seen: false,
        },
      })
    ));
    return NextResponse.json({ notification, receipts });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create notification', debug: String(e) }, { status: 500 });
  }
}

// POST /api/admin/notifications/bulk-seen { ids: [id1, id2, ...] }
export async function PUT(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const adminUserId = payload.id;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { ids } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid ids' }, { status: 400 });
  }
  try {
    const result = await prisma.notificationReceipt.updateMany({
      where: { admin_user_id: adminUserId, notification_id: { in: ids } },
      data: { seen: true, seen_at: new Date() },
    });
    return NextResponse.json({ success: true, count: result.count });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update notification receipts', debug: String(e) }, { status: 500 });
  }
} 