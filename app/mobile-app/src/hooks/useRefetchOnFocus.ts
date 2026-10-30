import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { logs } from '@duncit/logs';

/** Re-pull when the screen regains focus (e.g. back from checkout or a chat
 * room) so what it shows is current without a manual reload. The caller
 * already fetched on mount, so skip the first focus. */
export function useRefetchOnFocus(refetch: () => Promise<void>, scope = 'PodDetails') {
  const didFocus = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!didFocus.current) {
        didFocus.current = true;
        return;
      }
      refetch().catch((error) => logs.mobileApp.error(scope, 'refetchOnFocus', { error }));
    }, [refetch, scope]),
  );
}
