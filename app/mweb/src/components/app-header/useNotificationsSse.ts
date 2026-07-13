import { useEffect, useRef } from 'react';
import { urlConfigs } from '../../config/url-configs';

/**
 * Subscribes to the server's notification SSE channel for the current user
 * and invokes `onEvent` whenever a `notify` event arrives. Falls back to a
 * no-op if no token is present in localStorage.
 *
 * The connection uses the browser's native EventSource — there is no client
 * polling. Reconnection is handled automatically by the browser; we only
 * recreate the source when the auth token changes.
 */
export function useNotificationsSse(onEvent: () => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const apiBase = urlConfigs.apiBaseUrl;
    const url = `${apiBase.replace(/\/$/, '')}/notifications/stream?token=${encodeURIComponent(
      token
    )}`;

    let es: EventSource | null = null;
    try {
      es = new EventSource(url, { withCredentials: false });
    } catch {
      return;
    }

    const handler = () => onEventRef.current();
    es.addEventListener('notify', handler);
    es.addEventListener('hello', handler);
    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do here.
    };

    return () => {
      es?.removeEventListener('notify', handler);
      es?.removeEventListener('hello', handler);
      es?.close();
    };
  }, []);
}
