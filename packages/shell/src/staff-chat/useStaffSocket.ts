import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { playMessagePing } from './sounds';
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
  /** An edit or a delete: same message, different words. */
  onMessageChanged?: (message: StaffMessage) => void;
  /** Who you are, so the ping only fires for messages you did not write. */
  meId?: string | null;
  /** The conversation on screen; no ping for the one you are looking at. */
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

export function useStaffSocket({
  graphqlUrl,
  token,
  onMessage,
  onMessageChanged,
  meId,
  openPeerId,
}: Options) {
  // Exposed as state, not just a ref: presence and calls are hooks that need to
  // re-run the moment a socket exists, and a ref does not re-render.
  const [socket, setSocket] = useState<Socket | null>(null);
  /**
   * Who is typing, and when they last said so.
   *
   * A timestamp rather than a boolean: "typing" has no stop event — somebody
   * who closes the tab mid-word would otherwise be typing forever. Readers
   * treat anything older than a few seconds as finished.
   */
  const [typingAt, setTypingAt] = useState<Record<string, number>>({});
  // Handlers are read through refs so a new identity does not tear the socket
  // down and reconnect it on every render.
  const handler = useRef(onMessage);
  const changed = useRef(onMessageChanged);
  const context = useRef({ meId, openPeerId });
  handler.current = onMessage;
  changed.current = onMessageChanged;
  context.current = { meId, openPeerId };

  useEffect(() => {
    const origin = socketOrigin(graphqlUrl);
    if (!token || !origin) return undefined;

    const connection = io(origin, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
    });
    setSocket(connection);

    connection.on('staff_message', (message: StaffMessage) => {
      handler.current(message);
      const { meId: me, openPeerId: open } = context.current;
      // Silent for your own writing, and for the conversation already in front
      // of you — a ping for a message you are watching arrive is just noise.
      const mine = me && message.from_user_id === me;
      const watching = open && message.from_user_id === open;
      if (!mine && !watching) playMessagePing();
    });

    connection.on('staff_message_changed', (message: StaffMessage) => {
      changed.current?.(message);
    });

    connection.on('staff_typing', (payload: { from_user_id?: string }) => {
      const from = payload?.from_user_id;
      if (from) setTypingAt((current) => ({ ...current, [from]: Date.now() }));
    });

    return () => {
      connection.off('staff_message');
      connection.off('staff_message_changed');
      connection.off('staff_typing');
      connection.disconnect();
      setSocket(null);
    };
  }, [graphqlUrl, token]);

  return {
    socket,
    /** Tell the other end you are typing. Best-effort; nothing waits on it. */
    typing: (peerId: string) => socket?.emit('staff_typing', peerId),
    typingAt,
  };
}
