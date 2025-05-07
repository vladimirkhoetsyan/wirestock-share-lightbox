import { NextRequest, NextResponse } from 'next/server';

// POST /api/analytics/events
export async function POST(req: NextRequest) {
  // TODO: Record analytics event
  return NextResponse.json({ success: true });
} 