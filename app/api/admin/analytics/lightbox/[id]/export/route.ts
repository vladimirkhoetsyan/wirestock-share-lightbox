import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

export async function GET(req: NextRequest, context: { params: { id: string } } | Promise<{ params: { id: string } }>) {
  const resolvedContext = context instanceof Promise ? await context : context;
  const { params } = resolvedContext;
  const lightboxId = params.id;
  // Find all share links for this lightbox
  const shareLinks = await prisma.share_links.findMany({
    where: { lightbox_id: lightboxId },
    select: { id: true },
  });
  const shareLinkIds = shareLinks.map((sl) => sl.id);
  if (shareLinkIds.length === 0) {
    return new Response('No share links for this lightbox', { status: 404 });
  }
  // Get all analytics for these share links
  const analytics = await prisma.analytics.findMany({
    where: { share_link_id: { in: shareLinkIds } },
  });
  // Build CSV rows
  const headers = [
    'event', 'session_id', 'user_agent', 'ip', 'geo_country', 'geo_region', 'media_item_id', 'duration_ms', 'created_at'
  ];
  const rows = [headers.join(',')];
  for (const a of analytics) {
    rows.push([
      a.event,
      a.session_id,
      a.user_agent?.replace(/,/g, ' '),
      a.ip,
      a.geo_country,
      a.geo_region,
      a.media_item_id,
      a.duration_ms,
      a.created_at ? new Date(a.created_at).toISOString() : ''
    ].map(v => v === undefined || v === null ? '' : v).join(','));
  }
  const csv = rows.join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="lightbox-analytics-${lightboxId}.csv"`,
    },
  });
} 