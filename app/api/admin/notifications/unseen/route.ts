import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { verifyJwt } from 'lib/auth-server';

// PUT /api/admin/notifications/unseen { ids: [id1, id2, ...] }
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
      data: { seen: false, seen_at: null },
    });
    return NextResponse.json({ success: true, count: result.count });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update notification receipts', debug: String(e) }, { status: 500 });
  }
} 