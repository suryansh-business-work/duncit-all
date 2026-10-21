import { getIo, type AuthedSocket } from '@realtime/io';
import { logs } from '@observability/log';
import { isRoomMember, socketRoomOf, type ChatRoomRef } from './chat.access';

type Ack = (ok: boolean, err?: string) => void;

/** Joins a socket to a chat room once membership checks out. */
async function joinRoom(socket: AuthedSocket, room: ChatRoomRef, ack?: Ack) {
  if (!socket.userId) return ack?.(false, 'UNAUTHENTICATED');
  try {
    const ok = await isRoomMember(room, socket.userId);
    if (!ok) return ack?.(false, 'FORBIDDEN');
    socket.join(socketRoomOf(room));
    ack?.(true);
  } catch (e: any) {
    ack?.(false, e?.message || 'ERROR');
  }
}

export function attachChatHandlers() {
  const io = getIo();

  io.on('connection', (socket: AuthedSocket) => {
    socket.on('join_pod', (podId: string, ack?: Ack) => {
      joinRoom(socket, { kind: 'POD', id: podId }, ack).catch((error) =>
        logs.server.error('chat.socket', 'join_pod', { room: `POD:${podId}`, error })
      );
    });
    socket.on('leave_pod', (podId: string) => {
      socket.leave(`pod:${podId}`);
    });
    socket.on('typing', (podId: string) => {
      if (!socket.userId) return;
      socket.to(`pod:${podId}`).emit('typing', { user_id: socket.userId });
    });

    // A club's room: the same events, under their own names so a client in a
    // pod room and a club room at once never mixes the two.
    socket.on('join_club', (clubId: string, ack?: Ack) => {
      joinRoom(socket, { kind: 'CLUB', id: clubId }, ack).catch((error) =>
        logs.server.error('chat.socket', 'join_club', { room: `CLUB:${clubId}`, error })
      );
    });
    socket.on('leave_club', (clubId: string) => {
      socket.leave(`club:${clubId}`);
    });
    socket.on('club_typing', (clubId: string) => {
      if (!socket.userId || !socket.rooms.has(`club:${clubId}`)) return;
      socket.to(`club:${clubId}`).emit('club_typing', { club_id: clubId, user_id: socket.userId });
    });
  });
}

/** Broadcasts a chat event to everyone in the room. Pod rooms keep their
 * original event names; club rooms prefix them (`club_message`, …). */
export function emitToRoom(room: ChatRoomRef, event: string, payload: unknown) {
  try {
    const name = room.kind === 'POD' ? event : `club_${event}`;
    getIo().to(socketRoomOf(room)).emit(name, payload);
  } catch {
    // Socket server not initialised yet (e.g. during seed scripts). Safe to skip.
  }
}
