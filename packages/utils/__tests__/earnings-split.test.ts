import { describe, expect, it } from 'vitest';
import { buildEarningsSplit } from '../src/earnings-split';
import type { EarningsTranslate, EarningsWaterfall } from '../src/earnings-statement';

/**
 * The shipped `earnings.split.*` templates, mirrored as a fixture (this package
 * cannot import @duncit/i18n) and interpolated the way the real translator
 * does, so a var name drifting from its placeholder shows up as a literal
 * `{name}` left in the row.
 */
const TEMPLATES: Record<string, string> = {
  'earnings.split.venueTitle': 'Venue Take',
  'earnings.split.venueSlotLabel': 'Venue slot price',
  'earnings.split.venueSlotFormula': 'Fixed price the venue set for your slot (once per pod)',
  'earnings.split.lessVenueCommissionLabel': 'Less: Duncit commission from venue @{pct}%',
  'earnings.split.clubTitle': 'Club Admin Take',
  'earnings.split.clubAdminLabel': 'Club admin share @{pct}%',
  'earnings.split.clubAdminFormula': '{pool} (after GST & platform fee) × {pct}%',
  'earnings.split.duncitTitle': 'Duncit Commission & Govt Charges',
  'earnings.split.hostCommissionLabel': 'Commission from host @{pct}%',
  'earnings.split.venueCommissionLabel': 'Commission from venue @{pct}%',
  'earnings.split.gstLabel': 'GST @{pct}% (paid to Govt.)',
  'earnings.split.gstFormula': '{amount} (total collection) × {pct} ÷ {divisor}',
  'earnings.split.platformFeeLabel': 'Platform fee @{pct}%',
  'earnings.split.percentOf': '{base} × {pct}%',
  'earnings.split.yourEarningTitle': 'Your Earning (Host)',
  'earnings.split.hostTitle': 'Host Earning',
  'earnings.split.hostNetLabel': 'You will receive',
  'earnings.split.hostReceivesLabel': 'Host receives',
  'earnings.split.hostNetFormula':
    '{amount} − {venue} venue − {club} club admin − {duncit} Duncit & Govt.',
};

const t: EarningsTranslate = (key, options) =>
  (TEMPLATES[key] ?? `<missing ${key}>`).replaceAll(/\{(\w+)\}/g, (match, name: string) =>
    String(options?.vars?.[name] ?? match),
  );

// ₹897 collection @ GST 18 / fee 5 / commissions 10, venue slot ₹499 — the
// exact server waterfall for those inputs (same fixture as the statement suite).
const venueWaterfall: EarningsWaterfall = {
  amount: 897,
  gst_pct: 18,
  gst_amount: 136.83,
  net_amount: 760.17,
  platform_fee_pct: 5,
  platform_fee_amount: 38.01,
  pool_amount: 722.16,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 499,
  venue_commission_pct: 10,
  venue_commission_amount: 49.9,
  venue_receives: 449.1,
  host_amount: 223.16,
  host_commission_pct: 10,
  host_commission_amount: 22.32,
  host_receives: 200.84,
  host_earn_pct: 22.39,
};

// The staging waterfall for ₹499 × 19 paying seats, no venue, club admin 3%.
const clubWaterfall: EarningsWaterfall = {
  amount: 9481,
  gst_pct: 18,
  gst_amount: 1446.25,
  net_amount: 8034.75,
  platform_fee_pct: 5,
  platform_fee_amount: 401.74,
  pool_amount: 7633.01,
  club_admin_pct: 3,
  club_admin_amount: 228.99,
  venue_amount: 0,
  venue_commission_pct: 0,
  venue_commission_amount: 0,
  venue_receives: 0,
  host_amount: 7404.02,
  host_commission_pct: 10,
  host_commission_amount: 740.4,
  host_receives: 6663.62,
  host_earn_pct: 70.28,
};

const split = (w: EarningsWaterfall) => buildEarningsSplit(w, { symbol: '₹', t, viewer: 'host' });
const bucket = (w: EarningsWaterfall, key: string) => {
  const found = split(w).buckets.find((b) => b.key === key);
  if (!found) throw new Error(`no ${key} bucket`);
  return found;
};

