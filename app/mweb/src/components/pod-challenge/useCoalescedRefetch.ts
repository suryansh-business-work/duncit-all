import { useCallback, useRef } from 'react';
import { logs } from '@duncit/logs';

/**
 * A refetch that never stacks: while one is in flight, further requests fold
 * into a single follow-up. A burst of votes (dozens of signals a second) then
 * costs two reads, not dozens, and the last read still sees the latest state.
 */
export function useCoalescedRefetch(refetch: () => Promise<unknown>) {
  const inFlight = useRef(false);
  const again = useRef(false);

  return useCallback(function run() {
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    refetch()
      .catch((error: unknown) => logs.mWeb.warn('pod-challenge', 'refetch', { error }))
      .finally(() => {
        inFlight.current = false;
        if (again.current) {
          again.current = false;
          run();
        }
      });
  }, [refetch]);
}
