import { getIo, type AuthedSocket } from '@realtime/io';

/**
 * A room per person, not per conversation.
 *
 * Someone signed into three portals has three sockets and needs the message in
 * all of them; and a new conversation has no room to have joined in advance.
 * Joining your own id solves both — and there is nothing to authorise, because
 * `io.use` already proved who this socket is.
 */
const room = (userId: string) => `staff:${userId}`;

export function attachStaffChatHandlers() {
  getIo().on('connection', (socket: AuthedSocket) => {
    if (!socket.userId) return;
    socket.join(room(socket.userId));

    socket.on('staff_typing', (peerId: string) => {
      if (!socket.userId || !peerId) return;
      socket.to(room(peerId)).emit('staff_typing', { from_user_id: socket.userId });
    });
  });
}

/**
 * Deliver to both ends.
 *
 * The sender's other tabs need it as much as the recipient does — writing on a
 * laptop and watching the same conversation on a second screen is the normal
 * case, not an edge one.
 */
export function emitStaffMessage(message: { from_user_id: string; to_user_id: string }) {
  try {
    const io = getIo();
    io.to(room(message.to_user_id)).emit('staff_message', message);
    io.to(room(message.from_user_id)).emit('staff_message', message);
  } catch {
    // No socket server yet (seed scripts, tests). The message is already saved;
    // the recipient sees it on their next read.
  }
}
