import { getIo, type AuthedSocket } from '../../realtime/io';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'CITY_ADMIN']);

// Admins land in `admin:bouncers` automatically on connect so they receive
// live SOS / callback / feedback events without an explicit subscribe call.
// Hosts land in `host:<userId>` so events scoped to their pods reach them.
export function attachBouncerHandlers() {
  const io = getIo();

  io.on('connection', (socket: AuthedSocket) => {
    if (!socket.userId) return;
    socket.join(`host:${socket.userId}`);
    const roles = socket.roles ?? [];
    if (roles.some((r) => ADMIN_ROLES.has(r))) {
      socket.join('admin:bouncers');
    }
  });
}
