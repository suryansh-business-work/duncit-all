import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { applyBillDiscounts, round2 } from '@duncit/utils';

import type { CheckoutDiscount } from '@/components/checkout/OrderSummary';
import type { CouponPreview } from '@/hooks/checkoutRequests';
import { RecurringCheckoutQuoteDocument } from '@/graphql/pod-series';
import { useCoinRedemption } from '@/hooks/useCoinRedemption';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { buildBreakup, type FinanceSettings } from '@/utils/checkout-math';
import { toErrorMessage } from '@/utils/errors';

type Quote = ResultOf<typeof RecurringCheckoutQuoteDocument>['recurringCheckoutQuote'];

interface Args {
  /** The recurring pod; empty when this checkout is not one. */
  podId: string;
  dateIds: readonly string[];
  seats: number;
  finance: FinanceSettings | null;
  coupon: CouponPreview | null;
}

function discountRows(
  quote: Quote,
  seats: number,
  t: ReturnType<typeof useTranslation>['t'],
): CheckoutDiscount[] {
  const rows: CheckoutDiscount[] = [
    {
      key: 'ticketDiscount',
      label: t('mweb.checkout.ticketDiscount', {
        vars: { pct: quote.ticket_discount_pct, count: seats },
      }),
      amount: quote.ticket_discount_amount,
      testID: 'checkout-ticket-discount-row',
    },
    {
      key: 'multiDateDiscount',
      label: t('mweb.podSeriesBooking.discountRow', {
        vars: { pct: quote.multi_date_discount_pct, count: quote.dates },
      }),
      amount: quote.multi_date_discount_amount,
      testID: 'checkout-multi-date-discount-row',
    },
    {
      key: 'coupon',
      label: t('mweb.checkout.couponDiscount', { vars: { code: quote.coupon_code ?? '' } }),
      amount: quote.coupon_discount,
    },
    { key: 'coins', label: t('mweb.coin.checkoutTitle'), amount: quote.coins_redeemed },
  ];
  return applyBillDiscounts(quote.ticket_gross, rows).discounts;
}

/**
 * The bill for booking several dates of a recurring pod in one checkout —
 * the same shape `usePodCheckoutBill` returns. Each date is its own payment
 * and rounds up on its own, so the bill is not worked out here: the server
 * prices it (`recurringCheckoutQuote`, the charge's own pricing) with the
 * buyer's coupon and coins. mWeb twin: useRecurringCheckoutBill.
 */
export function useRecurringCheckoutBill({ podId, dateIds, seats, finance, coupon }: Args) {
  const { t } = useTranslation();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const couponCode = coupon?.ok ? (coupon.code ?? null) : null;
  const coinState = useCoinRedemption(quote ? quote.total + quote.coins_redeemed : 0);
  const requestedCoins = coinState.applied;
  const datesKey = dateIds.join(',');

  useEffect(() => {
    if (!podId || !datesKey) return;
    let active = true;
    graphqlRequest(
      RecurringCheckoutQuoteDocument,
      {
        input: {
          pod_id: podId,
          date_pod_ids: datesKey.split(','),
          seats,
          coupon_code: couponCode,
          redeem_coins: requestedCoins,
        },
      },
      { auth: true },
    )
      .then((data) => {
        if (!active) return;
        setQuote(data.recurringCheckoutQuote);
        setError(null);
      })
      .catch((err) => active && setError(toErrorMessage(err, t('mweb.checkout.unavailable'))));
    return () => {
      active = false;
    };
  }, [podId, datesKey, seats, couponCode, requestedCoins, t]);

  const base = quote
    ? round2(quote.ticket_gross - quote.ticket_discount_amount - quote.multi_date_discount_amount)
    : 0;
  const coins = quote
    ? {
        ...coinState,
        applied: quote.coins_redeemed,
        effectiveTotal: quote.total,
        roundOff: quote.round_off,
        taxable: round2(quote.subtotal + quote.gst_amount),
      }
    : coinState;
  const breakup = quote ? buildBreakup(quote.ticket_gross, finance) : null;
  const payBreakup =
    breakup && quote
      ? {
          ...breakup,
          subtotal: quote.subtotal,
          fee: quote.platform_fee_amount,
          gst: quote.gst_amount,
          total: coins.taxable,
        }
      : null;
  return {
    /** The ticket money, shaped like the one-date bill's (`net` is what the coupon is weighed on). */
    ticket: { gross: quote?.ticket_gross ?? 0, net: base, pct: quote?.ticket_discount_pct ?? 0 },
    breakup,
    coins,
    payBreakup,
    discounts: quote ? discountRows(quote, seats, t) : [],
    dates: quote?.dates ?? dateIds.length,
    error,
  };
}
