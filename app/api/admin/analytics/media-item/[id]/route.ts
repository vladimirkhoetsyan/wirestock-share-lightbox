import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

// TODO: Add real admin authentication

export async function GET(req: NextRequest, context: { params: { id: string } } | Promise<{ params: { id: string } }>) {
  const { params } = await context;
  const mediaItemId = params.id;
  // Get all analytics for this media item
  const analytics = await prisma.analytics.findMany({
    where: { media_item_id: mediaItemId },
  });
  // Views (media_click events)
  const views = analytics.filter(a => a.event === 'media_click').length;
  // Play count (video_play events)
  const playCount = analytics.filter(a => a.event === 'video_play').length;
  // Watch durations (video_watch_progress or video_end events)
  const watchEvents = analytics.filter(a => a.event === 'video_watch_progress' || a.event === 'video_end');
  const totalWatchDuration = watchEvents.reduce((sum, a) => sum + (a.duration_ms || 0), 0);
  const avgWatchDuration = watchEvents.length > 0 ? Math.round(totalWatchDuration / watchEvents.length) : 0;
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