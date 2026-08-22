import type { PaymentArtifact, PaymentSegment } from './queries';

/**
 * The detail page mirrors checkout: one tab per thing a checkout can buy.
 *
 * The fourth segment, PAYMENT, deliberately has no tab — the money, the invoice,
 * the coupon, the coins and the receipt happen whatever was bought, so hiding
 * them behind a purchase tab would either duplicate them across all three or
 * bury them under whichever one happened to be open.
 */
export type CheckoutTabValue = 'pod' | 'product' | 'giftcard';

export interface CheckoutTab {
  value: CheckoutTabValue;
  segment: PaymentSegment;
  labelKey: string;
  /** Shown when this payment bought nothing of that kind. */
  emptyKey: string;
}

export const CHECKOUT_TABS: readonly CheckoutTab[] = [
  {
    value: 'pod',
    segment: 'POD',
    labelKey: 'finance.payment.tabPod',
    emptyKey: 'finance.payment.tabPodEmpty',
  },
  {
    value: 'product',
    segment: 'PRODUCT',
    labelKey: 'finance.payment.tabProduct',
    emptyKey: 'finance.payment.tabProductEmpty',
  },
  {
    value: 'giftcard',
    segment: 'GIFT_CARD',
    labelKey: 'finance.payment.tabGiftCard',
    emptyKey: 'finance.payment.tabGiftCardEmpty',
  },
];

export const inSegment = <T extends { segment: PaymentSegment }>(
  rows: readonly T[],
  segment: PaymentSegment,
): T[] => rows.filter((row) => row.segment === segment);

/**
 * Did this payment buy anything of that kind?
 *
 * Answered from the artifacts rather than from `target_type`, because the
 * server has already made exactly this call once per row: an artifact is marked
 * not-applicable precisely when the payment carried no pod, no product lines or
 * no gift card. Re-deriving it here would be a second rule to keep in step.
 */
export const segmentApplies = (
  artifacts: readonly PaymentArtifact[],
  segment: PaymentSegment,
): boolean => artifacts.some((row) => row.segment === segment && !row.not_applicable);

/** Open on what the payment actually bought, not always on the pod tab. */
export function defaultCheckoutTab(artifacts: readonly PaymentArtifact[]): CheckoutTabValue {
  const bought = CHECKOUT_TABS.find((tab) => segmentApplies(artifacts, tab.segment));
  return bought?.value ?? 'pod';
}

/** A row this payment was supposed to create and did not. Drives the warning
 * marker on the tab strip, so Finance does not have to open all three tabs to
 * find out which one is broken. */
export const segmentHasFailure = (
  artifacts: readonly PaymentArtifact[],
  segment: PaymentSegment,
): boolean =>
  artifacts.some((row) => row.segment === segment && !row.created && !row.not_applicable);
