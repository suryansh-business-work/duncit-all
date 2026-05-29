import { chatService } from './chat.service';
import { getIo, type AuthedSocket } from '@realtime/io';

export function attachChatHandlers() {
  const io = getIo();

  io.on('connection', (socket: AuthedSocket) => {
    socket.on('join_pod', async (podId: string, ack?: (ok: boolean, err?: string) => void) => {
      if (!socket.userId) return ack?.(false, 'UNAUTHENTICATED');
      try {
        const ok = await chatService.isMember(podId, socket.userId);
        if (!ok) return ack?.(false, 'FORBIDDEN');
        socket.join(`pod:${podId}`);
        ack?.(true);
      } catch (e: any) {
        ack?.(false, e?.message || 'ERROR');
      }
    });

    socket.on('leave_pod', (podId: string) => {
      socket.leave(`pod:${podId}`);
    });

    socket.on('typing', (podId: string) => {
      if (!socket.userId) return;
      socket.to(`pod:${podId}`).emit('typing', { user_id: socket.userId });
    });
  });
}

export function emitToPod(podId: string, event: string, payload: any) {
  try {
    getIo().to(`pod:${podId}`).emit(event, payload);
  } catch {
    // Socket server not initialised yet (e.g. during seed scripts). Safe to skip.
  }
}
