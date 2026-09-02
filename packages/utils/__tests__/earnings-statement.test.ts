import { describe, expect, it } from 'vitest';
import {
  buildEarningsStatement,
  formatStatementMoney,
  type EarningsTranslate,
  type EarningsWaterfall,
} from '../src/earnings-statement';

/**
 * The shipped `earnings.statement.*` templates, as a fixture.
 *
 * This package is dependency-free — it cannot import @duncit/i18n even to
 * test — so the templates are mirrored here and interpolated the way the real
 * translator does. That keeps every assertion below about the ARITHMETIC and
 * the sentence shape: a formula whose var name drifts from the bundle's
 * placeholder shows up as a literal `{net}` left in the row.
 */
const TEMPLATES: Record<string, string> = {
  'earnings.statement.taxesTitle': 'Taxes',
  'earnings.statement.taxableLabel': 'Taxable Amount',
  'earnings.statement.taxableFormula': '{amount} − {gst} GST (prices are GST-inclusive)',
  'earnings.statement.gstLabel': 'GST @{pct}%',
  'earnings.statement.gstFormula': '{amount} (total collection) × {pct} ÷ {divisor}',
  'earnings.statement.platformTitle': 'Platform Charges',
  'earnings.statement.platformFeeLabel': 'Platform Fee @{pct}%',
  'earnings.statement.platformFeeFormula': '{net} × {pct}%',
  'earnings.statement.duncitCommissionLabel': 'Duncit Commission @{pct}%',
  'earnings.statement.commissionFormula': '{host} × {pct}% (your remainder)',
  'earnings.statement.noCommissionFormula': 'No commission — host remainder is not positive',
  'earnings.statement.clubTitle': 'Club Charges',
  'earnings.statement.clubAdminLabel': 'Club Admin Fee @{pct}%',
  'earnings.statement.clubAdminFormula': '{pool} × {pct}%',
  'earnings.statement.venueTitle': 'Venue Charges',
  'earnings.statement.venueSlotLabel': 'Venue Slot Price',
  'earnings.statement.venueSlotFormula': 'Fixed booked slot price (deducted once per pod)',
  'earnings.statement.venueCommissionLabel': 'Duncit Commission from Venue @{pct}%',
  'earnings.statement.venueCommissionFormula':
    '{venue} × {pct}% of the slot price above — the venue receives {receives}',
  'earnings.statement.collectionLabel': 'Total collection',
  'earnings.statement.includedGstNote': 'Includes GST {gst} — prices are GST-inclusive',
  'earnings.statement.taxesDescription': 'GST is a government tax on every ticket sold.',
  'earnings.statement.platformDescription': 'What it costs to put this pod on and pay you.',
  'earnings.statement.clubDescription': 'The club admin’s share for running the club.',
  'earnings.statement.venueDescription': 'The fixed price the venue set for the slot.',
  'earnings.statement.whyThisCharge': 'Why this charge?',
};

const t: EarningsTranslate = (key, options) =>
  (TEMPLATES[key] ?? `<missing ${key}>`).replaceAll(/\{(\w+)\}/g, (match, name: string) =>
    String(options?.vars?.[name] ?? match),
  );

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

const statement = () => buildEarningsStatement(venueWaterfall, { has_venue: true, symbol: '₹', t });

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
    // Quoted on the TOTAL COLLECTION — the only base printed on the panel —
    // rather than the taxable value, which is itself derived: 897 × 18 ÷ 118.
    expect(gst.formula).toBe('₹897.00 (total collection) × 18 ÷ 118');
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
      { has_venue: true, symbol: '₹', t },
    );
    expect(broken.reconciled).toBe(false);
  });
});

