import {
  applyBillDiscounts,
  round2,
  ticketDiscountFor,
  type TicketDiscountQuote,
  type TicketDiscountSource,
} from '@duncit/utils';
import type { Translator } from '@duncit/i18n';

import type { CheckoutDiscount } from '@/components/checkout/OrderSummary';
import type { CouponPreview } from '@/hooks/checkoutRequests';
import { useCoinRedemption } from '@/hooks/useCoinRedemption';
import { useTranslation } from '@/hooks/useTranslation';
import { buildBreakup, type FinanceSettings } from '@/utils/checkout-math';

type BillPod = (TicketDiscountSource & { pod_amount?: number | null }) | null | undefined;

/**
 * The deductions, in the order they are taken, for the summary card's own
 * rows: the multi-ticket tier first, then the coupon (priced on what the tier
 * left), then coins — 1:1 with the rupee, so the count applied IS the amount
 * off. mWeb twin.
 *
 * They are taken off the ticket gross and stopped at zero, so a coupon (or a
 * coupon plus coins) worth more than the ticket prints only what it actually
 * paid for: the excess is dropped, never refunded and never a negative total.
 */
function buildDiscounts(
  ticket: TicketDiscountQuote,
  seats: number,
  coupon: CouponPreview | null,
  coinsApplied: number,
  t: Translator['t'],
): CheckoutDiscount[] {
  const rows: CheckoutDiscount[] = [];
  if (ticket.amount > 0) {
    rows.push({
      key: 'ticketDiscount',
      label: t('mweb.checkout.ticketDiscount', { vars: { pct: ticket.pct, count: seats } }),
      amount: ticket.amount,
      testID: 'checkout-ticket-discount-row',
    });
  }
  const couponOff = coupon?.ok ? round2(ticket.net - coupon.final_total) : 0;
  if (couponOff > 0) {
    rows.push({
      key: 'coupon',
      label: t('mweb.checkout.couponDiscount', { vars: { code: coupon?.code ?? '' } }),
      amount: couponOff,
    });
  }
  if (coinsApplied > 0) {
    rows.push({ key: 'coins', label: t('mweb.coin.checkoutTitle'), amount: coinsApplied });
  }
  return applyBillDiscounts(ticket.gross, rows).discounts;
}

/**
 * The pod checkout's money, in the server's order (SPEC §5, mWeb identical):
 * ticket gross → minus the multi-ticket tier → coupon on what is left → Duncit
 * Coins → GST extracted inclusive from the remainder. A preview only — the
 * server re-prices from the pod and the seats.
 */
export function usePodCheckoutBill(
  pod: BillPod,
  seats: number,
  finance: FinanceSettings | null,
  coupon: CouponPreview | null,
) {
  const { t } = useTranslation();
  const ticket = ticketDiscountFor(Number(pod?.pod_amount ?? 0), seats, pod ?? {});
  // The bill before any discount — the multiplier line and the struck-through total.
  const breakup = buildBreakup(ticket.gross, finance);
  // The coupon discounts the post-tier ticket money, so coins redeem against its result.
  const payableAfterCoupon = coupon?.ok ? coupon.final_total : ticket.net;
  const coins = useCoinRedemption(payableAfterCoupon);
  // What is actually charged, broken up the same way: every deduction cuts the
  // GROSS and the server re-quotes on what is left, so the tax drops with it.
  const payBreakup = buildBreakup(coins.effectiveTotal, finance);
  const discounts = buildDiscounts(ticket, seats, coupon, coins.applied, t);
  return { ticket, breakup, coins, payBreakup, discounts };
}
