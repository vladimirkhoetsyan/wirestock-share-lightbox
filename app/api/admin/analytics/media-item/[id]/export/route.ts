import { NextRequest } from 'next/server';
import { prisma } from 'lib/prisma';

export async function GET(req: NextRequest, context: { params: { id: string } } | Promise<{ params: { id: string } }>) {
  const resolvedContext = context instanceof Promise ? await context : context;
  const { params } = resolvedContext;
  const mediaItemId = params.id;
  // Get all analytics for this media item
  const analytics = await prisma.analytics.findMany({
    where: { media_item_id: mediaItemId },
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
      'Content-Disposition': `attachment; filename="media-item-analytics-${mediaItemId}.csv"`,
    },
  });
} 