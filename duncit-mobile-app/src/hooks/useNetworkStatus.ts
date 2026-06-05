import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Tracks connectivity via NetInfo. `isOffline` is true only when the device
 * reports no connection or no reachable internet (null/unknown is treated as
 * online to avoid false warnings while the probe is in flight).
 */
export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  return { isOffline };
}
