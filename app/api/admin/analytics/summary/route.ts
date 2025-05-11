import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { getSignedS3Url } from 'lib/s3';

export async function GET(req: NextRequest) {
  // Total lightboxes
  const totalLightboxes = await prisma.lightboxes.count({ where: { deleted: false } });
  // Total media items
  const totalMediaItems = await prisma.media_items.count({ where: { deleted: false } });
  // Total share links
  const totalShareLinks = await prisma.share_links.count();
  // Get all analytics
  const analytics = await prisma.analytics.findMany() as any[];
  // Total views (lightbox_open events)
  const totalViews = analytics.filter(a => a.event === 'lightbox_open').length;
  // Unique sessions (unique session_id)
  const sessionIds = new Set(analytics.map(a => a.session_id).filter(Boolean));
  const uniqueSessions = sessionIds.size;
  // Unique devices (user_agent)
  const deviceIds = new Set(analytics.map(a => a.user_agent).filter(Boolean));
  const uniqueDevices = deviceIds.size;
  // Average session duration (estimate: max(created_at)-min(created_at) per session)
  const sessionDurations: number[] = [];
  for (const sessionId of sessionIds) {
    const events = analytics.filter(a => a.session_id === sessionId && a.created_at);
    if (events.length > 1) {
      const times = events.map(e => new Date(e.created_at!).getTime());
      const duration = Math.max(...times) - Math.min(...times);
      sessionDurations.push(duration);
    }
  }
  const avgSessionDuration = sessionDurations.length > 0 ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length / 1000) : 0; // in seconds
  // Most interacted media item (by media_click or video_play)
  const interactionCounts: Record<string, number> = {};
  analytics.forEach(a => {
    if ((a.event === 'media_click' || a.event === 'video_play') && a.media_item_id) {
      interactionCounts[a.media_item_id] = (interactionCounts[a.media_item_id] || 0) + 1;
    }
  });
  const topMediaId = Object.entries(interactionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([media_item_id]) => media_item_id)[0];
  let mostInteractedMediaItem = null;
  if (topMediaId) {
    const item = await prisma.media_items.findUnique({ where: { id: topMediaId } });
    if (item) {
      let signedUrl = null;
      try {
        signedUrl = await getSignedS3Url(item.s3_uri);
      } catch {}
      mostInteractedMediaItem = {
        id: item.id,
        title: item.s3_uri,
        media_type: item.media_type,
        s3_uri: item.s3_uri,
        signedUrl,
        count: interactionCounts[topMediaId],
      };
    }
  }
  return NextResponse.json({
    totalLightboxes,
    totalMediaItems,
    totalShareLinks,
    totalViews,
    uniqueSessions,
    uniqueDevices,
    avgSessionDuration, // seconds
    mostInteractedMediaItem,
  });
} 