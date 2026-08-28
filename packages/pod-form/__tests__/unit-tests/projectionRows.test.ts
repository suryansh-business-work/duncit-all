import { describe, it, expect } from 'vitest';
import { buildEarningsStatement, type EarningsWaterfall } from '@duncit/utils';
import { projectionRows, type VenueStanding } from '../../src/finance/projectionRows';
import type { Translate } from '../../src/i18n/useTranslation';

// Identity translator: assertions read as the catalogue keys the rows resolve.
const t = ((key: string) => key) as Translate;
const money = (value: number) => `₹${value}`;

/** The server's waterfall for ₹500 × 9 payable spots at default rates. */
const waterfall = (over: Partial<EarningsWaterfall> = {}): EarningsWaterfall => ({
  amount: 4500,
  gst_pct: 18,
  gst_amount: 686.44,
  net_amount: 3813.56,
  platform_fee_pct: 10,
  platform_fee_amount: 381.36,
  pool_amount: 3432.2,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 0,
  venue_commission_pct: 0,
  venue_commission_amount: 0,
  venue_receives: 0,
  host_amount: 3432.2,
  host_commission_pct: 5,
  host_commission_amount: 171.61,
  host_receives: 3260.59,
  host_earn_pct: 72.5,
  ...over,
});

function rows(venue: VenueStanding, productCost = 0, w: EarningsWaterfall = waterfall()) {
  const statement = buildEarningsStatement(w, {
    has_venue: venue === 'slot',
    symbol: '₹',
    t,
  });
  return projectionRows({ statement, waterfall: w, venue, productCost, money, t });
}

const keys = (list: ReturnType<typeof rows>) => list.map((row) => row.key);
const byKey = (list: ReturnType<typeof rows>, key: string) => list.find((row) => row.key === key);

describe('projectionRows', () => {
  it('prints the statement order: collection, deductions, totals, payout', () => {
    const list = rows('slot');
    expect(list[0].kind).toBe('collection');
    expect(list[0].amount).toBe(4500);
    expect(keys(list)).toEqual([
      'collection',
      'gst',
      'platform-fee',
      'duncit-commission',
      'club-admin',
      'venue-slot',
      'total-deductions',
      'payout',
    ]);
    expect(list[list.length - 1].kind).toBe('payout');
  });

  it('names the payout "host receives" on a slot-priced pod with no products', () => {
    const payout = byKey(rows('slot'), 'payout');
    expect(payout?.label).toBe('podForm.priceBreakdown.hostReceives');
    expect(payout?.amount).toBe(3260.59);
  });

  it('deducts attached products and renames the payout the final payout', () => {
    const list = rows('slot', 200);
    const products = byKey(list, 'products');
    expect(products?.amount).toBe(200);
    expect(products?.kind).toBe('deduction');
    expect(products?.formula).toBe('podForm.priceBreakdown.productFormula');
    expect(byKey(list, 'total-deductions')?.amount).toBeCloseTo(1439.41, 2);
    const payout = byKey(list, 'payout');
    expect(payout?.label).toBe('podForm.priceBreakdown.finalPayout');
    expect(payout?.amount).toBeCloseTo(3060.59, 2);
  });

  it('shows an Auto Pod venue as a deduction nobody can price yet', () => {
    const list = rows('pending');
    const venue = byKey(list, 'venue-slot');
    expect(venue?.amount).toBeNull();
    expect(venue?.formula).toBe('podForm.priceBreakdown.venuePending');
    expect(byKey(list, 'payout')?.label).toBe('podForm.priceBreakdown.hostReceivesBeforeVenue');
  });

  it('prompts for the slot on a physical pod that has not picked one', () => {
    const list = rows('unpicked', 150);
    const venue = byKey(list, 'venue-slot');
    expect(venue?.formula).toBe('podForm.priceBreakdown.venueNotPicked');
    // The venue's cut still to come outranks the product rename.
    expect(byKey(list, 'payout')?.label).toBe('podForm.priceBreakdown.hostReceivesBeforeVenue');
  });

  it('carries no venue row at all for a virtual pod', () => {
    expect(keys(rows('none'))).not.toContain('venue-slot');
  });

  it('injects the 0% club-admin row the statement drops, with where its rate is set', () => {
    const injected = byKey(rows('none'), 'club-admin');
    expect(injected?.amount).toBe(0);
    expect(injected?.label).toBe('podForm.priceBreakdown.clubAdminFee');
    expect(injected?.formula).toBe('podForm.priceBreakdown.clubAdminFormula');
  });

  it('keeps the statement club row — never a duplicate — when the rate is real', () => {
    const w = waterfall({
      club_admin_pct: 10,
      club_admin_amount: 343.22,
      host_amount: 3088.98,
      host_commission_amount: 154.45,
      host_receives: 2934.53,
    });
    const list = rows('none', 0, w);
    const clubRows = list.filter((row) => row.key === 'club-admin');
    expect(clubRows).toHaveLength(1);
    expect(clubRows[0].amount).toBe(343.22);
    // The statement's own row carries the server formula, not the injected hint.
    expect(clubRows[0].formula).not.toBe('podForm.priceBreakdown.clubAdminFormula');
  });
});
