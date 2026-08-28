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
    { key: 'host', label: labels.shareYouReceive, value: w.host_receives, strong: true },
    { key: 'duncit', label: labels.shareDuncitRevenue, value: w.duncit_revenue },
  ];
}
