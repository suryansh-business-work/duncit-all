import { useMemo } from 'react';
import type { PodProfitInputs, PodProfitResults } from './types';

const toPaise = (rupees: number) => Math.round(Math.max(0, rupees) * 100);
const toRupees = (paise: number) => paise / 100;
const clampPercent = (value: number) => Math.min(Math.max(value, 0), 100);

/**
 * Calculator math — a faithful mirror of the server finance engine
 * (`server/src/modules/finance/finance/breakdown.math.ts`) so the estimate
 * always agrees with real pod payouts.
 *
 * The waterfall runs on the FULL collection (ticket price × no. of spots, both
 * GST-inclusive) — exactly how a pod settles: GST is extracted from the
 * collection (`P × g/(100+g)`); the platform fee applies to the net; the venue
 * takes its fixed booked slot price out of the remaining pool ONCE per pod
 * (clamped so the host can never go negative); the host keeps the remainder.
 * Duncit's commission comes out of each side, and duncit_revenue = platform
 * fee + both commissions.
 *
 * All arithmetic runs on paise integers with half-up rounding per line so the
 * invariant holds exactly: gst + host_receives + venue_receives + duncit = amount.
 */
export function useCalculator(inputs: PodProfitInputs): PodProfitResults {
  return useMemo(() => {
    const spots = Math.max(0, Math.round(inputs.no_of_spots));
    const amount = toPaise(inputs.pod_amount) * spots;
    const gstPct = clampPercent(inputs.gst_percent);
    const feePct = clampPercent(inputs.platform_fee_percent);
    const hostPct = clampPercent(inputs.host_commission_percent);
    const venuePct = clampPercent(inputs.venue_commission_percent);

    const gst = Math.round((amount * gstPct) / (100 + gstPct));
    const net = amount - gst;
    const fee = Math.round((net * feePct) / 100);
    const pool = net - fee;
    const venueAmount = Math.min(toPaise(inputs.venue_amount), pool);
    const hostAmount = pool - venueAmount;
    const venueCommission = Math.round((venueAmount * venuePct) / 100);
    const hostCommission = Math.round((hostAmount * hostPct) / 100);
    const venueReceives = venueAmount - venueCommission;
    const hostReceives = hostAmount - hostCommission;
    const duncitRevenue = fee + hostCommission + venueCommission;
    const hostEarn = amount === 0 ? 0 : Math.round((hostReceives / amount) * 10000) / 100;

    return {
      collection_total: toRupees(amount),
      gst_amount: toRupees(gst),
      net_amount: toRupees(net),
      platform_fee_amount: toRupees(fee),
      pool_amount: toRupees(pool),
      venue_amount: toRupees(venueAmount),
      venue_commission_amount: toRupees(venueCommission),
      venue_receives: toRupees(venueReceives),
      host_amount: toRupees(hostAmount),
      host_commission_amount: toRupees(hostCommission),
      host_receives: toRupees(hostReceives),
      duncit_revenue_total: toRupees(duncitRevenue),
      host_earn_percent: hostEarn,
      reconciled_total: toRupees(gst + hostReceives + venueReceives + duncitRevenue),
    };
  }, [inputs]);
}
