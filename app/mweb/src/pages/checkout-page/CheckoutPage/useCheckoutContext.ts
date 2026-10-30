import { useLocation, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { CHECKOUT_POD, type CheckoutState } from '../queries';
import { useCheckoutSession } from '../useCheckoutSession';
import { useCheckoutRentals } from '../../pod-rent/useCheckoutRentals';

/** The pod fields the checkout reads off CHECKOUT_POD (the rest ride along for the summary). */
export interface CheckoutPodRecord {
  id: string;
  pod_title?: string | null;
  pod_amount?: number | null;
  pod_mode?: string | null;
  venue_id?: string | null;
  pod_date_time?: string | null;
  ticket_discount_enabled?: boolean | null;
  ticket_discount_tiers?: { min_tickets: number; discount_pct: number }[] | null;
  /** Whether to read the member's Smart Incentive at all (usePodCheckoutBill). */
  smart_incentive_enabled?: boolean | null;
}

/**
 * Everything a pod checkout reads before it knows its bill: the pod, the
 * buyer's session and the seats.
 */
export function useCheckoutContext() {
  const { podId = '' } = useParams();
  const location = useLocation();
  const state = (location.state || {}) as CheckoutState;
  const search = new URLSearchParams(location.search);
  const checkoutPodId = podId || state.pod_id || search.get('pod_id') || '';

  const { data: podData, loading: podLoading, error: podError } = useQuery<{ pod?: CheckoutPodRecord | null }>(CHECKOUT_POD, {
    variables: { id: checkoutPodId },
    skip: !checkoutPodId,
    fetchPolicy: 'cache-and-network',
  });
  const session = useCheckoutSession({ couponPodId: checkoutPodId || null });
  const pod = podData?.pod;
  const rentals = useCheckoutRentals(pod, Boolean(session.success));
  // Seats ride in from Pod Details. The ticket price multiplies; the server
  // re-prices and re-checks capacity, so this is a preview, never the charge.
  const seats = Math.max(1, Number(state.seats ?? search.get('seats') ?? 1) || 1);
  const linkTotal = Number(state.amount ?? search.get('amount') ?? 0);

  return {
    state,
    search,
    checkoutPodId,
    pod,
    podLoading,
    podError,
    session,
    rentals,
    seats,
    linkTotal,
  };
}

export type CheckoutContext = ReturnType<typeof useCheckoutContext>;
