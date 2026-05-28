import http from 'http';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { isAllowedOrigin } from '../config/cors';

export interface AuthedSocket extends Socket {
  userId?: string;
  roles?: string[];
}

let io: Server | null = null;

export function initSocketServer(httpServer: http.Server): Server {
  if (io) return io;
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
      credentials: true,
    },
  });

  // Every socket must present a JWT. We attach userId/roles once here so each
  // feature handler (chat, bouncer, …) can read them without re-verifying.
  io.use((socket: AuthedSocket, next) => {
    const token =
      (socket.handshake.auth?.token as string) ||
      (socket.handshake.query?.token as string) ||
      '';
    if (!token) return next(new Error('UNAUTHENTICATED'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
        id: string;
        roles?: string[];
      };
      socket.userId = decoded.id;
      socket.roles = decoded.roles ?? [];
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket server not initialised');
  return io;
}
