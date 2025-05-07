import { NextRequest, NextResponse } from 'next/server';

// GET /api/users/me
export async function GET(req: NextRequest) {
  // TODO: Check auth token, fetch user from DB
  // Example response below
  return NextResponse.json({
    id: 'user_123',
    email: 'user@example.com',
    name: 'John Doe',
  });
} 