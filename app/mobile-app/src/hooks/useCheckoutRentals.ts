import { useEffect, useMemo, useState } from 'react';
import { checkoutRentalLines } from '@duncit/utils';

import { usePodRentals } from '@/hooks/usePodRentals';
import { usePodRentalPicks } from '@/stores/rental-picks.store';

interface CheckoutPod {
  id?: string | null;
  venue_id?: string | null;
  pod_mode?: unknown;
  pod_amount?: number | null;
}

/**
 * The rented items riding on this pod checkout: what was picked on Pod
 * Details (only items the venue still lists), their price the server's way,
 * and the guest's agreement to the rental terms. RN twin of mWeb's
 * useCheckoutRentals.
 */
export function useCheckoutRentals(pod: CheckoutPod | null | undefined, paid: boolean) {
  const podId = pod?.id ?? '';
  // Free pods rent too: the rentals are then the whole payment.
  const rentable = Boolean(pod?.venue_id) && String(pod?.pod_mode) !== 'VIRTUAL';
  const rentals = usePodRentals(podId, rentable);
  const { picks, clear } = usePodRentalPicks(podId);
  const [agreed, setAgreed] = useState(false);
  const catalogue = rentable ? rentals.catalogue : null;
  const { totals, selections } = useMemo(
    () => checkoutRentalLines(catalogue, picks),
    [catalogue, picks],
  );

  // A paid booking used its picks: the next visit starts clean.
  useEffect(() => {
    if (paid) clear();
  }, [paid, clear]);

  return {
    selections,
    totals,
    currency: catalogue?.currency_symbol ?? '',
    venueTerms: catalogue?.venue_terms_html ?? '',
    settings: rentals.settings,
    agreed,
    setAgreed,
    /** Picked items wait on the terms. */
    blocked: totals.count > 0 && !agreed,
  };
}

export type CheckoutRentals = ReturnType<typeof useCheckoutRentals>;
