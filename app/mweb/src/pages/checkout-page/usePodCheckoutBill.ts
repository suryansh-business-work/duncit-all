import { useMemo } from 'react';
import { applyBillDiscounts, coinCheckoutSummary, smartIncentiveFor, ticketDiscountFor } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { usePodSmartIncentive } from '../../utils/smartIncentive';
import { buildBreakup } from './checkoutMath';
import type { CheckoutDiscount } from './OrderSummaryCard';
import { useCoinRedemption } from './useCoinRedemption';
import type { CheckoutSession } from './useCheckoutSession';

interface Args {
  session: CheckoutSession;
  /** The CHECKOUT_POD pod — absent while it loads or when the query failed. */
  pod: any;
  /** Seats booked on Pod Details. */
  seats: number;
  /** The MULTIPLIED, undiscounted ticket total the Pod Details link carried. */
  linkTotal: number;
}

/**
 * The pod bill, in the order the server takes its deductions: ticket gross →
 * multi-ticket discount → the member's unlocked Smart Incentive → coupon
 * (previewed on the discounted tickets) → Duncit Coins → GST extracted from
 * what is left. mWeb previews locally, so this has to match the server's
 * pricing exactly; the ticket maths is the shared `ticketDiscountFor` and
 * `smartIncentiveFor`, never a copy. Native twin: the checkout screen's bill.
 */
export function usePodCheckoutBill({ session, pod, seats, linkTotal }: Readonly<Args>) {
  const { t } = useTranslation();
  // The link carries the MULTIPLIED total — it always has — so dividing it by
  // the same seat count recovers the unit price. Reading it as a unit price and
  // multiplying again previewed a three-seat booking at nine times the ticket,
  // and the page still renders a working Pay button when the pod query fails,
  // so that fallback was reachable.
  const unitAmount = Number(pod?.pod_amount ?? 0) || linkTotal / seats;
  const ticket = useMemo(() => ticketDiscountFor(unitAmount, seats, pod ?? {}), [unitAmount, seats, pod]);
  // The member's offer, cache-first: the pod page has usually just read (or
  // unlocked) it. Only an unlocked one comes off, and only off what the tier
  // leaves — the two pod discounts compound, as the server prices them.
  const offer = usePodSmartIncentive(pod?.id, { skip: !pod?.smart_incentive_enabled, fetchPolicy: 'cache-first' });
  const incentive = useMemo(
    () => smartIncentiveFor(ticket.net, offer.unlockedPct),
    [ticket.net, offer.unlockedPct],
  );
  // What the coupon is evaluated on: the ticket money once both pod discounts are taken.
  const base = incentive.net;
  // Unpriced (null) until the offer is known too, so the total never moves
  // under the buyer once the page shows it.
  const breakup = useMemo(
    () => (offer.loading ? null : buildBreakup(ticket.gross, session.finance)),
    [offer.loading, ticket.gross, session.finance],
  );
  const coupon = session.coupon?.ok ? session.coupon : null;
  // The coupon discounts the whole post-discount bill, so coins redeem against its result.
  const coins = useCoinRedemption(session, coupon ? coupon.final_total : base);
  // What is actually charged, broken up the same way. The tier, coupon and coins
  // all cut the GROSS, and the server re-quotes on what is left, so the tax owed
  // drops with it — the undiscounted breakup would print a GST nobody pays.
  // Broken up on the TAXABLE value: the round-off that takes the charge to a
  // whole rupee is not taxed, so it is its own row and never inside these lines.
  const payBreakup = useMemo(
    () => buildBreakup(coins.taxable, session.finance),
    [coins.taxable, session.finance],
  );
  // Earned on what is ACTUALLY charged — the server credits on the total after
  // coins are spent, so previewing off the gross would promise coins that never
  // arrive.
  const coinSummary = useMemo(
    () =>
      coinCheckoutSummary({
        balance: session.coinBalance,
        applied: coins.applied,
        payable: coins.effectiveTotal,
        earnPct: session.coinEarnPct,
      }),
    [session.coinBalance, session.coinEarnPct, coins.applied, coins.effectiveTotal],
  );
  // Taken off the gross in order and stopped at zero. The tier row goes FIRST
  // and the Smart Incentive second: they are taken first, and a coupon worth
  // more than the tickets would otherwise leave them printing zero. A row that
  // comes to nothing is dropped.
  const discounts = useMemo(() => {
    const rows: CheckoutDiscount[] = [
      {
        key: 'ticketDiscount',
        testId: 'checkout-ticket-discount-row',
        label: t('mweb.checkout.ticketDiscount', { vars: { pct: ticket.pct, count: seats } }),
        amount: ticket.amount,
      },
      {
        key: 'smartIncentive',
        testId: 'checkout-smart-incentive-row',
        label: t('mweb.smartIncentive.checkoutLine', { vars: { pct: incentive.pct } }),
        amount: incentive.amount,
      },
    ];
    if (coupon) {
      rows.push({
        key: 'coupon',
        label: t('mweb.checkout.couponDiscount', { vars: { code: coupon.code ?? '' } }),
        amount: base - coupon.final_total,
      });
    }
    if (coins.applied > 0) {
      rows.push({ key: 'coins', label: t('mweb.coin.checkoutTitle'), amount: coins.applied });
    }
    // applyBillDiscounts spreads each row, so `testId` rides through with it.
    return applyBillDiscounts(ticket.gross, rows).discounts;
  }, [ticket, incentive, seats, coupon, base, coins.applied, t]);

  return {
    unitAmount,
    /** The undiscounted ticket gross — what the pay input and the link carry. */
    amount: ticket.gross,
    base,
    breakup,
    coins,
    payBreakup,
    coinSummary,
    discounts,
  };
}
