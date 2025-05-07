import { NextRequest, NextResponse } from 'next/server';

// POST /api/users/register
export async function POST(req: NextRequest) {
  // TODO: Validate input, hash password, create user in DB
  // Example request: { email, password, name }
  // Example response below
  return NextResponse.json({
    id: 'user_123',
    email: 'user@example.com',
    name: 'John Doe',
    createdAt: new Date().toISOString(),
  });
} 