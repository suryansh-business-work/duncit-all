import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { watchChallenge } from '@duncit/utils';
import { getSocketUrl } from '../../lib/socket-url';

/**
 * Follows challenge rooms over the existing Socket.IO server. The socket only
 * carries "challenge X moved to revision N"; `onStale` refetches through
 * GraphQL, where the server applies every visibility rule.
 *
 * Signed-out spectators have no socket (the server requires a session), so
 * `live` stays false and the caller polls instead.
 */
export function useChallengeSocket(challengeIds: string[], revisionOf: (id: string) => number, onStale: (id: string) => void) {
  const [live, setLive] = useState(false);
  const revisionRef = useRef(revisionOf);
  const staleRef = useRef(onStale);
  revisionRef.current = revisionOf;
  staleRef.current = onStale;
  const key = challengeIds.join(',');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !key) return undefined;
    const socket = io(getSocketUrl(), { path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'] });
    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    const stops = key
      .split(',')
      .map((id) => watchChallenge(socket, id, () => revisionRef.current(id), () => staleRef.current(id)));
    return () => {
      stops.forEach((stop) => stop());
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
      setLive(false);
    };
  }, [key]);

  return live;
}
