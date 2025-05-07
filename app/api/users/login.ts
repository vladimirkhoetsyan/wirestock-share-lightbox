import { NextRequest, NextResponse } from 'next/server';

// POST /api/users/login
export async function POST(req: NextRequest) {
  // TODO: Validate input, check credentials, return JWT token
  // Example request: { email, password }
  // Example response below
  return NextResponse.json({
    token: 'jwt_token',
    user: {
      id: 'user_123',
      email: 'user@example.com',
      name: 'John Doe',
    },
  });
} 