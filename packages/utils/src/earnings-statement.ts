/**
 * Zomato-style auditable earnings statement for a pod's payout preview —
 * ONE builder shared by mWeb and the native app so the Step-4 experience is
 * byte-identical on both surfaces.
 *
 * Every line carries its base, rate and the formula that produced it, and every
 * number comes STRAIGHT from the server waterfall (breakdown.math.ts) — this
 * module adds no money math beyond summing the server's own lines for section
 * subtotals and validating that they reconcile. GST is charged once, extracted
 * from the GST-inclusive collection (there is no per-fee GST in the engine), so
 * the statement shows the real taxable base (net = collection − GST) instead of
 * inventing per-charge tax lines.
 */
import { formatMoney } from './format-money';

/** The potentialPodEarnings waterfall fields the statement reads (rupees). */
export interface EarningsWaterfall {
  amount: number;
  gst_pct: number;
  gst_amount: number;
  net_amount: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  pool_amount: number;
  club_admin_pct: number;
  club_admin_amount: number;
  venue_amount: number;
  host_amount: number;
  host_commission_pct: number;
  host_commission_amount: number;
  host_receives: number;
  host_earn_pct: number;
}

export interface StatementLine {
  key: string;
  label: string;
  amount: number;
  /** "₹760.17 × 18%" — the exact server inputs, so the row is hand-verifiable. */
  formula: string;
  /** false = context row (e.g. the taxable base), not part of the section total. */
  deduction: boolean;
}

export interface StatementSection {
  key: string;
  title: string;
  lines: StatementLine[];
  /** Sum of this section's deduction lines (raw sum — format at render time). */
  total: number;
}

export interface EarningsStatement {
  /** "Total collection (₹1,000.00 × 29)" + the GST included in it. */
  collection: { label: string; amount: number; included_gst_note: string };
  sections: StatementSection[];
  /** collection − payout, the server-exact total of every deduction. */
  total_deductions: number;
  /** The Net Payout arithmetic: collection − total deductions = receives. */
  net_payout: { collection: number; total_deductions: number; receives: number };
  /** All three audit identities hold (line sums, section sums, net payout). */
  reconciled: boolean;
}

/** ₹X,XXX.XX — the one currency format both surfaces render. */
export const formatStatementMoney = (value: number, symbol: string): string =>
  formatMoney(value, { symbol, decimals: 2 });

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Float-noise allowance on 2-decimal rupee identities (the paise engine is exact). */
const TOLERANCE = 0.02;

const sumDeductions = (lines: StatementLine[]) =>
  round2(lines.filter((line) => line.deduction).reduce((total, line) => total + line.amount, 0));

export interface EarningsStatementOptions {
  /** Whether a venue slot is attached (renders the Venue Charges section). */
  has_venue: boolean;
  /** Currency symbol used inside formula strings, e.g. '₹'. */
  symbol: string;
}

/**
 * Build the auditable statement from the server waterfall. Sections:
 * Taxes (GST, with its taxable base) → Platform Charges → Club Charges →
 * Venue Charges → total deductions → net payout, each line with its formula.
 */
export function buildEarningsStatement(
  w: EarningsWaterfall,
  options: EarningsStatementOptions
): EarningsStatement {
  const money = (value: number) => formatStatementMoney(value, options.symbol);
  // The engine (breakdown.math.ts) charges no commission when host_amount <= 0.
  const commissionFormula =
    w.host_amount > 0
      ? `${money(w.host_amount)} × ${w.host_commission_pct}% (your remainder)`
      : 'No commission — host remainder is not positive';

  const taxes: StatementSection = {
    key: 'taxes',
    title: 'Taxes',
    lines: [
      {
        key: 'taxable',
        label: 'Taxable Amount',
        amount: w.net_amount,
        formula: `${money(w.amount)} − ${money(w.gst_amount)} GST (prices are GST-inclusive)`,
        deduction: false,
      },
      {
        key: 'gst',
        label: `GST @${w.gst_pct}%`,
        amount: w.gst_amount,
        formula: `${money(w.net_amount)} × ${w.gst_pct}%`,
        deduction: true,
      },
    ],
    total: 0,
  };

  const platform: StatementSection = {
    key: 'platform',
    title: 'Platform Charges',
    lines: [
      {
        key: 'platform-fee',
        label: `Platform Fee @${w.platform_fee_pct}%`,
        amount: w.platform_fee_amount,
        formula: `${money(w.net_amount)} × ${w.platform_fee_pct}%`,
        deduction: true,
      },
    ],
    total: 0,
  };

  const sections: StatementSection[] = [taxes, platform];

  if (w.club_admin_amount > 0) {
    sections.push({
      key: 'club',
      title: 'Club Charges',
      lines: [
        {
          key: 'club-admin',
          label: `Club Admin Fee @${w.club_admin_pct}%`,
          amount: w.club_admin_amount,
          formula: `${money(w.pool_amount)} × ${w.club_admin_pct}%`,
          deduction: true,
        },
      ],
      total: 0,
    });
  }

  if (options.has_venue) {
    sections.push({
      key: 'venue',
      title: 'Venue Charges',
      lines: [
        {
          key: 'venue-slot',
          label: 'Venue Slot Price',
          amount: w.venue_amount,
          formula: 'Fixed booked slot price (deducted once per pod)',
          deduction: true,
        },
        {
          key: 'venue-commission',
          label: `Duncit Commission from Venue @${w.host_commission_pct}%`,
          amount: w.host_commission_amount,
          formula: commissionFormula,
          deduction: true,
        },
      ],
      total: 0,
    });
  } else {
    // No venue group to carry it — the commission is a platform-side charge.
    platform.lines.push({
      key: 'duncit-commission',
      label: `Duncit Commission @${w.host_commission_pct}%`,
      amount: w.host_commission_amount,
      formula: commissionFormula,
      deduction: true,
    });
  }

  for (const section of sections) {
    section.total = sumDeductions(section.lines);
  }

  // The server-exact deduction total: everything that is not the host's payout.
  const totalDeductions = round2(w.amount - w.host_receives);
  const sectionsTotal = round2(sections.reduce((total, section) => total + section.total, 0));
  const reconciled =
    Math.abs(sectionsTotal - totalDeductions) <= TOLERANCE &&
    Math.abs(w.amount - totalDeductions - w.host_receives) <= TOLERANCE;

  return {
    collection: {
      label: 'Total collection',
      amount: w.amount,
      included_gst_note: `Includes GST ${money(w.gst_amount)} — prices are GST-inclusive`,
    },
    sections,
    total_deductions: totalDeductions,
    net_payout: {
      collection: w.amount,
      total_deductions: totalDeductions,
      receives: w.host_receives,
    },
    reconciled,
  };
}
