import type { EarningsStatement, EarningsWaterfall } from '@duncit/utils';
import type { Translate } from '../i18n/useTranslation';

/**
 * Where the venue stands on this pod, which decides what its row says:
 * - `slot`     — a slot is picked; its price is a real line in the statement.
 * - `unpicked` — a physical pod whose slot is not chosen yet.
 * - `pending`  — an Auto Pod: the venue that enrols brings the price.
 * - `none`     — a virtual pod; there is no venue at all.
 */
export type VenueStanding = 'slot' | 'unpicked' | 'pending' | 'none';

export interface ProjectionRow {
  key: string;
  label: string;
  /** The exact server inputs behind the number, so the row is hand-verifiable. */
  formula?: string;
  /** Rupees; null for a deduction whose amount nobody knows yet (the venue). */
  amount: number | null;
  kind: 'collection' | 'deduction' | 'total' | 'payout';
}

export interface ProjectionRowsInput {
  statement: EarningsStatement;
  waterfall: EarningsWaterfall;
  venue: VenueStanding;
  /** Duncit products attached to the pod — deducted from the host's payout. */
  productCost: number;
  money: (value: number) => string;
  t: Translate;
}

/** The venue row for a pod whose slot price is not a statement line yet. */
function venueRow(venue: VenueStanding, t: Translate): ProjectionRow | null {
  if (venue === 'pending') {
    return {
      key: 'venue-slot',
      label: t('podForm.priceBreakdown.venueSlotPrice'),
      formula: t('podForm.priceBreakdown.venuePending'),
      amount: null,
      kind: 'deduction',
    };
  }
  if (venue === 'unpicked') {
    return {
      key: 'venue-slot',
      label: t('podForm.priceBreakdown.venueSlotPrice'),
      formula: t('podForm.priceBreakdown.venueNotPicked'),
      amount: null,
      kind: 'deduction',
    };
  }
  return null;
}

/** What the payout line is called: the venue's cut is still to come on a pod
 * without a slot, and products push it past the server's host_receives. */
function payoutLabel(venue: VenueStanding, productCost: number, t: Translate): string {
  if (venue === 'pending' || venue === 'unpicked') {
    return t('podForm.priceBreakdown.hostReceivesBeforeVenue');
  }
  return productCost > 0
    ? t('podForm.priceBreakdown.finalPayout')
    : t('podForm.priceBreakdown.hostReceives');
}

/**
 * The rows the admin editor prints, in statement order. Every amount is the
 * server's — the shared statement supplies the charged lines and their
 * formulas; this only adds the rows the statement has no reason to carry: the
 * club-admin cut when its rate is 0 (the admin must still see that it exists),
 * a venue whose price is not known yet, and the attached Duncit products.
 */
export function projectionRows(input: Readonly<ProjectionRowsInput>): ProjectionRow[] {
  const { statement, waterfall, venue, productCost, money, t } = input;
  const rows: ProjectionRow[] = [
    {
      key: 'collection',
      label: t('podForm.priceBreakdown.totalCollection'),
      formula: statement.collection.included_gst_note,
      amount: statement.collection.amount,
      kind: 'collection',
    },
  ];
  for (const section of statement.sections) {
    for (const line of section.lines) {
      if (line.deduction) rows.push({ ...line, kind: 'deduction' });
    }
    if (section.key === 'platform' && !statement.sections.some((s) => s.key === 'club')) {
      // The statement drops the club section at 0%; the admin still needs to
      // see the cut exists and where its rate is set.
      rows.push({
        key: 'club-admin',
        label: t('podForm.priceBreakdown.clubAdminFee', { vars: { pct: waterfall.club_admin_pct } }),
        formula: t('podForm.priceBreakdown.clubAdminFormula'),
        amount: waterfall.club_admin_amount,
        kind: 'deduction',
      });
    }
  }
  const pendingVenue = venueRow(venue, t);
  if (pendingVenue) rows.push(pendingVenue);
  if (productCost > 0) {
    rows.push({
      key: 'products',
      label: t('podForm.priceBreakdown.productCost'),
      formula: t('podForm.priceBreakdown.productFormula'),
      amount: productCost,
      kind: 'deduction',
    });
  }
  rows.push(
    {
      key: 'total-deductions',
      label: t('podForm.priceBreakdown.totalDeductions'),
      amount: statement.total_deductions + productCost,
      kind: 'total',
    },
    {
      key: 'payout',
      label: payoutLabel(venue, productCost, t),
      formula: `${money(statement.net_payout.collection)} − ${money(statement.total_deductions + productCost)}`,
      amount: waterfall.host_receives - productCost,
      kind: 'payout',
    },
  );
  return rows;
}
