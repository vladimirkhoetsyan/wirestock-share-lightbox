import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { getMediaUrlsFromS3Uri, getMediaTypeFromKey } from 'lib/media-urls';
import { getSignedS3Url } from 'lib/s3';

// Configurable inactivity timeout (in milliseconds)
const SESSION_TIMEOUT_MINUTES = 30;
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;

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
  // --- Timeout-based session segmentation for average session duration ---
  const subSessionDurations: number[] = [];
  for (const sessionId of sessionIds) {
    // Get and sort all events for this session by created_at
    const events = analytics.filter(a => a.session_id === sessionId && a.created_at)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (events.length < 2) continue;
    let subSession: any[] = [events[0]];
    for (let i = 1; i < events.length; i++) {
      const prev = new Date(events[i - 1].created_at).getTime();
      const curr = new Date(events[i].created_at).getTime();
      if (curr - prev > SESSION_TIMEOUT_MS) {
        // End current sub-session
        if (subSession.length > 1) {
          const subSessionTimes = subSession.map(e => new Date(e.created_at).getTime());
          const duration = Math.max(...subSessionTimes) - Math.min(...subSessionTimes);
          subSessionDurations.push(duration);
        }
        subSession = [];
      }
      subSession.push(events[i]);
    }
    // Handle last sub-session
    if (subSession.length > 1) {
      const subSessionTimes = subSession.map(e => new Date(e.created_at).getTime());
      const duration = Math.max(...subSessionTimes) - Math.min(...subSessionTimes);
      subSessionDurations.push(duration);
    }
  }
  const avgSessionDuration = subSessionDurations.length > 0 ? Math.round(subSessionDurations.reduce((a, b) => a + b, 0) / subSessionDurations.length / 1000) : 0; // in seconds
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
      let urls = null;
      try {
        urls = await getMediaUrlsFromS3Uri(item.s3_uri);
      } catch {}
      // Infer type if missing
      const media_type = item.media_type || getMediaTypeFromKey(item.s3_uri.split('s3://')[1]?.split('/').slice(1).join('/') || item.s3_uri);
      mostInteractedMediaItem = {
        id: item.id,
        title: item.s3_uri,
        media_type,
        s3_uri: item.s3_uri,
        originalUrl: urls?.original || '',
        thumbnailUrl: urls?.thumbnail || '',
        previewUrl: urls?.preview || '',
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