import { NextRequest, NextResponse } from 'next/server';

// GET /api/sessions/validate
export async function GET(req: NextRequest) {
  // TODO: Check auth token, validate session
  return NextResponse.json({
    valid: true,
    user: {
      id: 'user_123',
      email: 'user@example.com',
      name: 'John Doe',
    },
  });
} 