describe('buildEarningsStatement (GST is quoted on the total collection)', () => {
  /** The engine's own extraction: gst = P × g / (100 + g). */
  const extract = (collection: number, pct: number) =>
    Math.round(((collection * pct) / (100 + pct)) * 100) / 100;

  it('states the GST row against the collection, and that arithmetic is the server value', () => {
    const gst = statement()
      .sections.find((sec) => sec.key === 'taxes')!
      .lines.find((l) => l.key === 'gst')!;
    expect(gst.formula).toBe('₹897.00 (total collection) × 18 ÷ 118');
    // Reading the row literally has to reproduce the amount printed beside it,
    // which is the whole point of quoting a base the host can see.
    expect(extract(897, 18)).toBe(gst.amount);
    expect(gst.amount).toBe(136.83);
  });

  it('is identical to the old taxable-base form to the paise, at every rate', () => {
    // net × g% === P × g/(100+g) exactly, so restating the base moved no money.
    for (const pct of [0, 5, 12, 18, 28]) {
      const gstAmount = extract(897, pct);
      const netAmount = Math.round((897 - gstAmount) * 100) / 100;
      const s = buildEarningsStatement(
        { ...venueWaterfall, gst_pct: pct, gst_amount: gstAmount, net_amount: netAmount },
        { has_venue: true, symbol: '₹', t },
      );
      const gst = s.sections[0].lines.find((l) => l.key === 'gst')!;
      expect(gst.formula).toBe(`₹897.00 (total collection) × ${pct} ÷ ${100 + pct}`);
      // The divisor is always 100 + the rate — never a hardcoded 118.
      expect(Math.abs(netAmount * (pct / 100) - gst.amount)).toBeLessThanOrEqual(0.01);
    }
  });

  it('divides by 100 at a 0% rate rather than emitting a bare 100', () => {
    const s = buildEarningsStatement(
      { ...venueWaterfall, gst_pct: 0, gst_amount: 0, net_amount: 897 },
      { has_venue: true, symbol: '₹', t },
    );
    const gst = s.sections[0].lines.find((l) => l.key === 'gst')!;
    expect(gst.formula).toBe('₹897.00 (total collection) × 0 ÷ 100');
    expect(gst.amount).toBe(0);
  });
});

describe('buildEarningsStatement (section descriptions)', () => {
  it('gives every rendered section a non-empty description', () => {
    const s = buildEarningsStatement(
      {
        ...venueWaterfall,
        club_admin_pct: 3,
        club_admin_amount: 21.66,
        host_amount: 201.5,
        host_commission_amount: 20.15,
        host_receives: 181.35,
      },
      { has_venue: true, symbol: '₹', t },
    );
    expect(s.sections.map((sec) => sec.description)).toEqual([
      'GST is a government tax on every ticket sold.',
      'What it costs to put this pod on and pay you.',
      'The club admin’s share for running the club.',
      'The fixed price the venue set for the slot.',
    ]);
    // A missing key would render as `<missing …>` on both surfaces, so the
    // info button must never open onto one.
    for (const section of s.sections) {
      expect(section.description).not.toContain('<missing');
      expect(section.description.length).toBeGreaterThan(0);
    }
  });

  it('describes only the sections it actually renders', () => {
    // No venue and no club cut: two sections, two descriptions, no orphans.
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
      { has_venue: false, symbol: '₹', t },
    );
    expect(s.sections.map((sec) => sec.key)).toEqual(['taxes', 'platform']);
    expect(s.sections.map((sec) => sec.description)).toEqual([
      'GST is a government tax on every ticket sold.',
      'What it costs to put this pod on and pay you.',
    ]);
  });

  it('keeps the description independent of the money, so a ₹0 pod still explains itself', () => {
    const free = buildEarningsStatement(
      {
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
      },
      { has_venue: false, symbol: '₹', t },
    );
    expect(free.sections.every((sec) => sec.description.length > 0)).toBe(true);
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
      { has_venue: false, symbol: '₹', t },
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
      { has_venue: true, symbol: '₹', t },
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
    const s = buildEarningsStatement(shortfallWaterfall, { has_venue: true, symbol: '₹', t });
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
      { has_venue: true, symbol: '₹', t },
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
      { has_venue: false, symbol: '₹', t },
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
      { has_venue: true, symbol: '₹', t },
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
      { has_venue: false, symbol: '₹', t },
    );
    expect(free.sections.map((sec) => sec.key)).toEqual(['taxes', 'platform']);
    expect(free.sections.map((sec) => sec.total)).toEqual([0, 0]);
    expect(free.net_payout).toEqual({ collection: 0, total_deductions: 0, receives: 0 });
    expect(free.reconciled).toBe(true);
  });

  it('renders every money figure in the caller\'s currency symbol', () => {
    const s = buildEarningsStatement(venueWaterfall, { has_venue: true, symbol: '$', t });
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
      { has_venue: true, symbol: '₹', t },
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
    const withoutVenue = buildEarningsStatement(venueWaterfall, { has_venue: false, symbol: '₹', t });
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
      { has_venue: true, symbol: '₹', t },
    );
    expect(within.total_deductions).toBe(696.18);
    expect(within.reconciled).toBe(true);

    const beyond = buildEarningsStatement(
      { ...venueWaterfall, host_receives: 200.81 },
      { has_venue: true, symbol: '₹', t },
    );
    expect(beyond.total_deductions).toBe(696.19);
    expect(beyond.reconciled).toBe(false);
  });

  it('never reconciles a waterfall whose amount is not a number', () => {
    const s = buildEarningsStatement(
      { ...venueWaterfall, amount: Number.NaN },
      { has_venue: true, symbol: '₹', t },
    );
    expect(Number.isNaN(s.total_deductions)).toBe(true);
    expect(s.reconciled).toBe(false);
  });
});
