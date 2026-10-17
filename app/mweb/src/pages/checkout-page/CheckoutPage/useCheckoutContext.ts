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
}

/** The search param a booking of several dates of a recurring pod carries them in. */
export const CHECKOUT_DATES_PARAM = 'dates';

/**
 * Everything a pod checkout reads before it knows its bill: the pod, the
 * buyer's session, the seats and — for a recurring pod — the dates being
 * booked together. Shared by the one-date and the several-dates checkout so
 * the two differ only in how the bill is priced.
 */
export function useCheckoutContext() {
  const { podId = '' } = useParams();
  const location = useLocation();
  const state = (location.state || {}) as CheckoutState;
  const search = new URLSearchParams(location.search);
  const checkoutPodId = podId || state.pod_id || search.get('pod_id') || '';
  // Several dates of a recurring pod, booked in one go: the pod id is then the
  // recurring pod's, and each date is paid for on its own.
  const dateIds = (search.get(CHECKOUT_DATES_PARAM) ?? '').split(',').filter(Boolean);
  const recurring = dateIds.length > 1;

  const { data: podData, loading: podLoading, error: podError } = useQuery<{ pod?: CheckoutPodRecord | null }>(CHECKOUT_POD, {
    variables: { id: checkoutPodId },
    skip: !checkoutPodId,
    fetchPolicy: 'cache-and-network',
  });
  const session = useCheckoutSession({ couponPodId: checkoutPodId || null });
  const pod = podData?.pod;
  // Rented items belong to one date, so a booking of several dates rents none.
  const rentals = useCheckoutRentals(recurring ? null : pod, Boolean(session.success));
  // Seats ride in from Pod Details. The ticket price multiplies; the server
  // re-prices and re-checks capacity, so this is a preview, never the charge.
  const seats = Math.max(1, Number(state.seats ?? search.get('seats') ?? 1) || 1);
  const linkTotal = Number(state.amount ?? search.get('amount') ?? 0);

  return {
    state,
    search,
    checkoutPodId,
    dateIds: recurring ? dateIds : [],
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
