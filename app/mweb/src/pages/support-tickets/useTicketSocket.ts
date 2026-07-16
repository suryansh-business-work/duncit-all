import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { urlConfigs } from '../../config/url-configs';

function getSocketUrl() {
  try {
    const u = new URL(urlConfigs.graphqlUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return globalThis.window.location.origin;
  }
}

/**
 * Live ticket updates for the user (B12): the server fans `ticket:update` out to
 * the user's room whenever a thread changes (new reply or a read-state change),
 * so the Sent/Seen ticks refresh without a manual refetch. The user is auto-joined
 * to their own room on connect, so no explicit subscribe is needed.
 */
export function useTicketSocket(ticketId: string | undefined, onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!ticketId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const s: Socket = io(getSocketUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    s.on('ticket:update', (ticket: { id?: string }) => {
      if (ticket?.id === ticketId) onUpdateRef.current();
    });
    return () => {
      s.disconnect();
    };
  }, [ticketId]);
}
