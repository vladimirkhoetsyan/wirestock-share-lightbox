import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

// TODO: Add real admin authentication

// Type for analytics row
type AnalyticsRow = {
  session_id: string | null;
  duration_ms: number | null;
  event: string | null;
};

export async function GET(req: NextRequest, context: { params: { id: string } } | Promise<{ params: { id: string } }>) {
  const resolvedContext = context instanceof Promise ? await context : context;
  const { params } = resolvedContext;
  const mediaItemId = params.id;
  // Get all analytics for this media item
  const analytics = await prisma.analytics.findMany({
    where: { media_item_id: mediaItemId },
    select: {
      session_id: true,
      duration_ms: true,
      event: true,
    },
  });
  // Views (media_click events)
  const views = analytics.filter(a => a.event === 'media_click').length;
  // Play count (video_play events)
  const playCount = analytics.filter(a => a.event === 'video_play').length;
  // Watch durations (video_watch_progress or video_end events)
  const watchEvents = analytics.filter(a => a.event === 'video_watch_progress' || a.event === 'video_end');
  // Group by session_id, take the max duration_ms per session
  const sessionToMaxDuration: Record<string, number> = {};
  for (const a of watchEvents) {
    if (!a.session_id) continue;
    const duration = a.duration_ms || 0;
    if (!(a.session_id in sessionToMaxDuration) || duration > sessionToMaxDuration[a.session_id]!) {
      sessionToMaxDuration[a.session_id] = duration;
    }
  }
  const maxDurations = Object.values(sessionToMaxDuration) as number[];
  const totalWatchDuration = maxDurations.reduce((sum, d) => sum + d, 0);
  const avgWatchDuration = maxDurations.length > 0 ? Math.round(totalWatchDuration / maxDurations.length) : 0;
  // Completion rate (not available without video length)
  const completionRate = null;
  // Downloads (media_download events, if tracked)
  const downloads = analytics.filter(a => a.event === 'media_download').length;
  return NextResponse.json({
    views,
    playCount,
    avgWatchDuration, // ms
    totalWatchDuration, // ms
    completionRate,
    downloads,
  });
} 