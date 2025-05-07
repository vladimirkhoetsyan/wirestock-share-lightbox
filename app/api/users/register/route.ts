export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { hashPassword } from '../../../../lib/auth-server';

// POST /api/users/register
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    const password_hash = await hashPassword(password);
    const user = await prisma.users.create({
      data: { email, password_hash },
    });
    return NextResponse.json({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Registration failed', debug: String(e) }, { status: 500 });
  }
} 