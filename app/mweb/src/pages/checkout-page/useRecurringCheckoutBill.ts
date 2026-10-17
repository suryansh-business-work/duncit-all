import { useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { applyBillDiscounts, coinCheckoutSummary, RECURRING_CHECKOUT_QUOTE_SDL, round2 } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { buildBreakup } from './checkoutMath';
import type { CheckoutDiscount } from './OrderSummaryCard';
import { useCoinRedemption } from './useCoinRedemption';
import type { CheckoutSession } from './useCheckoutSession';

export const RECURRING_CHECKOUT_QUOTE = gql(RECURRING_CHECKOUT_QUOTE_SDL);

interface Quote {
  dates: number;
  currency_symbol: string;
  ticket_gross: number;
  ticket_discount_amount: number;
  ticket_discount_pct: number;
  multi_date_discount_amount: number;
  multi_date_discount_pct: number;
  coupon_code?: string | null;
  coupon_discount: number;
  coins_redeemed: number;
  subtotal: number;
  platform_fee_amount: number;
  gst_amount: number;
  round_off: number;
  total: number;
}

interface Args {
  session: CheckoutSession;
  pod: { pod_amount?: number | null } | null | undefined;
  /** The recurring pod. */
  podId: string;
  dateIds: readonly string[];
  seats: number;
}

/**
 * The bill for booking several dates of a recurring pod in one checkout.
 *
 * Each date is its own payment and rounds up on its own, so this bill is not
 * worked out here: the server prices it (`recurringCheckoutQuote`, the same
 * pricing the charge runs) with the buyer's coupon and coins, and this hook
 * only shapes that quote the way the checkout page reads a bill — the same
 * fields `usePodCheckoutBill` returns. Native twin: the checkout screen's.
 */
export function useRecurringCheckoutBill({ session, pod, podId, dateIds, seats }: Readonly<Args>) {
  const { t } = useTranslation();
  const couponCode = session.coupon?.ok ? (session.coupon.code ?? null) : null;
  const { data, previousData, loading, error } = useQuery<{ recurringCheckoutQuote: Quote }>(
    RECURRING_CHECKOUT_QUOTE,
    {
      variables: {
        input: { pod_id: podId, date_pod_ids: dateIds, seats, coupon_code: couponCode, redeem_coins: session.coinsApplied },
      },
      fetchPolicy: 'network-only',
    }
  );
  // The last quote stays on screen while the next one loads, so the bill never blanks.
  const quote = (data ?? previousData)?.recurringCheckoutQuote ?? null;
  // What the coupon is weighed on, and what the coins may cover.
  const base = quote ? round2(quote.ticket_gross - quote.ticket_discount_amount - quote.multi_date_discount_amount) : 0;
  const redemption = useCoinRedemption(session, quote ? quote.total + quote.coins_redeemed : 0);
  const coins = quote
    ? {
        ...redemption,
        applied: quote.coins_redeemed,
        effectiveTotal: quote.total,
        roundOff: quote.round_off,
        taxable: round2(quote.subtotal + quote.gst_amount),
      }
    : redemption;
  const breakup = useMemo(
    () => (quote ? buildBreakup(quote.ticket_gross, session.finance) : null),
    [quote, session.finance]
  );
  const payBreakup = breakup && quote
    ? { ...breakup, subtotal: quote.subtotal, fee: quote.platform_fee_amount, gst: quote.gst_amount, total: coins.taxable }
    : null;
  const coinSummary = useMemo(
    () =>
      coinCheckoutSummary({
        balance: session.coinBalance,
        applied: coins.applied,
        payable: coins.effectiveTotal,
        earnPct: session.coinEarnPct,
      }),
    [session.coinBalance, session.coinEarnPct, coins.applied, coins.effectiveTotal]
  );
  const discounts = useMemo(() => {
    if (!quote) return [];
    const rows: CheckoutDiscount[] = [
      {
        key: 'ticketDiscount',
        testId: 'checkout-ticket-discount-row',
        label: t('mweb.checkout.ticketDiscount', { vars: { pct: quote.ticket_discount_pct, count: seats } }),
        amount: quote.ticket_discount_amount,
      },
      {
        key: 'multiDateDiscount',
        testId: 'checkout-multi-date-discount-row',
        label: t('mweb.podSeriesBooking.discountRow', { vars: { pct: quote.multi_date_discount_pct, count: quote.dates } }),
        amount: quote.multi_date_discount_amount,
      },
      {
        key: 'coupon',
        label: t('mweb.checkout.couponDiscount', { vars: { code: quote.coupon_code ?? '' } }),
        amount: quote.coupon_discount,
      },
      { key: 'coins', label: t('mweb.coin.checkoutTitle'), amount: quote.coins_redeemed },
    ];
    return applyBillDiscounts(quote.ticket_gross, rows).discounts;
  }, [quote, seats, t]);

  return {
    unitAmount: Number(pod?.pod_amount ?? 0),
    amount: quote?.ticket_gross ?? 0,
    base,
    breakup,
    coins,
    payBreakup,
    coinSummary,
    discounts,
    dates: quote?.dates ?? dateIds.length,
    loading: loading && !quote,
    error: error ?? null,
  };
}
