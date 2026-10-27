import type { Request, Response } from 'express';
import { decodeAuthUser } from '@context';
import { logs } from '@observability/log';
import { notificationService } from './notification.service';
import { notificationEvents, type NotifyEvent } from './notification.events';

/** How often an idle stream is pinged, so proxies do not close it. */
const PING_MS = 25_000;

/** The unread count, or 0 when it cannot be read — the stream stays open either way. */
async function unreadCount(userId: string): Promise<number> {
  try {
    return await notificationService.unreadCountForUser(userId);
  } catch (error) {
    logs.server.warn('notifications', 'stream-unread-count', { error, user_id: userId });
    return 0;
  }
}

/**
 * GET /notifications/stream — Server-Sent Events for real-time notifications.
 *
 * EventSource cannot send custom headers, so the JWT arrives as `?token=`. It
 * is authenticated through `decodeAuthUser`, the same decode the GraphQL
 * context runs, so a token that has been ended — sign-out-everywhere, a
 * password reset, an account awaiting deletion — is refused here exactly as it
 * is everywhere else, rather than going on receiving the account's
 * notifications. The connection emits an initial unread count and then a
 * `notify` event whenever the user receives a notification or marks one read.
 */
export async function notificationStreamHandler(req: Request, res: Response): Promise<void> {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const userId = decodeAuthUser(token ? `Bearer ${token}` : null)?.id ?? null;
  if (!userId) {
    res.status(401).end();
    return;
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send('hello', { unread_count: await unreadCount(userId) });

  const channel = `notify:${userId}`;
  const onEvent = async (payload: NotifyEvent) => {
    const unread_count =
      payload.unread_count < 0 ? await unreadCount(userId) : payload.unread_count;
    send('notify', { ...payload, unread_count });
  };
  notificationEvents.on(channel, onEvent);

  const ping = setInterval(() => {
    res.write(': ping\n\n');
  }, PING_MS);

  req.on('close', () => {
    clearInterval(ping);
    notificationEvents.off(channel, onEvent);
  });
}
