import { getIo, type AuthedSocket } from '@realtime/io';
import { supportChatService } from './supportChat.service';

const SUPPORT_ROLES = new Set(['SUPER_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_USER']);

export const SUPPORT_AGENTS_ROOM = 'support:agents';
export const supportUserRoom = (userId: string) => `support:user:${userId}`;
export const supportSessionRoom = (sessionId: string) => `support:session:${sessionId}`;

// Support agents land in `support:agents` so they receive live ticket + chat
// events without an explicit subscribe. Every user lands in their own
// `support:user:<id>` room so agent replies reach them anywhere in the app.
export function attachSupportChatHandlers() {
  const io = getIo();

  io.on('connection', (socket: AuthedSocket) => {
    if (!socket.userId) return;
    socket.join(supportUserRoom(socket.userId));
    const roles = socket.roles ?? [];
    if (roles.some((r) => SUPPORT_ROLES.has(r))) {
      socket.join(SUPPORT_AGENTS_ROOM);
    }

    socket.on('join_support_session', async (sessionId: string, ack?: (ok: boolean, err?: string) => void) => {
      if (!socket.userId) return ack?.(false, 'UNAUTHENTICATED');
      try {
        const isAgent = (socket.roles ?? []).some((r) => SUPPORT_ROLES.has(r));
        const ok = await supportChatService.canAccessSession(sessionId, socket.userId, isAgent);
        if (!ok) return ack?.(false, 'FORBIDDEN');
        socket.join(supportSessionRoom(sessionId));
        ack?.(true);
      } catch (e: any) {
        ack?.(false, e?.message || 'ERROR');
      }
    });

    socket.on('leave_support_session', (sessionId: string) => {
      socket.leave(supportSessionRoom(sessionId));
    });

    socket.on('support_typing', (sessionId: string) => {
      if (!socket.userId) return;
      socket.to(supportSessionRoom(sessionId)).emit('support_typing', { session_id: sessionId, user_id: socket.userId });
    });
  });
}

function safeEmit(room: string, event: string, payload: any) {
  try {
    getIo().to(room).emit(event, payload);
  } catch {
    // Socket server not initialised yet (e.g. during seed scripts). Safe to skip.
  }
}

export function emitToSupportAgents(event: string, payload: any) {
  safeEmit(SUPPORT_AGENTS_ROOM, event, payload);
}

export function emitToSupportUser(userId: string, event: string, payload: any) {
  safeEmit(supportUserRoom(userId), event, payload);
}

export function emitToSupportSession(sessionId: string, event: string, payload: any) {
  safeEmit(supportSessionRoom(sessionId), event, payload);
}
