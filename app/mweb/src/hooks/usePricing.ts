import { gql, useQuery } from '@apollo/client';

const PUBLIC_FINANCE = gql`
  query PublicFinanceSettingsForPricing {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
    }
  }
`;

export interface PricedAmount {
  /** Net amount to host/venue (excl. fee + GST). */
  subtotal: number;
  /** Platform fee component included in the gross. */
  fee: number;
  /** GST component included in the gross. */
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
  const currency = fs?.currency_symbol ?? '\u20b9';

  /**
   * Treats `amount` as the GROSS price the user pays (inclusive of fee + GST)
   * and back-solves the breakup. Matches server `computeQuote(_, {inclusive:true})`.
   */
  const compute = (amount: number | string | null | undefined): PricedAmount => {
    const gross = Math.max(0, Number(amount) || 0);
    const f = feePct / 100;
    const g = gstPct / 100;
    const divisor = (1 + f) * (1 + g);
    const subtotal = round2(divisor > 0 ? gross / divisor : gross);
    const fee = round2(subtotal * f);
    const gst = round2((subtotal + fee) * g);
    return { subtotal, fee, gst, total: round2(gross), currency, feePct, gstPct };
  };

  const format = (amount: number | string | null | undefined) => {
    const p = compute(amount);
    return `${currency}${p.total.toFixed(p.total % 1 === 0 ? 0 : 2)}`;
  };

  return { feePct, gstPct, currency, compute, format, ready: !!fs };
}

