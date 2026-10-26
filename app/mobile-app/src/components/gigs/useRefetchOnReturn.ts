import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * Re-read when the screen comes back into view (a gig was posted, a contact
 * shared, a freelancer profile saved on another screen). The first focus is
 * skipped: the mount load already covers it, and two requests would race.
 *
 * The effect must keep ONE identity for the life of the screen: React
 * Navigation re-runs a focus effect whenever its callback changes, and
 * `refetch` changes whenever the query's inputs do (a new filter, a wider
 * page) — which would fire a second read beside the query's own. The latest
 * `refetch` is read from a ref instead.
 */
export function useRefetchOnReturn(refetch: () => Promise<unknown>) {
  const seen = useRef(false);
  const latest = useRef(refetch);
  useEffect(() => {
    latest.current = refetch;
  });
  useFocusEffect(
    useCallback(() => {
      if (seen.current) fireAndForget(latest.current());
      seen.current = true;
    }, []),
  );
}
