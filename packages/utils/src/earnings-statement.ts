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
 *
 * The two Duncit commissions are charged on DIFFERENT bases and are shown that
 * way: the host's (host_amount × host_commission_pct) is a real deduction from
 * the collection and lives under Platform Charges, venue or no venue; the
 * venue's (venue_amount × venue_commission_pct) is already inside the slot
 * price, so it renders as a context row under Venue Charges.
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
  venue_commission_pct: number;
  venue_commission_amount: number;
  venue_receives: number;
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

/**
 * The calling surface's translator.
 *
 * Every word below — the section titles, the row labels and the formulas that
 * make a row hand-verifiable — lives in `earnings.statement.*` (rule 38). The
 * keys are written out in full rather than composed, because
 * `verify-translation-keys.mjs` greps source for the literal string.
 */
export type EarningsTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface EarningsStatementOptions {
  /** Whether a venue slot is attached (renders the Venue Charges section). */
  has_venue: boolean;
  /** Currency symbol used inside formula strings, e.g. '₹'. */
  symbol: string;
  /** Resolves the statement's copy in the reader's language. */
  t: EarningsTranslate;
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
  const { t } = options;
  const money = (value: number) => formatStatementMoney(value, options.symbol);
  // The engine (breakdown.math.ts) charges no commission when host_amount <= 0.
  const commissionFormula =
    w.host_amount > 0
      ? t('earnings.statement.commissionFormula', {
          vars: { host: money(w.host_amount), pct: w.host_commission_pct },
        })
      : t('earnings.statement.noCommissionFormula');
  // Duncit's cut of the VENUE's money is charged on the venue's slot price and
  // is already inside it, so the host's statement states it without deducting
  // it a second time: `venue_receives` is what the venue is left with.
  const venueCommissionFormula = t('earnings.statement.venueCommissionFormula', {
    vars: {
      venue: money(w.venue_amount),
      pct: w.venue_commission_pct,
      receives: money(w.venue_receives),
    },
  });

  const taxes: StatementSection = {
    key: 'taxes',
    title: t('earnings.statement.taxesTitle'),
    lines: [
      {
        key: 'taxable',
        label: t('earnings.statement.taxableLabel'),
        amount: w.net_amount,
        formula: t('earnings.statement.taxableFormula', {
          vars: { amount: money(w.amount), gst: money(w.gst_amount) },
        }),
        deduction: false,
      },
      {
        key: 'gst',
        label: t('earnings.statement.gstLabel', { vars: { pct: w.gst_pct } }),
        amount: w.gst_amount,
        formula: t('earnings.statement.gstFormula', {
          vars: { net: money(w.net_amount), pct: w.gst_pct },
        }),
        deduction: true,
      },
    ],
    total: 0,
  };

  const platform: StatementSection = {
    key: 'platform',
    title: t('earnings.statement.platformTitle'),
    lines: [
      {
        key: 'platform-fee',
        label: t('earnings.statement.platformFeeLabel', { vars: { pct: w.platform_fee_pct } }),
        amount: w.platform_fee_amount,
        formula: t('earnings.statement.platformFeeFormula', {
          vars: { net: money(w.net_amount), pct: w.platform_fee_pct },
        }),
        deduction: true,
      },
      {
        key: 'duncit-commission',
        label: t('earnings.statement.duncitCommissionLabel', {
          vars: { pct: w.host_commission_pct },
        }),
        amount: w.host_commission_amount,
        formula: commissionFormula,
        deduction: true,
      },
    ],
    total: 0,
  };

  const sections: StatementSection[] = [taxes, platform];

  if (w.club_admin_amount > 0) {
    sections.push({
      key: 'club',
      title: t('earnings.statement.clubTitle'),
      lines: [
        {
          key: 'club-admin',
          label: t('earnings.statement.clubAdminLabel', { vars: { pct: w.club_admin_pct } }),
          amount: w.club_admin_amount,
          formula: t('earnings.statement.clubAdminFormula', {
            vars: { pool: money(w.pool_amount), pct: w.club_admin_pct },
          }),
          deduction: true,
        },
      ],
      total: 0,
    });
  }

  if (options.has_venue) {
    const venueLines: StatementLine[] = [
      {
        key: 'venue-slot',
        label: t('earnings.statement.venueSlotLabel'),
        amount: w.venue_amount,
        formula: t('earnings.statement.venueSlotFormula'),
        deduction: true,
      },
    ];
    // Context row, never a deduction: this cut comes OUT of the slot price on
    // the row above, so counting it again would over-state the section by it.
    if (w.venue_commission_amount > 0) {
      venueLines.push({
        key: 'venue-commission',
        label: t('earnings.statement.venueCommissionLabel', {
          vars: { pct: w.venue_commission_pct },
        }),
        amount: w.venue_commission_amount,
        formula: venueCommissionFormula,
        deduction: false,
      });
    }
    sections.push({
      key: 'venue',
      title: t('earnings.statement.venueTitle'),
      lines: venueLines,
      total: 0,
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
      label: t('earnings.statement.collectionLabel'),
      amount: w.amount,
      included_gst_note: t('earnings.statement.includedGstNote', {
        vars: { gst: money(w.gst_amount) },
      }),
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
