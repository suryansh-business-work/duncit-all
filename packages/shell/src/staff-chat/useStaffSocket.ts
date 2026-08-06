import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { playNotificationBeep } from '@duncit/utils';
import type { StaffMessage } from './queries';

/**
 * The realtime half of staff chat.
 *
 * The same socket server the pod and support chats already use — one connection
 * per portal tab, authenticated by the JWT in the handshake, and the server
 * puts every socket in a room named after its own user. So a message arrives
 * without either side subscribing to a conversation that may not exist yet.
 */

interface Options {
  /** The portal's GraphQL endpoint — the socket lives on the same host. */
  graphqlUrl: string;
  token: string | null;
  /** Fires for every message either way, including your own from another tab. */
  onMessage: (message: StaffMessage) => void;
  /** Who you are, so the beep only fires for messages you did not write. */
  meId?: string | null;
  /** The conversation on screen; no beep for the one you are looking at. */
  openPeerId?: string | null;
}

function socketOrigin(graphqlUrl: string): string {
  try {
    const url = new URL(graphqlUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

export function useStaffSocket({ graphqlUrl, token, onMessage, meId, openPeerId }: Options) {
  const socketRef = useRef<Socket | null>(null);
  // Read through refs so a new handler identity does not tear the socket down
  // and reconnect it on every render.
  const handler = useRef(onMessage);
  const context = useRef({ meId, openPeerId });
  handler.current = onMessage;
  context.current = { meId, openPeerId };

  useEffect(() => {
    const origin = socketOrigin(graphqlUrl);
    if (!token || !origin) return undefined;

    const socket = io(origin, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('staff_message', (message: StaffMessage) => {
      handler.current(message);
      const { meId: me, openPeerId: open } = context.current;
      // Silent for your own writing, and for the conversation already in front
      // of you — a beep for a message you are watching arrive is just noise.
      const mine = me && message.from_user_id === me;
      const watching = open && message.from_user_id === open;
      if (!mine && !watching) playNotificationBeep();
    });

    return () => {
      socket.off('staff_message');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [graphqlUrl, token]);

  return {
    /** Tell the other end you are typing. Best-effort; nothing waits on it. */
    typing: (peerId: string) => socketRef.current?.emit('staff_typing', peerId),
  };
}
