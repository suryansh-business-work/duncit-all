import { getIo, type AuthedSocket } from '@realtime/io';
import { logs } from '@observability/log';
import { venueChatRoomOf, venueChatThread, sideOf } from './venueChat.access';

type Ack = (ok: boolean, err?: string) => void;

/** Joins a socket to a venue booking's thread once the user is on one of its sides. */
async function joinThread(socket: AuthedSocket, podId: string, ack?: Ack) {
  if (!socket.userId) return ack?.(false, 'UNAUTHENTICATED');
  const thread = await venueChatThread(podId);
  if (!thread || !sideOf(thread, socket.userId)) return ack?.(false, 'FORBIDDEN');
  socket.join(venueChatRoomOf(thread.podId));
  ack?.(true);
}

/** `join_venue_chat` / `leave_venue_chat`; lines arrive as `venue_chat_message`. */
export function attachVenueChatHandlers() {
  getIo().on('connection', (socket: AuthedSocket) => {
    socket.on('join_venue_chat', (podId: string, ack?: Ack) => {
      joinThread(socket, podId, ack).catch((error) => {
        logs.server.error('venueChat.socket', 'join_venue_chat', { pod: podId, error });
        ack?.(false, 'ERROR');
      });
    });
    socket.on('leave_venue_chat', (podId: string) => {
      venueChatThread(podId)
        .then((thread) => socket.leave(venueChatRoomOf(thread?.podId ?? podId)))
        .catch((error) => logs.server.error('venueChat.socket', 'leave_venue_chat', { pod: podId, error }));
    });
  });
}
