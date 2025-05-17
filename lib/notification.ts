import { prisma } from 'lib/prisma';

interface CreateNotificationOptions {
  lightbox_id: string;
  share_link_id: string;
  session_id: string;
  password_correct: boolean;
  entered_at?: Date;
  sendSlack?: boolean;
}

export async function createNotificationWithReceiptsAndSlack({
  lightbox_id,
  share_link_id,
  session_id,
  password_correct,
  entered_at = new Date(),
  sendSlack = true,
}: CreateNotificationOptions) {
  // Create the notification event
  const notification = await prisma.notification.create({
    data: {
      lightbox_id,
      share_link_id,
      session_id,
      password_correct,
      entered_at,
    },
  });
  // Fetch all users
  const users = await prisma.users.findMany({ select: { id: true } });
  // Create a NotificationReceipt for each user
  const receipts = [];
  for (const user of users) {
    receipts.push(await prisma.notificationReceipt.create({
      data: {
        notification_id: notification.id,
        admin_user_id: user.id,
        seen: false,
      },
    }));
  }

  // Slack notification logic
  if (
    sendSlack &&
    process.env.SLACK_NOTIFICATIONS_ENABLED === 'true' &&
    process.env.SLACK_WEBHOOK_URL
  ) {
    // Fetch lightbox and share link names for context
    const [lightbox, shareLink] = await Promise.all([
      prisma.lightboxes.findUnique({ where: { id: lightbox_id }, select: { name: true } }),
      prisma.share_links.findUnique({ where: { id: share_link_id }, select: { name: true, password_hash: true } }),
    ]);
    // Fetch analytics for session duration
    let sessionDuration = null;
    const analytics = await prisma.analytics.findFirst({
      where: { session_id },
      orderBy: { created_at: 'asc' },
      select: { duration_ms: true },
    });
    if (analytics && analytics.duration_ms) {
      const mins = Math.floor(analytics.duration_ms / 60000);
      const secs = Math.floor((analytics.duration_ms % 60000) / 1000);
      sessionDuration = `${mins}m ${secs}s`;
    }
    const baseUrl = process.env.BASE_URL && process.env.BASE_URL.startsWith('http')
      ? process.env.BASE_URL
      : 'https://localhost:3000';
    const analyticsUrl = `${baseUrl}/admin/analytics/share-link/${share_link_id}`;
    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📥 New Lightbox Visit Notification"
          }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*🔓 Lightbox:* ${lightbox?.name ? String(lightbox.name) : 'N/A'}` },
            { type: "mrkdwn", text: `*🔗 Share Link:* ${shareLink?.name ? String(shareLink.name) : 'N/A'}` },
            { type: "mrkdwn", text: `*⏰ Time:* ${new Date().toLocaleString()}` },
            { type: "mrkdwn", text: `*🕒 Duration:* ${sessionDuration ? String(sessionDuration) : '(unknown)'}` },
            { type: "mrkdwn", text: `*✅ Password Correct:* ${shareLink?.password_hash ? (password_correct ? 'Yes' : 'No') : 'N/A'}` },
            { type: "mrkdwn", text: `*🆔 Session ID:* ${session_id ? String(session_id) : 'N/A'}` }
          ]
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "🔍 View Analytics"
              },
              url: analyticsUrl
            }
          ]
        }
      ]
    };
    try {
      const slackRes = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (e) {
      // Log but do not block notification creation
    }
  }

  return { notification, receipts };
} 