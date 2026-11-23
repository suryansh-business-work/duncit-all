import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  PAYMENT_DETAIL,
  REFUND_PAYMENT_TO_SOURCE,
  RETRY_PAYMENT_STEPS,
  type PaymentRefundEntry,
  type PaymentRefundSection,
  type DetailPayment,
  type PaymentArtifact,
  type PaymentBilling,
  type PaymentCoinLine,
  type PaymentCouponInfo,
  type PaymentDetail,
  type PaymentGiftCardInfo,
  type PaymentPodBooking,
  type PaymentProductOrderLine,
  type PaymentStep,
} from '../../src/pages/finance/payment-detail-page/queries';

/**
 * Payment-detail (audit page) mocks. The page reads one `PaymentDetail` through
 * `useQuery(PAYMENT_DETAIL)`, and the retry mutation answers with the same
 * fragment, so both are built from these factories. Every node carries the
 * server's `__typename` so the MockedProvider cache matches the fragment the
 * way production does. The shapes are the page's own contract (queries.ts).
 */
type Typed<T, N extends string> = T & { __typename: N };

export type BillingMock = Typed<PaymentBilling, 'BillingDetails'>;
export type DetailPaymentMock = Typed<Omit<DetailPayment, 'billing'>, 'Payment'> & { billing: BillingMock };
export type StepMock = Typed<PaymentStep, 'PaymentStep'>;
export type ArtifactMock = Typed<PaymentArtifact, 'PaymentArtifact'>;
export type CoinLineMock = Typed<PaymentCoinLine, 'PaymentCoinLine'>;
export type CouponMock = Typed<PaymentCouponInfo, 'PaymentCouponInfo'>;
export type PodBookingMock = Typed<PaymentPodBooking, 'PaymentPodBooking'>;
export type ProductOrderMock = Typed<PaymentProductOrderLine, 'PaymentProductOrderLine'>;
export type GiftCardMock = Typed<PaymentGiftCardInfo, 'PaymentGiftCard'>;

export type RefundEntryMock = Typed<PaymentRefundEntry, 'PaymentRefundEntry'>;
export type RefundEventMock = Typed<Omit<PaymentRefundSection['events'][number], 'details'>, 'PaymentEvent'> & {
  details: Typed<{ key: string; value: string }, 'PaymentEventDetail'>[];
};
export type RefundSectionMock = Typed<Omit<PaymentRefundSection, 'entries' | 'events'>, 'PaymentRefundSection'> & {
  entries: RefundEntryMock[];
  events: RefundEventMock[];
};

type DetailNodes =
  | 'payment'
  | 'steps'
  | 'artifacts'
  | 'coins'
  | 'coupon'
  | 'pod_booking'
  | 'product_orders'
  | 'gift_card'
  | 'refunds';

export type PaymentDetailMock = Typed<Omit<PaymentDetail, DetailNodes>, 'PaymentDetail'> & {
  payment: DetailPaymentMock;
  steps: StepMock[];
  artifacts: ArtifactMock[];
  coins: CoinLineMock[];
  coupon: CouponMock | null;
  pod_booking: PodBookingMock | null;
  product_orders: ProductOrderMock[];
  gift_card: GiftCardMock | null;
  refunds: RefundSectionMock[];
};

export const PAID_AT = '2026-09-01T10:00:00.000Z';

export const makeBilling = (over: Partial<BillingMock> = {}): BillingMock => ({
  __typename: 'BillingDetails',
  name: 'Riya Sharma',
  email: 'billing@duncit.com',
  phone: '+91 98450 11223',
  gstin: '29ABCDE1234F1Z5',
  line1: '12 MG Road',
  line2: '',
  landmark: 'Near Trinity Metro',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  country: 'India',
  ...over,
});

