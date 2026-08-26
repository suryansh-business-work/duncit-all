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
  venue_commission_pct: 10,
  venue_commission_amount: 49.9,
  venue_receives: 449.1,
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
    // en-IN groups lakhs as 1,25,000 — en-US would print 125,000.
    expect(formatStatementMoney(125000, '₹')).toBe('₹1,25,000.00');
    // Always exactly two decimals, in whatever symbol the caller renders.
    expect(formatStatementMoney(897, '$')).toBe('$897.00');
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
    // Duncit's cut of the HOST's remainder — a real deduction, so it counts.
    expect(platform.lines[1].label).toBe('Duncit Commission @10%');
    expect(platform.lines[1].formula).toBe('₹223.16 × 10% (your remainder)');
    expect(platform.total).toBe(60.33);

    const venue = s.sections.find((sec) => sec.key === 'venue')!;
    expect(venue.lines.map((l) => l.label)).toEqual([
      'Venue Slot Price',
      'Duncit Commission from Venue @10%',
    ]);
    expect(venue.lines[0].formula).toBe('Fixed booked slot price (deducted once per pod)');
    // Charged on the VENUE's ₹499 slot price and already inside it: stated as
    // context, so the section total is the slot price alone.
    expect(venue.lines[1]).toMatchObject({ amount: 49.9, deduction: false });
    expect(venue.lines[1].formula).toBe(
      '₹499.00 × 10% of the slot price above — the venue receives ₹449.10',
    );
    expect(venue.total).toBe(499);
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
  it('keeps the Duncit commission in Platform Charges without a venue', () => {
    const s = buildEarningsStatement(
      {
        ...venueWaterfall,
        venue_amount: 0,
        venue_commission_amount: 0,
        venue_receives: 0,
        host_amount: 722.16,
        host_commission_amount: 72.22,
        host_receives: 649.94,
      },
      { has_venue: false, symbol: '₹' },
    );
    expect(s.sections.map((sec) => sec.key)).toEqual(['taxes', 'platform']);
    const platform = s.sections.find((sec) => sec.key === 'platform')!;
    expect(platform.lines.map((l) => l.label)).toEqual([
      'Platform Fee @5%',
      'Duncit Commission @10%',
    ]);
    expect(platform.lines[1]).toMatchObject({
      key: 'duncit-commission',
      amount: 72.22,
      deduction: true,
    });
    expect(platform.lines[1].formula).toBe('₹722.16 × 10% (your remainder)');
    // The relocated commission counts in Platform Charges: 38.01 + 72.22 is
    // 110.22999999999999 in floating point — the section total must be paise-exact.
    expect(platform.total).toBe(110.23);
    expect(s.total_deductions).toBe(247.06);
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

// A preview never clamps the venue price to the pool (breakdown.math.ts,
// clampVenueToPool=false): the shortfall flows through to the host honestly and
// the engine charges NO commission on a non-positive remainder.
const shortfallWaterfall: EarningsWaterfall = {
  ...venueWaterfall,
  venue_amount: 800,
  venue_commission_amount: 80,
  venue_receives: 720,
  host_amount: -77.84,
  host_commission_amount: 0,
  host_receives: -77.84,
  host_earn_pct: -8.68,
};

const NO_COMMISSION_NOTE = 'No commission — host remainder is not positive';

describe('buildEarningsStatement (non-positive host remainder)', () => {
  it('charges no commission on a venue shortfall and passes the shortfall through whole', () => {
    const s = buildEarningsStatement(shortfallWaterfall, { has_venue: true, symbol: '₹' });
    const platform = s.sections.find((sec) => sec.key === 'platform')!;
    expect(platform.lines.find((l) => l.key === 'duncit-commission')).toMatchObject({
      label: 'Duncit Commission @10%',
      amount: 0,
      formula: NO_COMMISSION_NOTE,
      deduction: true,
    });
    // The venue is unaffected by the host's shortfall: it keeps its full price,
    // and Duncit's 10% of it is still charged (and still only context here).
    const venue = s.sections.find((sec) => sec.key === 'venue')!;
    const [slot, commission] = venue.lines;
    expect(slot.amount).toBe(800);
    expect(commission).toMatchObject({ amount: 80, deduction: false });
    // The deductions exceed the collection and the host's payout is the negative
    // remainder — the statement still reconciles.
    expect(venue.total).toBe(800);
    expect(s.total_deductions).toBe(974.84);
    expect(s.net_payout).toEqual({ collection: 897, total_deductions: 974.84, receives: -77.84 });
    expect(s.reconciled).toBe(true);
  });

  it('treats an exactly-zero remainder as not positive (the engine rule is > 0)', () => {
    // Venue price == pool: nothing is left for the host, so nothing is commissioned.
    const s = buildEarningsStatement(
      {
        ...venueWaterfall,
        venue_amount: 722.16,
        venue_commission_amount: 72.22,
        venue_receives: 649.94,
        host_amount: 0,
        host_commission_amount: 0,
        host_receives: 0,
        host_earn_pct: 0,
      },
      { has_venue: true, symbol: '₹' },
    );
    const commission = s.sections
      .flatMap((sec) => sec.lines)
      .find((l) => l.key === 'duncit-commission')!;
    expect(commission.formula).toBe(NO_COMMISSION_NOTE);
    expect(commission.amount).toBe(0);
    expect(s.net_payout.receives).toBe(0);
    expect(s.total_deductions).toBe(897);
    expect(s.reconciled).toBe(true);
  });

  it('keeps the no-commission note when the commission line sits under Platform Charges', () => {
    // No venue, but the club takes the whole pool (the engine clamps the club cut
    // to the pool): the host remainder is 0, so the platform-side commission is 0.
    const s = buildEarningsStatement(
      {
        ...venueWaterfall,
        venue_amount: 0,
        venue_commission_amount: 0,
        venue_receives: 0,
        club_admin_pct: 100,
        club_admin_amount: 722.16,
        host_amount: 0,
        host_commission_amount: 0,
        host_receives: 0,
        host_earn_pct: 0,
      },
      { has_venue: false, symbol: '₹' },
    );
    expect(s.sections.map((sec) => sec.key)).toEqual(['taxes', 'platform', 'club']);
    const platform = s.sections.find((sec) => sec.key === 'platform')!;
    const commission = platform.lines.find((l) => l.key === 'duncit-commission')!;
    expect(commission).toMatchObject({
      label: 'Duncit Commission @10%',
      amount: 0,
      formula: NO_COMMISSION_NOTE,
    });
    // Platform Charges total is the fee alone once the commission is zero.
    expect(platform.total).toBe(38.01);
    expect(s.reconciled).toBe(true);
  });
});

describe('buildEarningsStatement (layout, symbol & tolerance)', () => {
  it('orders the sections Taxes → Platform → Club → Venue when every group applies', () => {
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
    expect(s.sections.map((sec) => sec.key)).toEqual(['taxes', 'platform', 'club', 'venue']);
    expect(s.sections.map((sec) => sec.title)).toEqual([
      'Taxes',
      'Platform Charges',
      'Club Charges',
      'Venue Charges',
    ]);
  });

  it('omits Club Charges entirely when the club takes no cut', () => {
    // club_admin_amount is 0 in the canonical fixture: no empty "@0%" section,
    // and the remaining groups keep their order around the gap.
    expect(statement().sections.map((sec) => sec.key)).toEqual(['taxes', 'platform', 'venue']);
  });

  it('gates Club Charges on the rupee amount, not the configured rate', () => {
    // A free pod with a 3% club cut configured: every server line is ₹0, so there
    // is no club section (and no commission) to show, yet the statement still
    // reconciles to a ₹0 payout.
    const free = buildEarningsStatement(
      {
        ...venueWaterfall,
        amount: 0,
        gst_amount: 0,
        net_amount: 0,
        platform_fee_amount: 0,
        pool_amount: 0,
        club_admin_pct: 3,
        club_admin_amount: 0,
        venue_amount: 0,
        venue_commission_amount: 0,
        venue_receives: 0,
        host_amount: 0,
        host_commission_amount: 0,
        host_receives: 0,
        host_earn_pct: 0,
      },
      { has_venue: false, symbol: '₹' },
    );
    expect(free.sections.map((sec) => sec.key)).toEqual(['taxes', 'platform']);
    expect(free.sections.map((sec) => sec.total)).toEqual([0, 0]);
    expect(free.net_payout).toEqual({ collection: 0, total_deductions: 0, receives: 0 });
    expect(free.reconciled).toBe(true);
  });

  it('renders every money figure in the caller\'s currency symbol', () => {
    const s = buildEarningsStatement(venueWaterfall, { has_venue: true, symbol: '$' });
    expect(s.collection).toEqual({
      label: 'Total collection',
      amount: 897,
      included_gst_note: 'Includes GST $136.83 — prices are GST-inclusive',
    });
    const formulas = s.sections.flatMap((sec) => sec.lines.map((l) => l.formula));
    expect(formulas).toContain('$897.00 − $136.83 GST (prices are GST-inclusive)');
    expect(formulas).toContain('$223.16 × 10% (your remainder)');
    expect(formulas.some((f) => f.includes('₹'))).toBe(false);
  });

  it('keys every row with a stable, unique render key that names its placement', () => {
    // Both surfaces use these as React keys, so the list is a contract: the two
    // commissions are separate rows with separate keys — `duncit-commission`
    // (the host's, always under Platform Charges) and `venue-commission` (the
    // venue's, only when a slot is attached) — and no row moves between
    // sections when a venue comes or goes.
    const withVenue = buildEarningsStatement(
      { ...venueWaterfall, club_admin_pct: 3, club_admin_amount: 21.66 },
      { has_venue: true, symbol: '₹' },
    );
    expect(withVenue.sections.flatMap((sec) => sec.lines.map((l) => l.key))).toEqual([
      'taxable',
      'gst',
      'platform-fee',
      'duncit-commission',
      'club-admin',
      'venue-slot',
      'venue-commission',
    ]);
    const withoutVenue = buildEarningsStatement(venueWaterfall, { has_venue: false, symbol: '₹' });
    expect(withoutVenue.sections.flatMap((sec) => sec.lines.map((l) => l.key))).toEqual([
      'taxable',
      'gst',
      'platform-fee',
      'duncit-commission',
    ]);
  });

  it('tolerates up to 2 paise of float noise between sections and the server total', () => {
    // Sections sum to 696.16; the server total is 897 − host_receives.
    const within = buildEarningsStatement(
      { ...venueWaterfall, host_receives: 200.82 },
      { has_venue: true, symbol: '₹' },
    );
    expect(within.total_deductions).toBe(696.18);
    expect(within.reconciled).toBe(true);

    const beyond = buildEarningsStatement(
      { ...venueWaterfall, host_receives: 200.81 },
      { has_venue: true, symbol: '₹' },
    );
    expect(beyond.total_deductions).toBe(696.19);
    expect(beyond.reconciled).toBe(false);
  });

  it('never reconciles a waterfall whose amount is not a number', () => {
    const s = buildEarningsStatement(
      { ...venueWaterfall, amount: Number.NaN },
      { has_venue: true, symbol: '₹' },
    );
    expect(Number.isNaN(s.total_deductions)).toBe(true);
    expect(s.reconciled).toBe(false);
  });
});
