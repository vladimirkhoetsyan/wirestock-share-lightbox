import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { getSignedS3Url } from 'lib/s3';

// TODO: Add real admin authentication

// Configurable inactivity timeout (in milliseconds)
const SESSION_TIMEOUT_MINUTES = 30;
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;

export async function GET(req: NextRequest, context: { params: { id: string } } | Promise<{ params: { id: string } }>) {
  const { params } = await context;
  const lightboxId = params.id;
  // Find the lightbox name
  const lightbox = await prisma.lightboxes.findUnique({ where: { id: lightboxId }, select: { name: true } });
  // Find all share links for this lightbox
  const shareLinks = await prisma.share_links.findMany({
    where: { lightbox_id: lightboxId },
    select: { id: true, name: true },
  });
  const shareLinkIds = shareLinks.map((sl) => sl.id);
  const shareLinkIdToName = Object.fromEntries(shareLinks.map(sl => [sl.id, sl.name]));
  if (shareLinkIds.length === 0) {
    return NextResponse.json({ error: 'No share links for this lightbox' }, { status: 404 });
  }
  // Get all analytics for these share links
  const analytics = await prisma.analytics.findMany({
    where: { share_link_id: { in: shareLinkIds } },
  }) as any[];
  // Total sessions (unique session_id)
  const sessionIds = new Set(analytics.map(a => a.session_id).filter(Boolean));
  const totalSessions = sessionIds.size;
  // Total views (lightbox_open events)
  const totalViews = analytics.filter(a => a.event === 'lightbox_open').length;
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
  // Most interacted items (top 3 by media_click or video_play)
  const interactionCounts: Record<string, number> = {};
  analytics.forEach(a => {
    if ((a.event === 'media_click' || a.event === 'video_play') && a.media_item_id) {
      interactionCounts[a.media_item_id] = (interactionCounts[a.media_item_id] || 0) + 1;
    }
  });
  const topMediaIds = Object.entries(interactionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([media_item_id]) => media_item_id);
  let mostInteractedItems: any[] = [];
  if (topMediaIds.length > 0) {
    const mediaItems = await prisma.media_items.findMany({
      where: { id: { in: topMediaIds } },
    });
    mostInteractedItems = await Promise.all(topMediaIds.map(async (id) => {
      const item = mediaItems.find((m) => m.id === id);
      if (item) {
        let signedUrl = null;
        try {
          signedUrl = await getSignedS3Url(item.s3_uri);
        } catch {}
        return {
          id: item.id,
          title: item.s3_uri,
          media_type: item.media_type,
          s3_uri: item.s3_uri,
          signedUrl,
          count: interactionCounts[id],
        };
      } else {
        return { id, count: interactionCounts[id] };
      }
    }));
  }
  // Time-of-day engagement patterns (group by hour and share link)
  const engagementByHour: Record<string, Record<string, number>> = {};
  analytics.forEach(a => {
    if (a.created_at && a.share_link_id) {
      const hour = new Date(a.created_at).getHours();
      if (!engagementByHour[hour]) engagementByHour[hour] = {};
      engagementByHour[hour][a.share_link_id] = (engagementByHour[hour][a.share_link_id] || 0) + 1;
    }
  });
  // Geolocation aggregation: count activities per (geo_country, geo_region, share_link_id)
  const activityLocationsMap: Record<string, { country: string | null, region: string | null, count: number, share_link_id: string | null }> = {};
  let unknownCount = 0;
  analytics.forEach(a => {
    if (a.geo_country && a.geo_region && a.share_link_id) {
      const key = `${a.geo_country}|${a.geo_region}|${a.share_link_id}`;
      if (!activityLocationsMap[key]) {
        activityLocationsMap[key] = {
          country: a.geo_country,
          region: a.geo_region,
          count: 0,
          share_link_id: a.share_link_id,
        };
      }
      activityLocationsMap[key].count += 1;
    } else {
      unknownCount += 1;
    }
  });
  const activityLocations = Object.values(activityLocationsMap);
  if (unknownCount > 0) {
    activityLocations.push({ country: null, region: null, count: unknownCount, share_link_id: null });
  }
  return NextResponse.json({
    lightboxName: lightbox?.name || lightboxId,
    totalSessions,
    totalViews,
    uniqueDevices,
    avgSessionDuration, // seconds
    mostInteractedItems,
    engagementByHour,
    shareLinkIdToName,
    activityLocations,
  });
} 