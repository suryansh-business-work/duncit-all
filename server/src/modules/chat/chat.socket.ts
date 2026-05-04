import http from 'http';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { chatService } from './chat.service';

let io: Server | null = null;

interface AuthedSocket extends Socket {
  userId?: string;
}

export function attachChatSocket(httpServer: http.Server) {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: true, credentials: true },
  });

  io.use((socket: AuthedSocket, next) => {
    const token =
      (socket.handshake.auth?.token as string) ||
      (socket.handshake.query?.token as string) ||
      '';
    if (!token) return next(new Error('UNAUTHENTICATED'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { id: string };
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

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

  return io;
}

export function emitToPod(podId: string, event: string, payload: any) {
  io?.to(`pod:${podId}`).emit(event, payload);
}
