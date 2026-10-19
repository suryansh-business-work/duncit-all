/**
 * A push to the customer when support answers them — a human agent's reply, or
 * the assistant's — unless they are looking at the chat right now or muted it.
 *
 * Every push for a session carries the session's tag, so a phone keeps one
 * support notification and refreshes it, the same as a chat room. Once per
 * message: the claim on the message id stops a retried call from pushing
 * twice. Fire-and-forget: a failed push is logged and never fails the reply.
 */
import { getIo, userRoom } from '@realtime/io';
import { logs } from '@observability/log';
import { chatMuteService } from '../rooms/chat.mute';
import { claimChatNotify } from '../rooms/chatState.model';
import { supportSessionRoom } from './supportChat.socket';

/** Where the customer's support chat opens (mWeb route; the app maps it to Live Chat). */
export const SUPPORT_CHAT_LINK = '/support/live';

/** Whether the customer has this session open on some device. */
async function customerIsWatching(sessionId: string, userId: string): Promise<boolean> {
  try {
    const sockets = await getIo().in(supportSessionRoom(sessionId)).fetchSockets();
    return sockets.some((socket) => socket.rooms.has(userRoom(userId)));
  } catch {
    // No socket server (scripts, tests): nobody is watching, push.
    return false;
  }
}

export async function notifySupportReply(opts: {
  sessionId: string;
  userId: string;
  messageId: string;
  senderName: string;
  text: string;
  hasAttachment: boolean;
}): Promise<void> {
  const { sessionId, userId } = opts;
  try {
    if (!(await claimChatNotify(`support:${opts.messageId}`))) return;
    if (await customerIsWatching(sessionId, userId)) return;
    if ((await chatMuteService.mutedUserIds('SUPPORT', sessionId)).has(userId)) return;
    const words = opts.text.trim().slice(0, 120) || (opts.hasAttachment ? 'Attachment' : '');
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.fanOutPush(
      {
        _id: `support:${opts.messageId}`,
        title: 'Duncit Support',
        body: opts.senderName ? `${opts.senderName}: ${words}` : words,
        link_url: SUPPORT_CHAT_LINK,
        tag: `support:${sessionId}`,
      },
      [userId]
    );
  } catch (error) {
    logs.server.warn('supportChat.notify', 'notifySupportReply', { sessionId, error });
  }
}
