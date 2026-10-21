import { getIo } from '@realtime/io';
import { logs } from '@observability/log';
import { alertTargets } from '../rooms/chat.notify';
import { blockedPeerIds } from '../rooms/chat.access';
import { claimChatNotify } from '../rooms/chatState.model';
import { threadMembers, venueChatRoomOf, type VenueChatThread } from './venueChat.access';

/** Members with the thread open on some device — they already see the line. */
async function presentIds(podId: string): Promise<Set<string>> {
  const present = new Set<string>();
  try {
    const sockets = await getIo().in(venueChatRoomOf(podId)).fetchSockets();
    for (const socket of sockets) {
      for (const name of socket.rooms) if (name.startsWith('user:')) present.add(name.slice(5));
    }
  } catch {
    // No socket server (scripts, tests): nobody is present, alert everyone.
  }
  return present;
}

/**
 * A push to the thread's other side for every new line, one notification per
 * thread on a device (the tag), once per message (the claim). Never the
 * sender, never someone either side has blocked. A failure is logged and never
 * fails the message.
 */
export async function notifyVenueChat(msg: {
  thread: VenueChatThread;
  messageId: string;
  senderId: string;
  senderName: string;
  preview: string;
}): Promise<void> {
  const { thread } = msg;
  try {
    if (!(await claimChatNotify(`venue-chat:${msg.messageId}`))) return;
    const [present, blocked] = await Promise.all([presentIds(thread.podId), blockedPeerIds(msg.senderId)]);
    const targets = alertTargets({
      members: threadMembers(thread),
      senderId: msg.senderId,
      present,
      blocked,
      muted: new Set(),
      mentioned: new Set(),
    });
    if (targets.length === 0) return;
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.fanOutPush(
      {
        _id: `venue-chat:${msg.messageId}`,
        title: thread.podTitle || thread.venueName,
        body: `${msg.senderName}: ${msg.preview}`,
        link_url: `/venue-chat/${thread.podId}`,
        tag: `chat:${venueChatRoomOf(thread.podId)}`,
      },
      targets
    );
  } catch (error) {
    logs.server.warn('venueChat.notify', 'notifyVenueChat', { pod: thread.podId, error });
  }
}