export const makeDetailPayment = (over: Partial<DetailPaymentMock> = {}): DetailPaymentMock => ({
  __typename: 'Payment',
  id: 'pd1',
  payment_id: 'DUN-PAY-4821',
  invoice_no: 'INV-2026-0042',
  target_type: 'POD',
  user_name: 'Riya Sharma',
  user_email: 'riya@duncit.com',
  user_phone: '+91 98765 43210',
  billing: makeBilling(),
  description: 'Sunrise Yoga — 2 seats',
  subtotal: 847.46,
  platform_fee_pct: 10,
  platform_fee_amount: 84.75,
  gst_pct: 18,
  gst_amount: 152.54,
  round_off: 0,
  total: 1000,
  currency_symbol: '₹',
  coupon_code: 'YOGA10',
  coupon_discount: 100,
  // This buyer had not unlocked a Smart Incentive.
  smart_incentive_amount: 0,
  smart_incentive_pct: 0,
  status: 'SUCCESS',
  gateway: 'razorpay',
  gateway_ref: 'pay_Nx12Razor',
  razorpay_payment_id: 'pay_Nx12Razor',
  razorpay_order_id: 'order_Nx12Razor',
  razorpay_refund_ids: [],
  rental_lines: [],
  paid_at: PAID_AT,
  created_at: '2026-09-01T09:59:00.000Z',
  ...over,
});

export const makeStep = (over: Partial<StepMock> = {}): StepMock => ({
  __typename: 'PaymentStep',
  key: 'PAYMENT_CAPTURED',
  label: 'Payment captured',
  status: 'DONE',
  detail: '',
  refs: ['pay_Nx12Razor'],
  at: PAID_AT,
  segment: 'PAYMENT',
  can_retry: false,
  ...over,
});

export const makeArtifact = (over: Partial<ArtifactMock> = {}): ArtifactMock => ({
  __typename: 'PaymentArtifact',
  key: 'TICKET_PAYMENT',
  label: 'Payment recorded',
  created: true,
  count: 1,
  refs: ['pay_Nx12Razor'],
  not_applicable: false,
  segment: 'PAYMENT',
  retry_key: null,
  ...over,
});

export const makeCoinLine = (over: Partial<CoinLineMock> = {}): CoinLineMock => ({
  __typename: 'PaymentCoinLine',
  type: 'DEBIT',
  amount: 50,
  balance_after: 120,
  source: 'CHECKOUT',
  reason: 'Redeemed on DUN-PAY-4821',
  earn_pct: 0,
  at: PAID_AT,
  ...over,
});

export const makeCoupon = (over: Partial<CouponMock> = {}): CouponMock => ({
  __typename: 'PaymentCouponInfo',
  code: 'YOGA10',
  discount: 100,
  discount_type: 'PERCENTAGE',
  discount_value: 10,
  title: 'Yoga Week 10% off',
  still_exists: true,
  ...over,
});

export const makePodBooking = (over: Partial<PodBookingMock> = {}): PodBookingMock => ({
  __typename: 'PaymentPodBooking',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunrise Yoga at Cubbon Park',
  pod_date_time: '2026-09-20T06:30:00.000Z',
  seats: 2,
  membership_id: 'mem_7788',
  membership_status: 'ACTIVE',
  ticket_code: 'TKT-7788',
  ticket_status: 'ACTIVE',
  ...over,
});

export const makeProductOrder = (over: Partial<ProductOrderMock> = {}): ProductOrderMock => ({
  __typename: 'PaymentProductOrderLine',
  id: 'ord1',
  order_no: 'DUN-ORD-1001',
  fulfilment_method: 'SHIPPING',
  fulfilment_status: 'SHIPPED',
  total: 499,
  item_count: 2,
  awb: 'AWB123456789',
  ...over,
});

export const makeGiftCard = (over: Partial<GiftCardMock> = {}): GiftCardMock => ({
  __typename: 'PaymentGiftCard',
  id: 'gc1',
  code: 'DUN-GIFT-9Q2X',
  recipient_name: 'Aman Verma',
  recipient_email: 'aman@duncit.com',
  scope_name: 'All pods',
  initial_amount: 1000,
  balance: 400,
  status: 'ACTIVE',
  expires_at: '2027-09-01T00:00:00.000Z',
  redeemed_at: '2026-09-05T12:00:00.000Z',
  ...over,
});

/** The receipt e-mail of a pod booking that never went out — the one row Finance can re-run. */
export const receiptStep = (over: Partial<StepMock> = {}): StepMock =>
  makeStep({
    key: 'RECEIPT_EMAIL',
    label: 'Receipt e-mailed',
    status: 'FAILED',
    detail: 'SMTP timeout after 30s',
    refs: [],
    can_retry: true,
    ...over,
  });

