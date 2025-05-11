import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { verifyJwt } from 'lib/auth-server';

// GET /api/admin/notifications?limit=10&offset=0
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
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Find receipts for this user
  const receipts = await prisma.notificationReceipt.findMany({
    where: { admin_user_id: adminUserId },
    orderBy: { id: 'desc' },
    skip: offset,
    take: limit,
    include: { notification: { include: { lightbox: true, share_link: true } } },
  });

  // Get total unread count for this user
  const unreadCount = await prisma.notificationReceipt.count({
    where: { admin_user_id: adminUserId, seen: false },
  });

  // Format notifications
  const formatted = receipts.map((r: any) => ({
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
  }));

  return NextResponse.json({ notifications: formatted, unreadCount });
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