describe('buildEarningsSplit', () => {
  it('leads with the host’s earning, then venue, club and Duncit & govt', () => {
    const result = split(venueWaterfall);
    expect(result.collection).toBe(897);
    expect(result.buckets.map((b) => [b.key, b.title, b.amount])).toEqual([
      ['host', 'Your Earning (Host)', 200.84],
      ['venue', 'Venue Take', 449.1],
      ['club', 'Club Admin Take', 0],
      // GST 136.83 + platform fee 38.01 + host commission 22.32 + venue commission 49.9
      ['duncit', 'Duncit Commission & Govt Charges', 247.06],
    ]);
  });

  it('adds the four buckets back to the collection exactly (the engine invariant)', () => {
    for (const w of [venueWaterfall, clubWaterfall]) {
      const result = split(w);
      const sum = result.buckets.reduce((total, b) => total + b.amount, 0);
      expect(Math.round(sum * 100) / 100).toBe(w.amount);
      expect(result.reconciled).toBe(true);
    }
  });

  it('states each bucket as a share of the collection, to two decimals', () => {
    expect(split(venueWaterfall).buckets.map((b) => b.share_pct)).toEqual([
      22.39, 50.07, 0, 27.54,
    ]);
    expect(split(clubWaterfall).buckets.map((b) => b.share_pct)).toEqual([70.28, 0, 2.42, 27.3]);
  });

  it('gives the venue what it keeps — slot price less Duncit’s venue commission', () => {
    const venue = bucket(venueWaterfall, 'venue');
    expect(venue.lines).toEqual([
      {
        key: 'venue-slot',
        label: 'Venue slot price',
        amount: 499,
        formula: 'Fixed price the venue set for your slot (once per pod)',
      },
      {
        key: 'venue-commission',
        label: 'Less: Duncit commission from venue @10%',
        amount: 49.9,
        formula: '₹499.00 × 10%',
      },
    ]);
    expect(venue.lines[0].amount - venue.lines[1].amount).toBeCloseTo(venue.amount, 2);
  });

  it('itemises Duncit’s bucket: both commissions, GST and the platform fee', () => {
    const duncit = bucket(venueWaterfall, 'duncit');
    expect(duncit.lines.map((l) => [l.label, l.amount, l.formula])).toEqual([
      ['Commission from host @10%', 22.32, '₹223.16 × 10%'],
      ['Commission from venue @10%', 49.9, '₹499.00 × 10%'],
      ['GST @18% (paid to Govt.)', 136.83, '₹897.00 (total collection) × 18 ÷ 118'],
      ['Platform fee @5%', 38.01, '₹760.17 × 5%'],
    ]);
    const lineSum = duncit.lines.reduce((total, l) => total + l.amount, 0);
    expect(Math.round(lineSum * 100) / 100).toBe(duncit.amount);
  });

  it('quotes the club admin cut on the pool left after GST and the platform fee', () => {
    expect(bucket(clubWaterfall, 'club').lines).toEqual([
      {
        key: 'club-admin',
        label: 'Club admin share @3%',
        amount: 228.99,
        formula: '₹7,633.01 (after GST & platform fee) × 3%',
      },
    ]);
  });

  it('shows the host payout as the collection less the other three buckets', () => {
    expect(bucket(clubWaterfall, 'host').lines).toEqual([
      {
        key: 'host-net',
        label: 'You will receive',
        amount: 6663.62,
        formula: '₹9,481.00 − ₹0.00 venue − ₹228.99 club admin − ₹2,588.39 Duncit & Govt.',
      },
    ]);
  });

  it('names the host’s bucket in the third person for a portal reader', () => {
    const staff = buildEarningsSplit(clubWaterfall, { symbol: '₹', t, viewer: 'staff' });
    expect(staff.buckets[0]).toMatchObject({ key: 'host', title: 'Host Earning', amount: 6663.62 });
    expect(staff.buckets[0].lines[0].label).toBe('Host receives');
    // Same money either way — only the wording follows the reader.
    expect(staff.buckets.map((b) => b.amount)).toEqual(
      split(clubWaterfall).buckets.map((b) => b.amount),
    );
  });

  it('never quotes a negative base for the host commission when the venue overruns', () => {
    // The pool cannot cover the slot: the engine charges no host commission and
    // the host side goes negative honestly.
    const shortfall: EarningsWaterfall = {
      ...venueWaterfall,
      venue_amount: 800,
      venue_commission_amount: 80,
      venue_receives: 720,
      host_amount: -77.84,
      host_commission_amount: 0,
      host_receives: -77.84,
      host_earn_pct: -8.68,
    };
    const result = split(shortfall);
    expect(bucket(shortfall, 'duncit').lines[0]).toMatchObject({
      amount: 0,
      formula: '₹0.00 × 10%',
    });
    expect(bucket(shortfall, 'host').amount).toBe(-77.84);
    expect(bucket(shortfall, 'host').share_pct).toBe(-8.68);
    expect(result.reconciled).toBe(true);
  });

  it('reports a 0% share for every bucket when nothing has been collected', () => {
    const empty: EarningsWaterfall = {
      ...venueWaterfall,
      amount: 0,
      gst_amount: 0,
      net_amount: 0,
      platform_fee_amount: 0,
      pool_amount: 0,
      venue_amount: 0,
      venue_commission_amount: 0,
      venue_receives: 0,
      host_amount: 0,
      host_commission_amount: 0,
      host_receives: 0,
      host_earn_pct: 0,
    };
    const result = split(empty);
    expect(result.buckets.map((b) => b.share_pct)).toEqual([0, 0, 0, 0]);
    expect(result.reconciled).toBe(true);
  });

  it('flags a waterfall whose buckets do not add back to the collection', () => {
    // A club cut the payout was never reduced by: the split over-states by it.
    const drifted = { ...venueWaterfall, club_admin_pct: 10, club_admin_amount: 72.22 };
    expect(split(drifted).reconciled).toBe(false);
  });

  it('tolerates paise-level float noise without flagging it', () => {
    const noisy = { ...venueWaterfall, host_receives: 200.85 };
    expect(split(noisy).reconciled).toBe(true);
  });
});
