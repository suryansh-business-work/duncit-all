import http from 'node:http';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { isAllowedOrigin } from '../config/cors';
import { isAccountLocked } from '../modules/access/accountDeletion/accountDeletion.lock';
import { socketAllowed } from '../modules/platform/rateLimit/rateLimit.guard';

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

  /*
    How often one address may OPEN a socket, governed by the same rules as
    every other request (Tech > Rate Limiting, channel SOCKET).

    Ahead of the JWT check on purpose: a reconnect storm from a broken client
    is exactly the case worth cutting off, and it presents no token at all.
  */
  io.use((socket, next) => {
    const handshake = socket.handshake;
    socketAllowed({
      address: handshake.address,
      token: (handshake.auth?.token as string) || (handshake.query?.token as string) || '',
      surface: handshake.headers['x-duncit-surface'] as string | undefined,
      app: handshake.headers['x-duncit-app'] as string | undefined,
      userAgent: handshake.headers['user-agent'],
    })
      .then((decision) => next(decision.allowed ? undefined : new Error('RATE_LIMITED')))
      // A limiter that cannot answer must never be the reason chat is down.
      .catch(() => next());
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
      // Same rule as the GraphQL context: an account whose owner has asked for
      // it to be deleted holds no session, and a socket is a session that
      // outlives the request that opened it. Without this the chat and presence
      // channels would stay live on a token every query already refuses.
      if (isAccountLocked(decoded.id)) return next(new Error('UNAUTHENTICATED'));
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
