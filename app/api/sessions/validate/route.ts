export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyJwt } from '../../../../lib/auth-server';

// GET /api/sessions/validate
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ valid: false });
  }
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload || !payload.id) {
    return NextResponse.json({ valid: false });
  }
  const user = await prisma.users.findUnique({ where: { id: payload.id } });
  if (!user) {
    return NextResponse.json({ valid: false });
  }
  return NextResponse.json({
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
    },
  });
} 