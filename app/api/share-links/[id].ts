import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/share-links/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Revoke share link
  return NextResponse.json({ success: true });
} 