import http from 'node:http';
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

  // Every authenticated socket sits in its own room, joined here rather than by
  // a feature handler: `user:changed` has to reach a portal tab that never
  // opened a chat, and the room is the only thing that guarantees it.
  io.on('connection', (socket: AuthedSocket) => {
    if (socket.userId) socket.join(userRoom(socket.userId));
  });

  return io;
}

/** The per-account room. One place, so an emitter and a joiner cannot drift. */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket server not initialised');
  return io;
}