export const receiptArtifact = (over: Partial<ArtifactMock> = {}): ArtifactMock =>
  makeArtifact({
    key: 'RECEIPT_EMAIL',
    label: 'Receipt e-mailed',
    created: false,
    count: 0,
    refs: [],
    retry_key: 'RECEIPT_EMAIL',
    ...over,
  });

/** A pod booking whose core landed but whose receipt e-mail failed (CORE_DONE). */
export const makePaymentDetail = (over: Partial<PaymentDetailMock> = {}): PaymentDetailMock => ({
  __typename: 'PaymentDetail',
  payment: makeDetailPayment(),
  finalize_state: 'CORE_DONE',
  finalize_attempts: 2,
  finalized_at: null,
  finalize_error: 'Receipt e-mail: SMTP timeout after 30s',
  needs_refund: false,
  can_retry_finalize: false,
  retryable_step_keys: ['RECEIPT_EMAIL'],
  steps: [
    makeStep(),
    receiptStep(),
    makeStep({ key: 'MEMBERSHIP', label: 'Booking created', segment: 'POD', refs: ['mem_7788'] }),
    makeStep({ key: 'TICKET_EMAIL', label: 'Entry ticket e-mailed', status: 'PENDING', segment: 'POD', at: null, refs: [] }),
  ],
  artifacts: [
    makeArtifact(),
    receiptArtifact(),
    makeArtifact({ key: 'POD_SEAT', label: 'Seat held in the pod', segment: 'POD', refs: ['2 booked', '14/20'] }),
    makeArtifact({ key: 'POD_TICKET', label: 'Entry ticket issued', segment: 'POD', refs: ['TKT-7788', 'ACTIVE'] }),
    makeArtifact({ key: 'PRODUCT_ORDER', label: 'Product order(s)', segment: 'PRODUCT', created: false, count: 0, refs: [], not_applicable: true }),
    makeArtifact({ key: 'GIFT_CARD_ISSUED', label: 'Gift card issued', segment: 'GIFT_CARD', created: false, count: 0, refs: [], not_applicable: true }),
  ],
  coins: [makeCoinLine(), makeCoinLine({ type: 'CREDIT', amount: 20, balance_after: 140, reason: 'Earned on DUN-PAY-4821', earn_pct: 2 })],
  coupon: makeCoupon(),
  pod_booking: makePodBooking(),
  product_orders: [],
  gift_card: null,
  original_total: 1150,
  coins_redeemed: 50,
  coins_earned: 20,
  // Nothing refunded: the Refund area is hidden. Every fixture carries the
  // field, because the page's one query selects it.
  refunds: [],
  ...over,
});

export const REFUND_PAID_AT = '2026-09-03T08:15:00.000Z';

/** One refund of a pod payment queued to Razorpay and still owed (the yellow state). */
export const makeRefundEntry = (over: Partial<RefundEntryMock> = {}): RefundEntryMock => ({
  __typename: 'PaymentRefundEntry',
  id: 'gr1',
  ref: 'DUN-PAY-4821',
  source: 'FINANCE_REFUND',
  status: 'FAILED',
  state: 'PENDING',
  amount: 1000,
  coins: 0,
  razorpay_refund_id: 'rfnd_Aa11',
  razorpay_refund_ids: ['rfnd_Aa11'],
  razorpay_payment_id: 'pay_Nx12Razor',
  initiated_by: 'Meera Finance',
  reason: 'Pod cancelled by the host',
  error: null,
  attempts: 2,
  requested_at: REFUND_PAID_AT,
  processed_at: null,
  due_at: null,
  can_refund: true,
  ...over,
});

export const makeRefundEvent = (over: Partial<RefundEventMock> = {}): RefundEventMock => ({
  __typename: 'PaymentEvent',
  id: 'ev1',
  type: 'REFUND_REQUESTED',
  source: 'FINANCE',
  actor_name: 'Meera Finance',
  details: [{ __typename: 'PaymentEventDetail', key: 'note', value: 'Customer waited three days' }],
  created_at: REFUND_PAID_AT,
  ...over,
});

export const makeRefundSection = (over: Partial<RefundSectionMock> = {}): RefundSectionMock => ({
  __typename: 'PaymentRefundSection',
  kind: 'POD_PAYMENT',
  state: 'PENDING',
  amount: 1000,
  coins: 0,
  entries: [makeRefundEntry()],
  events: [],
  ...over,
});

