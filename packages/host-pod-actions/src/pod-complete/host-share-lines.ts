import type { WaterfallLine } from '@duncit/ui';
import type { HostPodActionLabels } from '../labels';
import type { PodSettlement } from '../types';

/**
 * The waterfall as the HOST reads it.
 *
 * `@duncit/ui`'s buildWaterfallLines writes the same numbers for staff — "Host
 * receives", venue commission spelled out — which is the right voice in the
 * Admin and Finance consoles and the wrong one on the screen where a host is
 * completing their own pod. Same engine, same order, host's words.
 *
 * The first line is the waterfall's own `amount`: the settlement basis, which
 * is the money from the seats that were SCANNED IN. What was collected from
 * seats nobody scanned is called out separately by the caller, because folding
 * it into "Customer Paid" would make every line below it fail to add up.
 */
export function buildHostShareLines(
  settlement: PodSettlement,
  labels: HostPodActionLabels,
): WaterfallLine[] {
  const w = settlement.waterfall;
  const venueLines: WaterfallLine[] = settlement.has_venue
    ? [
        { key: 'venue', label: labels.shareVenueSlot, value: w.venue_amount },
        { key: 'venue-receives', label: labels.shareVenueReceives, value: w.venue_receives },
      ]
    : [];
  return [
    { key: 'paid', label: labels.sharePaid, value: w.amount },
    { key: 'gst', label: labels.shareGst(w.gst_pct), value: w.gst_amount },
    {
      key: 'fee',
      label: labels.sharePlatformFee(w.platform_fee_pct),
      value: w.platform_fee_amount,
    },
    { key: 'pool', label: labels.sharePool, value: w.pool_amount },
    ...venueLines,
    // `host_payout_amount`, not `w.host_receives`: it is the number the release
    // will actually carry — the same figure floored at zero on a thin pod and
    // zeroed outright once the completion window has expired — so the line a
    // host reads here and the money that lands in their wallet cannot differ.
    {
      key: 'host',
      label: labels.shareYouReceive,
      value: settlement.host_payout_amount,
      strong: true,
    },
    { key: 'duncit', label: labels.shareDuncitRevenue, value: w.duncit_revenue },
  ];
}
