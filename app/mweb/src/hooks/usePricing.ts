import { gql, useQuery } from '@apollo/client';

const PUBLIC_FINANCE = gql`
  query PublicFinanceSettingsForPricing {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      default_backout_deduction_pct
    }
  }
`;

export interface PricedAmount {
  /** Taxable value: the net-of-GST amount (== total − gst). */
  subtotal: number;
  /** Platform fee — Duncit revenue taken FROM the net (net × f); a memo already
   * inside `subtotal`, never added on top of the total. */
  fee: number;
  /** GST component extracted from the gross (inclusive). */
  gst: number;
  /** Gross amount the user actually pays (== input). */
  total: number;
  currency: string;
  feePct: number;
  gstPct: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function usePricing() {
  const { data } = useQuery(PUBLIC_FINANCE, { fetchPolicy: 'cache-first' });
  const fs = data?.publicFinanceSettings;
  const feePct = fs?.platform_fee_pct ?? 0;
  const gstPct = fs?.gst_pct ?? 0;
  const backoutDeductionPct = fs?.default_backout_deduction_pct ?? 0;
  const currency = fs?.currency_symbol ?? '\u20b9';

  /**
   * Treats `amount` as the GROSS price the user pays (GST-inclusive) and mirrors
   * the settlement engine: GST is extracted inclusive (gross × g/(100+g)); the
   * taxable value is the net; the platform fee is a memo taken from net (net × f).
   * Matches server `computeQuote(_, {inclusive:true})`.
   */
  const compute = (amount: number | string | null | undefined): PricedAmount => {
    const gross = Math.max(0, Number(amount) || 0);
    const gst = round2((gross * gstPct) / (100 + gstPct));
    const subtotal = round2(gross - gst);
    const fee = round2(subtotal * (feePct / 100));
    return { subtotal, fee, gst, total: round2(gross), currency, feePct, gstPct };
  };

  const format = (amount: number | string | null | undefined) => {
    const p = compute(amount);
    return `${currency}${p.total.toFixed(p.total % 1 === 0 ? 0 : 2)}`;
  };

  return { feePct, gstPct, backoutDeductionPct, currency, compute, format, ready: !!fs };
}