/** A refund already back with the buyer (the folded, uncoloured state). */
export const completedRefundSection = (over: Partial<RefundSectionMock> = {}): RefundSectionMock =>
  makeRefundSection({
    kind: 'POD_SHOP',
    state: 'COMPLETED',
    amount: 250,
    entries: [
      makeRefundEntry({
        id: 'po1',
        ref: 'DUN-ORD-1001',
        source: 'CANCELLATION',
        status: 'PROCESSED',
        state: 'COMPLETED',
        amount: 250,
        razorpay_refund_id: 'rfnd_Bb22',
        razorpay_refund_ids: ['rfnd_Bb22'],
        attempts: 0,
        processed_at: REFUND_PAID_AT,
        can_refund: false,
      }),
    ],
    ...over,
  });

/** The same payment once the owed refund was sent: the section is now complete. */
export const makeRefundedDetail = (): PaymentDetailMock =>
  makePaymentDetail({
    payment: makeDetailPayment({ status: 'REFUNDED', razorpay_refund_ids: ['rfnd_Aa11'] }),
    refunds: [
      makeRefundSection({
        state: 'COMPLETED',
        entries: [makeRefundEntry({ status: 'SUCCEEDED', state: 'COMPLETED', can_refund: false, processed_at: REFUND_PAID_AT })],
        events: [makeRefundEvent()],
      }),
    ],
  });

/** The same payment once the receipt re-run landed: nothing left to retry. */
export const makeRepairedDetail = (): PaymentDetailMock => {
  const base = makePaymentDetail();
  return {
    ...base,
    finalize_state: 'COMPLETE',
    finalize_attempts: 3,
    finalize_error: null,
    retryable_step_keys: [],
    steps: base.steps.map((step): StepMock =>
      step.key === 'RECEIPT_EMAIL' ? { ...step, status: 'DONE', detail: 'Sent to riya@duncit.com', can_retry: false } : step,
    ),
    artifacts: base.artifacts.map((row): ArtifactMock =>
      row.key === 'RECEIPT_EMAIL' ? { ...row, created: true, count: 1, refs: ['riya@duncit.com'], retry_key: null } : row,
    ),
  };
};

export const paymentDetailMock = (
  detail: PaymentDetailMock = makePaymentDetail(),
  over: { delay?: number } = {},
): MockedResponse => ({
  request: { query: PAYMENT_DETAIL, variables: () => true },
  ...(over.delay ? { delay: over.delay } : {}),
  result: { data: { paymentDetail: detail } },
});

export const paymentDetailErrorMock = (): MockedResponse => ({
  request: { query: PAYMENT_DETAIL, variables: () => true },
  error: new Error('payment lookup failed'),
});

export const RETRY_REFUSED = 'RECEIPT_EMAIL refused: mail provider is down';

export const retryPaymentStepsMock = (
  over: { detail?: PaymentDetailMock; fail?: boolean; delay?: number } = {},
): MockedResponse => ({
  request: { query: RETRY_PAYMENT_STEPS, variables: () => true },
  ...(over.delay ? { delay: over.delay } : {}),
  result: over.fail
    ? { errors: [new GraphQLError(RETRY_REFUSED)] }
    : { data: { retryPaymentSteps: over.detail ?? makeRepairedDetail() } },
});

export const REFUND_REFUSED = 'Razorpay refused the refund: payment already fully refunded';

/** The mutation answering with the refreshed audit, or with a refusal. `variables` sees the input the page sent. */
export const refundPaymentToSourceMock = (
  over: {
    detail?: PaymentDetailMock;
    fail?: boolean;
    delay?: number;
    variables?: (input: Record<string, unknown>) => boolean;
  } = {},
): MockedResponse => ({
  request: {
    query: REFUND_PAYMENT_TO_SOURCE,
    variables: ({ input }: { input: Record<string, unknown> }) => (over.variables ? over.variables(input) : true),
  },
  ...(over.delay ? { delay: over.delay } : {}),
  result: over.fail
    ? { errors: [new GraphQLError(REFUND_REFUSED)] }
    : { data: { refundPaymentToSource: over.detail ?? makeRefundedDetail() } },
});
