import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { urlConfigs } from '../../config/url-configs';

function getSocketUrl() {
  try {
    const u = new URL(urlConfigs.graphqlUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return window.location.origin;
  }
}

interface UsePodSocketParams {
  podId: string | undefined;
  refetch: () => void;
  onMessage: (msg: any) => void;
  onReactionUpdate: (msg: any) => void;
  onError: (message: string) => void;
}

export function usePodSocket({
  podId,
  refetch,
  onMessage,
  onReactionUpdate,
  onError,
}: UsePodSocketParams) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!podId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const s = io(getSocketUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = s;
    s.on('connect', () => {
      s.emit('join_pod', podId, (ok: boolean, err?: string) => {
        if (!ok) onError(err || 'Cannot join chat');
      });
    });
    s.on('message', (msg: any) => {
      if (msg.pod_id === podId) onMessage(msg);
    });
    s.on('reaction', (msg: any) => {
      if (msg.pod_id === podId) {
        onReactionUpdate(msg);
        refetch();
      }
    });
    s.on('deleted', () => refetch());
    s.on('connect_error', (e: any) => onError(e?.message || 'Socket error'));
    return () => {
      s.emit('leave_pod', podId);
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podId, refetch]);
}
