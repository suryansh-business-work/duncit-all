import { useEffect, useState } from 'react';

/**
 * Tracks browser connectivity via `navigator.onLine` + the window online/offline
 * events. Returns `isOffline` so the app can warn the user when the network drops
 * (mWeb twin of the mobile NetInfo offline banner).
 */
export function useOnlineStatus(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false,
  );

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    globalThis.addEventListener('online', goOnline);
    globalThis.addEventListener('offline', goOffline);
    return () => {
      globalThis.removeEventListener('online', goOnline);
      globalThis.removeEventListener('offline', goOffline);
    };
  }, []);

  return { isOffline };
}
