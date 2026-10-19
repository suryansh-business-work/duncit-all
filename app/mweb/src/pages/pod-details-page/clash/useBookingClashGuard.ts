import { useCallback, useRef, useState } from 'react';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { MY_BOOKING_CLASHES_SDL, uniqueClashingPods, type PodBookingClash } from '@duncit/utils';
import { logs } from '@duncit/logs';

export const MY_BOOKING_CLASHES = gql(MY_BOOKING_CLASHES_SDL);

/**
 * Asks, just before a booking, whether the member already holds a spot on a
 * pod at the same time — and if so, lets them choose: Force book (resolves
 * true) or Cancel booking (false). Advisory only: a check that cannot run
 * never stands between the member and their booking.
 * Native twin: screens/PodDetailsScreen/useBookingClashGuard.
 */
export function useBookingClashGuard() {
  const client = useApolloClient();
  const [pods, setPods] = useState<PodBookingClash[]>([]);
  const resolver = useRef<((go: boolean) => void) | null>(null);

  const answer = useCallback((go: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setPods([]);
    resolve?.(go);
  }, []);

  const check = useCallback(
    async (podIds: readonly string[]): Promise<boolean> => {
      if (podIds.length === 0) return true;
      let clashing: PodBookingClash[];
      try {
        const res = await client.query<{ myBookingClashes: PodBookingClash[] }>({
          query: MY_BOOKING_CLASHES,
          variables: { pod_doc_ids: podIds },
          fetchPolicy: 'network-only',
        });
        clashing = uniqueClashingPods(res.data?.myBookingClashes ?? []);
      } catch (error) {
        logs.mWeb.warn('pod-details', 'bookingClashGuard', { error, msg: 'clash check failed — booking continues' });
        return true;
      }
      if (clashing.length === 0) return true;
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setPods(clashing);
      });
    },
    [client],
  );

  return { check, pods, answer };
}

export type BookingClashGuard = ReturnType<typeof useBookingClashGuard>;
