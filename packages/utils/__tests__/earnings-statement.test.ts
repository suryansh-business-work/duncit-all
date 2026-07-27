import { describe, expect, it } from 'vitest';
import {
  buildEarningsStatement,
  formatStatementMoney,
  type EarningsWaterfall,
} from '../src/earnings-statement';

// The user's canonical example: ₹897 collection @ GST 18 / fee 5 / commission 10,
// venue slot ₹499 — the exact server waterfall for those inputs.
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
  host_amount: 223.16,
  host_commission_pct: 10,
  host_commission_amount: 22.32,
  host_receives: 200.84,
  host_earn_pct: 22.39,
};

const statement = () => buildEarningsStatement(venueWaterfall, { has_venue: true, symbol: '₹' });

describe('formatStatementMoney', () => {
  it('formats ₹X,XXX.XX with en-IN grouping', () => {
    expect(formatStatementMoney(29000, '₹')).toBe('₹29,000.00');
    expect(formatStatementMoney(136.83, '₹')).toBe('₹136.83');
  });
});

describe('buildEarningsStatement (venue pod)', () => {
  it('shows the GST taxable base and the exact formula', () => {
    const taxes = statement().sections.find((s) => s.key === 'taxes')!;
    const [taxable, gst] = taxes.lines;
    expect(taxable).toMatchObject({
      label: 'Taxable Amount',
      amount: 760.17,
      deduction: false,
    });
    expect(taxable.formula).toBe('₹897.00 − ₹136.83 GST (prices are GST-inclusive)');
    expect(gst).toMatchObject({ label: 'GST @18%', amount: 136.83, deduction: true });
    expect(gst.formula).toBe('₹760.17 × 18%');
    // The taxable base is context, never a deduction: section total = GST only.
    expect(taxes.total).toBe(136.83);
  });

  it('gives every charge its base, rate and formula from server values', () => {
    const s = statement();
    const platform = s.sections.find((sec) => sec.key === 'platform')!;
    expect(platform.lines[0].label).toBe('Platform Fee @5%');
    expect(platform.lines[0].formula).toBe('₹760.17 × 5%');
    expect(platform.total).toBe(38.01);

    const venue = s.sections.find((sec) => sec.key === 'venue')!;
    expect(venue.lines.map((l) => l.label)).toEqual([
      'Venue Slot Price',
      'Duncit Commission from Venue @10%',
    ]);
    expect(venue.lines[0].formula).toBe('Fixed booked slot price (deducted once per pod)');
    expect(venue.lines[1].formula).toBe('₹223.16 × 10% (your remainder)');
    expect(venue.total).toBe(521.32);
  });

  it('reconciles: line sums == section totals, sections == deductions, net payout exact', () => {
    const s = statement();
    for (const section of s.sections) {
      const lineSum = section.lines
        .filter((line) => line.deduction)
        .reduce((total, line) => total + line.amount, 0);
      expect(Math.abs(lineSum - section.total)).toBeLessThanOrEqual(0.02);
    }
    const sectionsTotal = s.sections.reduce((total, section) => total + section.total, 0);
    expect(Math.abs(sectionsTotal - s.total_deductions)).toBeLessThanOrEqual(0.02);
    expect(s.total_deductions).toBe(696.16);
    expect(s.net_payout).toEqual({ collection: 897, total_deductions: 696.16, receives: 200.84 });
    expect(s.reconciled).toBe(true);
  });

  it('discloses the GST included in the collection', () => {
    expect(statement().collection.included_gst_note).toBe(
      'Includes GST ₹136.83 — prices are GST-inclusive',
    );
  });

  it('flags a statement that does not reconcile', () => {
    const broken = buildEarningsStatement(
      { ...venueWaterfall, host_receives: 300 },
      { has_venue: true, symbol: '₹' },
    );
    expect(broken.reconciled).toBe(false);
  });
});

describe('buildEarningsStatement (no venue / club cut)', () => {
  it('moves the Duncit commission into Platform Charges without a venue', () => {
    const s = buildEarningsStatement(
      { ...venueWaterfall, venue_amount: 0, host_amount: 722.16, host_commission_amount: 72.22, host_receives: 649.94 },
      { has_venue: false, symbol: '₹' },
    );
    expect(s.sections.map((sec) => sec.key)).toEqual(['taxes', 'platform']);
    const platform = s.sections.find((sec) => sec.key === 'platform')!;
    expect(platform.lines.map((l) => l.label)).toEqual([
      'Platform Fee @5%',
      'Duncit Commission @10%',
    ]);
    expect(platform.lines[1].formula).toBe('₹722.16 × 10% (your remainder)');
    expect(s.reconciled).toBe(true);
  });

  it('adds the Club Charges section with the pool as its base', () => {
    // Club cut 3% of the pool 722.16 = 21.66; host side shrinks accordingly.
    const s = buildEarningsStatement(
      {
        ...venueWaterfall,
        club_admin_pct: 3,
        club_admin_amount: 21.66,
        host_amount: 201.5,
        host_commission_amount: 20.15,
        host_receives: 181.35,
      },
      { has_venue: true, symbol: '₹' },
    );
    const club = s.sections.find((sec) => sec.key === 'club')!;
    expect(club.lines[0].label).toBe('Club Admin Fee @3%');
    expect(club.lines[0].formula).toBe('₹722.16 × 3%');
    expect(club.total).toBe(21.66);
    expect(s.reconciled).toBe(true);
  });
});
