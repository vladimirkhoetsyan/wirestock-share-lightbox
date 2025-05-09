import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'analytics_session_id';

function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId || '';
}

function getDeviceInfo() {
  return {
    user_agent: navigator.userAgent,
    screen_size: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || null,
  };
}

export type AnalyticsEventType =
  | 'lightbox_open'
  | 'media_click'
  | 'video_play'
  | 'video_watch_progress'
  | 'video_end';

export interface AnalyticsEvent {
  event: AnalyticsEventType;
  share_link_id?: string;
  media_item_id?: string;
  duration_ms?: number;
  [key: string]: any;
}

export async function recordAnalyticsEvent(event: AnalyticsEvent) {
  const session_id = getSessionId();
  const deviceInfo = getDeviceInfo();
  const payload = {
    ...event,
    ...deviceInfo,
    session_id,
  };
  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Optionally handle/report error
  }
} 