import { io, type Socket } from 'socket.io-client';

import { config } from '@/constants/config';
import { getAuthToken } from '@/services/auth-token';

/**
 * Opens an app-wide socket for the signed-in account, or resolves null when
 * there is no token. The server joins every authed socket to the account's own
 * room, which is where `user:changed`, `session:revoked` and `chat:new` arrive.
 * The caller owns the connection and must disconnect it. `cancelled` is asked
 * once the token is read, so a caller that went away meanwhile never connects.
 */
export async function openUserSocket(
  cancelled: () => boolean = () => false,
): Promise<Socket | null> {
  const token = await getAuthToken();
  if (!token || cancelled()) return null;
  return io(config.apiUrl, {
    path: '/socket.io',
    auth: { token },
    // Same fallback as the chat sockets: some mobile and captive networks
    // block WebSockets outright.
    transports: ['websocket', 'polling'],
  });
}
