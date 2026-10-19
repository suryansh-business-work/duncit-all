import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * Re-read when the screen comes back into view (a gig was posted, a contact
 * shared, a freelancer profile saved on another screen). The first focus is
 * skipped: the mount load already covers it, and two requests would race.
 */
export function useRefetchOnReturn(refetch: () => Promise<unknown>) {
  const seen = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seen.current) fireAndForget(refetch());
      seen.current = true;
    }, [refetch]),
  );
}
