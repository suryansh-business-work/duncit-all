/** GST-inclusive money waterfall for one pod (finance engine v2). */
export interface PodFinanceWaterfall {
  version: number;
  amount: number;
  gst_pct: number;
  gst_amount: number;
  net_amount: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  pool_amount: number;
  venue_amount: number;
  venue_commission_pct: number;
  venue_commission_amount: number;
  venue_receives: number;
  host_amount: number;
  host_commission_pct: number;
  host_commission_amount: number;
  host_receives: number;
  duncit_revenue: number;
  host_earn_pct: number;
}

export interface WaterfallLine {
  key: string;
  label: string;
  value: number;
  secondary?: string;
  strong?: boolean;
}

/**
 * Flattens a waterfall into simple display lines:
 * Customer Paid → − GST → − Platform Fee → Remaining Pool →
 * Venue price (booked slot, when the pod has a venue) →
 * Host receives (remainder − commission) → Duncit revenue.
 */
export function buildWaterfallLines(
  waterfall: PodFinanceWaterfall,
  symbol: string,
  hasVenue: boolean,
  collectedTotal?: number
): WaterfallLine[] {
  const lines: WaterfallLine[] = [
    { key: 'paid', label: 'Customer Paid', value: collectedTotal ?? waterfall.amount },
    { key: 'gst', label: `− GST (${waterfall.gst_pct}%)`, value: waterfall.gst_amount },
    {
      key: 'fee',
      label: `− Platform Fee (${waterfall.platform_fee_pct}%)`,
      value: waterfall.platform_fee_amount,
    },
    { key: 'pool', label: 'Remaining Pool', value: waterfall.pool_amount },
  ];
  if (hasVenue) {
    lines.push({
      key: 'venue',
      label: 'Venue price',
      value: waterfall.venue_amount,
      secondary: `booked slot price − ${waterfall.venue_commission_pct}% commission → venue receives ${symbol}${waterfall.venue_receives.toFixed(2)}`,
    });
  }
  lines.push(
    {
      key: 'host',
      label: 'Host receives',
      value: waterfall.host_receives,
      strong: true,
      secondary: `remainder − ${waterfall.host_commission_pct}% commission`,
    },
    { key: 'duncit', label: 'Duncit revenue', value: waterfall.duncit_revenue }
  );
  return lines;
}
