/**
 * The one way every surface shows a pod's money — the host's Step 4 and every
 * portal's pod view: who takes what from the total collection, in four buckets
 * that add back to the collection exactly, host first —
 *
 *   Host earning + Venue take + Club admin take + Duncit commission & govt charges
 *     = host_receives + venue_receives + club_admin
 *       + (gst + platform fee + host & venue commission)
 *     = amount
 *
 * which is the server engine's own invariant (breakdown.math.ts). Every figure
 * is read straight off the server waterfall; this module only groups them.
 * The venue's bucket is what the venue KEEPS (slot price − Duncit's venue
 * commission), and that commission sits under Duncit's bucket, so nothing is
 * counted twice.
 */
import type { EarningsTranslate, EarningsWaterfall } from './earnings-statement';
import { formatStatementMoney } from './earnings-statement';

export type EarningsBucketKey = 'venue' | 'club' | 'duncit' | 'host';

export interface EarningsBucketLine {
  key: string;
  label: string;
  amount: number;
  /** Hand-verifiable arithmetic for the row, e.g. "₹7,404.02 × 10%". */
  formula: string;
}

export interface EarningsBucket {
  key: EarningsBucketKey;
  title: string;
  amount: number;
  /** Share of the total collection, 2 decimals (0 when nothing collected). */
  share_pct: number;
  lines: EarningsBucketLine[];
}

export interface EarningsSplit {
  collection: number;
  buckets: EarningsBucket[];
  /** The four buckets add back to the collection (float-noise tolerance). */
  reconciled: boolean;
}

export interface EarningsSplitOptions {
  /** Currency symbol used inside formula strings, e.g. '₹'. */
  symbol: string;
  t: EarningsTranslate;
  /** 'host' = the host reading their own pod ("Your Earning"); 'staff' = a
   * portal reading someone else's ("Host Earning"). */
  viewer: 'host' | 'staff';
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const TOLERANCE = 0.02;

export function buildEarningsSplit(
  w: EarningsWaterfall,
  options: EarningsSplitOptions
): EarningsSplit {
  const { t } = options;
  const isHost = options.viewer === 'host';
  const hostTitle = isHost ? t('earnings.split.yourEarningTitle') : t('earnings.split.hostTitle');
  const hostNetLabel = isHost
    ? t('earnings.split.hostNetLabel')
    : t('earnings.split.hostReceivesLabel');
  const money = (value: number) => formatStatementMoney(value, options.symbol);
  const share = (amount: number) => (w.amount > 0 ? round2((amount / w.amount) * 100) : 0);
  const bucket = (
    key: EarningsBucketKey,
    title: string,
    amount: number,
    lines: EarningsBucketLine[]
  ): EarningsBucket => ({ key, title, amount: round2(amount), share_pct: share(amount), lines });

  const duncitTotal =
    w.gst_amount + w.platform_fee_amount + w.host_commission_amount + w.venue_commission_amount;

  const buckets = [
    bucket('host', hostTitle, w.host_receives, [
      {
        key: 'host-net',
        label: hostNetLabel,
        amount: w.host_receives,
        formula: t('earnings.split.hostNetFormula', {
          vars: {
            amount: money(w.amount),
            venue: money(w.venue_receives),
            club: money(w.club_admin_amount),
            duncit: money(round2(duncitTotal)),
          },
        }),
      },
    ]),
    bucket('venue', t('earnings.split.venueTitle'), w.venue_receives, [
      {
        key: 'venue-slot',
        label: t('earnings.split.venueSlotLabel'),
        amount: w.venue_amount,
        formula: t('earnings.split.venueSlotFormula'),
      },
      {
        key: 'venue-commission',
        label: t('earnings.split.lessVenueCommissionLabel', {
          vars: { pct: w.venue_commission_pct },
        }),
        amount: w.venue_commission_amount,
        formula: t('earnings.split.percentOf', {
          vars: { base: money(w.venue_amount), pct: w.venue_commission_pct },
        }),
      },
    ]),
    bucket('club', t('earnings.split.clubTitle'), w.club_admin_amount, [
      {
        key: 'club-admin',
        label: t('earnings.split.clubAdminLabel', { vars: { pct: w.club_admin_pct } }),
        amount: w.club_admin_amount,
        formula: t('earnings.split.clubAdminFormula', {
          vars: { pool: money(w.pool_amount), pct: w.club_admin_pct },
        }),
      },
    ]),
    bucket('duncit', t('earnings.split.duncitTitle'), duncitTotal, [
      {
        key: 'host-commission',
        label: t('earnings.split.hostCommissionLabel', { vars: { pct: w.host_commission_pct } }),
        amount: w.host_commission_amount,
        formula: t('earnings.split.percentOf', {
          vars: { base: money(Math.max(w.host_amount, 0)), pct: w.host_commission_pct },
        }),
      },
      {
        key: 'venue-commission',
        label: t('earnings.split.venueCommissionLabel', {
          vars: { pct: w.venue_commission_pct },
        }),
        amount: w.venue_commission_amount,
        formula: t('earnings.split.percentOf', {
          vars: { base: money(w.venue_amount), pct: w.venue_commission_pct },
        }),
      },
      {
        key: 'gst',
        label: t('earnings.split.gstLabel', { vars: { pct: w.gst_pct } }),
        amount: w.gst_amount,
        formula: t('earnings.split.gstFormula', {
          vars: { amount: money(w.amount), pct: w.gst_pct, divisor: 100 + w.gst_pct },
        }),
      },
      {
        key: 'platform-fee',
        label: t('earnings.split.platformFeeLabel', { vars: { pct: w.platform_fee_pct } }),
        amount: w.platform_fee_amount,
        formula: t('earnings.split.percentOf', {
          vars: { base: money(w.net_amount), pct: w.platform_fee_pct },
        }),
      },
    ]),
  ];

  const sum = round2(buckets.reduce((total, b) => total + b.amount, 0));
  return {
    collection: w.amount,
    buckets,
    reconciled: Math.abs(sum - w.amount) <= TOLERANCE,
  };
}
