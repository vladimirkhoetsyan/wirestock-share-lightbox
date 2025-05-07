export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { comparePassword, signJwt } from '../../../../lib/auth-server';

// POST /api/sessions (login)
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }
  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const token = signJwt({ id: user.id, email: user.email });
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Login failed', debug: String(e) }, { status: 500 });
  }
}

// DELETE /api/sessions (logout)
export async function DELETE(req: NextRequest) {
  // For stateless JWT, logout is handled client-side (just delete the token)
  // If you want to blacklist tokens, implement a blacklist table here
  return NextResponse.json({ success: true });
} 