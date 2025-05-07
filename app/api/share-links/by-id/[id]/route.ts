import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

// DELETE /api/share-links/by-id/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const shareLink = await prisma.share_links.findUnique({ where: { id } });
  if (!shareLink) {
    return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
  }
  await prisma.share_links.update({
    where: { id },
    data: { revoked: true },
  });
  return NextResponse.json({ success: true });
} 