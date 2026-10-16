import { useEffect, useMemo, useState } from 'react';
import { checkoutRentalLines } from '@duncit/utils';
import { usePodRentalPicks } from './usePodRentalPicks';
import { usePodRentals } from './usePodRentals';

interface CheckoutPod {
  id?: string;
  venue_id?: string | null;
  pod_mode?: string | null;
  pod_amount?: number | null;
}

/**
 * The rented items riding on this pod checkout: what was picked on Pod
 * Details (only items the venue still lists), their price the server's way,
 * and the guest's agreement to the rental terms. The server prices them again
 * and refuses anything gone; this is the preview and the request.
 */
export function useCheckoutRentals(pod: CheckoutPod | null | undefined, paid: boolean) {
  // Free pods rent too: the rentals are then the whole payment.
  const rentable = Boolean(pod?.venue_id) && pod?.pod_mode !== 'VIRTUAL';
  const rentals = usePodRentals(pod?.id, rentable);
  const { picks, clear } = usePodRentalPicks(pod?.id);
  const [agreed, setAgreed] = useState(false);
  const catalogue = rentable ? rentals.catalogue : null;
  const { totals, selections } = useMemo(() => checkoutRentalLines(catalogue, picks), [catalogue, picks]);

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
