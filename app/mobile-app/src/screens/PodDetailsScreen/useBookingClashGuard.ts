import { useCallback, useRef, useState } from 'react';
import { uniqueClashingPods, type PodBookingClash } from '@duncit/utils';
import { logs } from '@duncit/logs';

import { MyBookingClashesDocument } from '@/graphql/pod-booking-clash';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * Asks, just before a booking, whether the member already holds a spot on a
 * pod at the same time — and if so, lets them choose: Force book (resolves
 * true) or Cancel booking (false). Advisory only: a check that cannot run
 * never stands between the member and their booking.
 * mWeb twin: pages/pod-details-page/clash/useBookingClashGuard.
 */
export function useBookingClashGuard() {
  const [pods, setPods] = useState<PodBookingClash[]>([]);
  const resolver = useRef<((go: boolean) => void) | null>(null);

  const answer = useCallback((go: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setPods([]);
    resolve?.(go);
  }, []);

  const check = useCallback(async (podIds: readonly string[]): Promise<boolean> => {
    if (podIds.length === 0) return true;
    let clashing: PodBookingClash[];
    try {
      const data = await graphqlRequest(
        MyBookingClashesDocument,
        { pod_doc_ids: [...podIds] },
        { auth: true },
      );
      clashing = uniqueClashingPods(data.myBookingClashes);
    } catch (error) {
      logs.mobileApp.warn('pod-details', 'bookingClashGuard', {
        error,
        msg: 'clash check failed — booking continues',
      });
      return true;
    }
    if (clashing.length === 0) return true;
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setPods(clashing);
    });
  }, []);

  return { check, pods, answer };
}

export type BookingClashGuard = ReturnType<typeof useBookingClashGuard>;
