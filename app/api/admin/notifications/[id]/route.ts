import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { verifyJwt } from 'lib/auth-server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (body.seen !== true) {
    return NextResponse.json({ error: 'Missing or invalid seen field' }, { status: 400 });
  }
  try {
    const receipt = await prisma.notificationReceipt.updateMany({
      where: { notification_id: id, admin_user_id: adminUserId },
      data: { seen: true, seen_at: new Date() },
    });
    if (receipt.count === 0) {
      return NextResponse.json({ error: 'NotificationReceipt not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update notification receipt', debug: String(e) }, { status: 500 });
  }
} 