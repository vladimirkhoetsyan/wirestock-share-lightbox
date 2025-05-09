import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { getSignedS3Url } from 'lib/s3';
// import UAParser from 'ua-parser-js'; // Uncomment if ua-parser-js is installed

// TODO: Add real admin authentication

export async function GET(req: NextRequest, context: { params: { id: string } } | Promise<{ params: { id: string } }>) {
  const { params } = await context;
  const shareLinkId = params.id;
  // Find the share link
  const shareLink = await prisma.share_links.findUnique({ where: { id: shareLinkId }, select: { id: true, lightbox_id: true, name: true } });
  if (!shareLink) {
    return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
  }
  // Get all analytics for this share link
  const analytics = await prisma.analytics.findMany({
    where: { share_link_id: shareLinkId },
  }) as any[];
  // Total sessions (unique session_id)
  const sessionIds = new Set(analytics.map(a => a.session_id).filter(Boolean));
  const totalSessions = sessionIds.size;
  // Total views (lightbox_open events)
  const totalViews = analytics.filter(a => a.event === 'lightbox_open').length;
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
  // Time-of-day engagement patterns (group by hour)
  const engagementByHour: Record<string, number> = {};
  analytics.forEach(a => {
    if (a.created_at) {
      const hour = new Date(a.created_at).getHours();
      engagementByHour[hour] = (engagementByHour[hour] || 0) + 1;
    }
  });
  // Geolocation aggregation: count activities per (geo_country, geo_region)
  const activityLocationsMap: Record<string, { country: string | null, region: string | null, count: number }> = {};
  let unknownCount = 0;
  analytics.forEach(a => {
    if (a.geo_country && a.geo_region) {
      const key = `${a.geo_country}|${a.geo_region}`;
      if (!activityLocationsMap[key]) {
        activityLocationsMap[key] = {
          country: a.geo_country,
          region: a.geo_region,
          count: 0,
        };
      }
      activityLocationsMap[key].count += 1;
    } else {
      unknownCount += 1;
    }
  });
  const activityLocations = Object.values(activityLocationsMap);
  if (unknownCount > 0) {
    activityLocations.push({ country: null, region: null, count: unknownCount });
  }
  return NextResponse.json({
    shareLinkId,
    shareLinkName: shareLink?.name || shareLinkId,
    totalSessions,
    totalViews,
    uniqueDevices,
    avgSessionDuration, // seconds
    mostInteractedItems,
    engagementByHour,
    activityLocations,
  });
} 