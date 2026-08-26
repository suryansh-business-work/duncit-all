import { gql, useQuery } from '@apollo/client';
import { useDebouncedValue } from '@duncit/ui';
import type { EarningsWaterfall } from '@duncit/utils';

/**
 * The admin consoles' earnings projection. The server bills the PAYABLE spots
 * (total − 1, the host's own seat is free), prices at the chosen host's rates
 * — or the platform defaults with no host chosen, which is what an Auto Pod
 * template is judged on — and reads the venue's money from the slot itself.
 * No money math happens on this side.
 */
export const ADMIN_POTENTIAL_POD_EARNINGS = gql`
  query AdminPotentialPodEarnings(
    $pod_amount: Float!
    $no_of_spots: Int!
    $host_user_id: ID
    $venue_id: ID
    $venue_slot_id: ID
  ) {
    adminPotentialPodEarnings(
      pod_amount: $pod_amount
      no_of_spots: $no_of_spots
      host_user_id: $host_user_id
      venue_id: $venue_id
      venue_slot_id: $venue_slot_id
    ) {
      total_spots
      payable_spots
      venue_budget
      waterfall {
        amount
        gst_pct
        gst_amount
        net_amount
        platform_fee_pct
        platform_fee_amount
        pool_amount
        club_admin_pct
        club_admin_amount
        venue_amount
        venue_commission_pct
        venue_commission_amount
        venue_receives
        host_amount
        host_commission_pct
        host_commission_amount
        host_receives
        host_earn_pct
      }
    }
  }
`;

export interface EarningsProjection {
  total_spots: number;
  payable_spots: number;
  /** The highest venue slot price this pod can still carry. */
  venue_budget: number;
  waterfall: EarningsWaterfall;
}

export interface EarningsProjectionInput {
  podAmount: number;
  noOfSpots: number;
  /** The host picked in the editor; null prices at the platform's default rates. */
  hostUserId: string | null;
  venueId: string | null;
  venueSlotId: string | null;
}

export interface EarningsProjectionState {
  projection: EarningsProjection | undefined;
  loading: boolean;
  /** The typed inputs have moved on from the ones the projection answers. */
  stale: boolean;
  /** Nothing to project yet: no price, or only the host's own free seat. */
  idle: boolean;
}

// Typing a price fires one request after the keys stop, not one per key.
const DEBOUNCE_MS = 400;

/** The server projection for the numbers on the form, debounced on the two
 * that are typed (price and spots); the ids change by a pick, not a key. */
export function useEarningsProjection(input: Readonly<EarningsProjectionInput>): EarningsProjectionState {
  const podAmount = useDebouncedValue(input.podAmount, DEBOUNCE_MS);
  const noOfSpots = useDebouncedValue(input.noOfSpots, DEBOUNCE_MS);
  // A 1-spot pod is the host's own free seat — there is nothing to bill.
  const idle = podAmount <= 0 || noOfSpots <= 1;
  const { data, loading } = useQuery<{ adminPotentialPodEarnings: EarningsProjection }>(
    ADMIN_POTENTIAL_POD_EARNINGS,
    {
      variables: {
        pod_amount: podAmount,
        no_of_spots: noOfSpots,
        host_user_id: input.hostUserId,
        venue_id: input.venueId,
        venue_slot_id: input.venueSlotId,
      },
      skip: idle,
      fetchPolicy: 'cache-and-network',
    },
  );
  return {
    projection: data?.adminPotentialPodEarnings,
    loading,
    stale: podAmount !== input.podAmount || noOfSpots !== input.noOfSpots,
    idle,
  };
}
