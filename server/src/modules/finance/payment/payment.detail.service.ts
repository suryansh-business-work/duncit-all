import { PodModel, type IPod } from '@modules/pods/pod/pod.model';
import { normalizeSeats, podSeatsTaken } from '@modules/pods/pod/pod.seats';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import {
  LeaderboardPointModel,
  getLeaderboardSettings,
} from '@modules/engagement/leaderboard/leaderboard.model';
import { ProductOrderModel, type IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { CoinTransactionModel, type ICoinTransaction } from '@modules/finance/coin/coin.model';
import { CouponModel, type ICoupon } from '@modules/finance/coupon/coupon.model';
import { ShortLinkClickModel } from '@modules/crm/marketing/shortLinkClick.model';
import { PaymentModel, type IPayment, type PaymentStepKey } from './payment.model';
import { toPub } from './payment.service';

/**
 * The audit behind Finance > Payment Logs > detail.
 *
 * `payment.steps` is what the finalizer BELIEVES it did — a log, not evidence. A
 * step can read DONE while the document it claims to have written is gone (a
 * rolled-back transaction, a hand-edited record), and a payment captured before
 * this feature shipped carries no steps at all. So every artifact below is built
 * by READING THE DOCUMENT BACK: a green tick means "this exists in the database
 * right now", nothing weaker.
 *
 * The few artifacts that leave NO document to read — an e-mail, a bump of a
 * counter shared with every other payment, a ledger row keyed on the pod rather
 * than the payment — fall back to the step (see `stepEvidence`), and go GREY
 * rather than red when even that is missing. A row this page cannot settle must
 * never be reported as a failure: a tick that lies and a cross that lies are the
 * same bug.
 */

/** Pipeline steps in execution order — the order the detail table renders them. */
const STEP_LABELS: Record<PaymentStepKey, string> = {
  PAYMENT_CAPTURED: 'Payment captured',
  INVOICE_NUMBER: 'Invoice number issued',
  SEATS_CLAIMED: 'Seats claimed on the pod',
  MEMBERSHIP: 'Booking created',
  TICKET: 'Entry ticket issued',
  LEADERBOARD_POINTS: 'Leaderboard points awarded',
  PRODUCT_ORDERS: 'Product orders created',
  STOCK_ADJUSTED: 'Stock adjusted',
  GIFT_CARD_ISSUED: 'Gift card issued',
  COUPON_REDEEMED: 'Coupon redemption counted',
  COINS_REDEEMED: 'Duncit Coins spent',
  COINS_EARNED: 'Duncit Coins earned',
  BACKOUT_FILL: 'Backout spot filled',
  LINK_ATTRIBUTION: 'Marketing attribution',
  TICKET_EMAIL: 'Entry ticket e-mailed',
  INVOICE_PDF: 'Invoice PDF generated',
  RECEIPT_EMAIL: 'Receipt e-mailed',
  GIFT_CARD_EMAIL: 'Gift card e-mailed',
  SHIPMENT: 'Shipment booked',
  PAYMENT_FAILED_NOTICE: 'Buyer told the payment failed',
};

const STEP_ORDER = Object.keys(STEP_LABELS) as PaymentStepKey[];

const ARTIFACT_LABELS = {
  TICKET_PAYMENT: 'Payment recorded',
  INVOICE: 'Invoice number issued',
  POD_SEAT: 'Seat held in the pod',
  POD_MEMBERSHIP: 'Booking (pod member)',
  POD_TICKET: 'Entry ticket issued',
  LEADERBOARD_POINTS: 'Leaderboard points',
  PRODUCT_ORDER: 'Product order(s)',
  STOCK_ADJUSTED: 'Stock adjusted',
  COUPON_REDEEMED: 'Coupon redemption counted',
  COINS_REDEEMED: 'Coins spent',
  COINS_EARNED: 'Coins earned back',
  LINK_ATTRIBUTION: 'Marketing attribution',
  RECEIPT_EMAIL: 'Receipt e-mailed',
  SHIPMENT: 'Shipment booked',
} as const;

type ArtifactKey = keyof typeof ARTIFACT_LABELS;

export interface PaymentArtifact {
  key: ArtifactKey;
  label: string;
  created: boolean;
  count: number;
  refs: string[];
  not_applicable: boolean;
}

export interface PaymentStepPub {
  key: PaymentStepKey;
  label: string;
  status: string;
  detail: string;
  refs: string[];
  at: string | null;
}

export interface PaymentCoinLine {
  type: string;
  amount: number;
  balance_after: number;
  source: string;
  reason: string;
  earn_pct: number;
  at: string;
}

export interface PaymentCouponInfo {
  code: string;
  discount: number;
  discount_type: string;
  discount_value: number;
  title: string;
  still_exists: boolean;
}

export interface PaymentPodBooking {
  pod_id: string;
  pod_title: string;
  pod_date_time: string | null;
  seats: number;
  membership_id: string | null;
  membership_status: string | null;
  ticket_code: string | null;
  ticket_status: string | null;
}

export interface PaymentProductOrderLine {
  id: string;
  order_no: string;
  fulfilment_method: string;
  fulfilment_status: string;
  total: number;
  item_count: number;
  awb: string | null;
}

export interface PaymentDetailResult {
  payment: unknown;
  finalize_state: string;
  finalize_attempts: number;
  finalized_at: string | null;
  finalize_error: string | null;
  needs_refund: boolean;
  steps: PaymentStepPub[];
  artifacts: PaymentArtifact[];
  coins: PaymentCoinLine[];
  coupon: PaymentCouponInfo | null;
  pod_booking: PaymentPodBooking | null;
  product_orders: PaymentProductOrderLine[];
  original_total: number;
  coins_redeemed: number;
  coins_earned: number;
}

/** The booking row keyed on this payment — the seat evidence scoped to it. */
type AuditMembership = { _id: unknown; status: string; seats: number };

const artifact = (key: ArtifactKey, created: boolean, refs: string[], count: number): PaymentArtifact => ({
  key,
  label: ARTIFACT_LABELS[key],
  created,
  count,
  refs,
  not_applicable: false,
});

/** A row that never applied to this payment — grey on the screen, never red. */
const notApplicable = (key: ArtifactKey): PaymentArtifact => ({
  key,
  label: ARTIFACT_LABELS[key],
  created: false,
  count: 0,
  refs: [],
  not_applicable: true,
});

/** What the pipeline log can say about one artifact. */
interface StepEvidence {
  /** The step recorded itself DONE for THIS payment. */
  done: boolean;
  /** The payment carries no steps at all — it was finalized before step
   * tracking shipped, so nothing here can prove or disprove the work. */
  predates_tracking: boolean;
}

/**
 * Evidence for the artifacts with no document to read back — an e-mail, a bump
 * of a counter shared with every other payment, a ledger row keyed on the pod
 * rather than the payment. For those the pipeline step is the only
 * PAYMENT-SCOPED record, so it decides the tick; and a payment finalized before
 * step tracking existed goes grey rather than accusing the pipeline of a
 * failure nothing can show.
 */
function stepEvidence(payment: IPayment, key: PaymentStepKey): StepEvidence {
  const steps = payment.steps ?? [];
  return {
    done: steps.some((s) => s.key === key && s.status === 'DONE'),
    predates_tracking: steps.length === 0,
  };
}

/** Units the checkout was priced for, off the frozen product lines. */
const metaProductLines = (payment: IPayment): Record<string, unknown>[] => {
  const lines = (payment.metadata as Record<string, unknown> | undefined)?.product_lines;
  return Array.isArray(lines) ? (lines as Record<string, unknown>[]) : [];
};

const orderedUnits = (orders: IProductOrder[]): number =>
  orders.reduce((sum, o) => sum + o.line_items.reduce((n, l) => n + Number(l.qty || 0), 0), 0);

function paymentArtifact(payment: IPayment): PaymentArtifact {
  // A refund does not un-capture the money: it landed, then it was given back —
  // and a refund investigation is the likeliest reason this page is open, so the
  // capture row must not accuse it of never having been paid. The refund shows
  // in the reference instead.
  const refunded = payment.status === 'REFUNDED';
  const captured = payment.status === 'SUCCESS' || refunded;
  const refs = refunded ? [payment.payment_id, 'REFUNDED'] : [payment.payment_id];
  return artifact('TICKET_PAYMENT', captured, refs, captured ? 1 : 0);
}

function invoiceArtifact(payment: IPayment): PaymentArtifact {
  const issued = Boolean(payment.invoice_no);
  return artifact('INVOICE', issued, issued ? [payment.invoice_no!] : [], issued ? 1 : 0);
}

function podSeatArtifact(
  payment: IPayment,
  pod: IPod | null,
  membership: AuditMembership | null
): PaymentArtifact {
  if (!payment.pod_id) return notApplicable('POD_SEAT');
  // The pod itself can be gone (deleted after the sale) — that is a real red row.
  if (!pod) return artifact('POD_SEAT', false, [], 0);
  // `pod_attendees` cannot answer this: it is an identity list carrying the
  // buyer once whatever they hold, and it carries them for reasons this payment
  // never created (they host the pod, they joined free, an earlier payment) —
  // and it drops them the moment they back out of a perfectly settled booking.
  // The booking row keyed on this payment is the payment-scoped evidence; the
  // pod's occupancy is context beside it, never the verdict.
  const occupancy = `${podSeatsTaken(pod)}/${pod.no_of_spots} seats`;
  if (!membership) return artifact('POD_SEAT', false, [occupancy], 0);
  return artifact('POD_SEAT', true, [`${membership.seats} booked`, occupancy], 1);
}

function membershipArtifact(payment: IPayment, membership: AuditMembership | null): PaymentArtifact {
  if (!payment.pod_id) return notApplicable('POD_MEMBERSHIP');
  if (!membership) return artifact('POD_MEMBERSHIP', false, [], 0);
  return artifact('POD_MEMBERSHIP', true, [String(membership._id), membership.status], 1);
}

function ticketArtifact(
  payment: IPayment,
  ticket: { ticket_code: string; status: string } | null
): PaymentArtifact {
  if (!payment.pod_id) return notApplicable('POD_TICKET');
  if (!ticket) return artifact('POD_TICKET', false, [], 0);
  return artifact('POD_TICKET', true, [ticket.ticket_code, ticket.status], 1);
}

function pointsArtifact(
  payment: IPayment,
  points: { points: number }[],
  joinPoints: number
): PaymentArtifact {
  // Only a pod join earns the buyer points; a product-only payment has no board.
  if (!payment.pod_id) return notApplicable('LEADERBOARD_POINTS');
  // A join priced at 0 is the admin switching that board's reward off, and
  // `leaderboardService.award()` then deliberately writes NOTHING — so on a
  // platform with the reward off there is no row to miss, and a red tick would
  // report correct behaviour as a failure. The finalizer still records the step
  // DONE in that case, which is why the price is checked before the step.
  if (joinPoints <= 0) return notApplicable('LEADERBOARD_POINTS');
  // The ledger keys on (board, user, POD_JOIN, pod) and never on the payment, so
  // an earlier join on the same pod — a rejoin after a backout, a free seat —
  // would draw a tick for points THIS payment never earned. The step is the only
  // payment-scoped record; the ledger rows ride along as informational refs.
  const evidence = stepEvidence(payment, 'LEADERBOARD_POINTS');
  return {
    key: 'LEADERBOARD_POINTS',
    label: ARTIFACT_LABELS.LEADERBOARD_POINTS,
    created: evidence.done,
    count: evidence.done ? 1 : 0,
    refs: points.map((p) => `${p.points} pts`),
    not_applicable: evidence.predates_tracking,
  };
}

function productOrderArtifact(payment: IPayment, orders: IProductOrder[]): PaymentArtifact {
  if (metaProductLines(payment).length === 0) return notApplicable('PRODUCT_ORDER');
  return artifact(
    'PRODUCT_ORDER',
    orders.length > 0,
    orders.map((o) => o.order_no),
    orders.length
  );
}

function stockArtifact(payment: IPayment, orders: IProductOrder[]): PaymentArtifact {
  const lines = metaProductLines(payment);
  if (lines.length === 0) return notApplicable('STOCK_ADJUSTED');
  // Stock now leaves inventory inside the same transaction that writes the
  // order, so the orders ARE the adjustment: every paid unit having landed on an
  // order is what proves the deduction happened.
  const expected = lines.reduce((sum, l) => sum + Number(l.quantity || 0), 0);
  const units = orderedUnits(orders);
  return artifact('STOCK_ADJUSTED', units > 0 && units === expected, [`${units} units`], units);
}

function couponArtifact(payment: IPayment, coupon: ICoupon | null): PaymentArtifact {
  const code = payment.coupon_code;
  if (!code) return notApplicable('COUPON_REDEEMED');
  // A redemption leaves no document of its own — `used_count` is a bare counter
  // on a shared coupon, so the coupon merely existing says nothing about THIS
  // payment and the coupon being deleted afterwards is not this payment's
  // failure. The pipeline step is the only per-payment record, and a payment
  // captured before the step existed can neither prove nor disprove it, so it
  // stays grey rather than accusing.
  const evidence = stepEvidence(payment, 'COUPON_REDEEMED');
  const refs = coupon ? [coupon.code, `${coupon.used_count} redemptions`] : [code];
  return {
    key: 'COUPON_REDEEMED',
    label: ARTIFACT_LABELS.COUPON_REDEEMED,
    created: evidence.done,
    count: evidence.done ? 1 : 0,
    refs,
    not_applicable: evidence.predates_tracking,
  };
}

function coinsSpentArtifact(payment: IPayment, debit: ICoinTransaction | undefined): PaymentArtifact {
  if ((payment.coins_redeemed ?? 0) <= 0) return notApplicable('COINS_REDEEMED');
  if (!debit) return artifact('COINS_REDEEMED', false, [], 0);
  return artifact('COINS_REDEEMED', true, [`${debit.amount} coins`], 1);
}

function coinsEarnedArtifact(payment: IPayment, credit: ICoinTransaction | undefined): PaymentArtifact {
  // A 0% rate, or a spend too small to round up to one coin, earns nothing and
  // deliberately leaves no ledger row — that is not a failure.
  if (!credit && (payment.coins_earned ?? 0) <= 0) return notApplicable('COINS_EARNED');
  if (!credit) return artifact('COINS_EARNED', false, [], 0);
  return artifact('COINS_EARNED', true, [`${credit.amount} coins`], 1);
}

function attributionArtifact(click: { code: string; click_id: string } | null): PaymentArtifact {
  // Most buyers followed no short link, so an absent click is normal, not a gap.
  if (!click) return notApplicable('LINK_ATTRIBUTION');
  return artifact('LINK_ATTRIBUTION', true, [click.code, click.click_id], 1);
}

/** Named so the reference column says WHY the row is grey, not just that it is. */
const PREDATES_STEPS_REF = 'predates step tracking';

function receiptArtifact(payment: IPayment): PaymentArtifact {
  // An e-mail leaves no document to read back, so the step is the only record —
  // and every payment finalized before step tracking shipped has none at all.
  // Those receipts were almost certainly sent; with nothing that can settle it
  // either way the row goes grey rather than accusing the pipeline.
  const evidence = stepEvidence(payment, 'RECEIPT_EMAIL');
  const refs = evidence.predates_tracking
    ? [payment.user_email, PREDATES_STEPS_REF]
    : [payment.user_email];
  return {
    key: 'RECEIPT_EMAIL',
    label: ARTIFACT_LABELS.RECEIPT_EMAIL,
    created: evidence.done,
    count: evidence.done ? 1 : 0,
    refs,
    not_applicable: evidence.predates_tracking,
  };
}

function shipmentArtifact(orders: IProductOrder[]): PaymentArtifact {
  const shipping = orders.filter((o) => o.fulfilment_method === 'SHIP');
  if (shipping.length === 0) return notApplicable('SHIPMENT');
  const awbs = shipping.map((o) => o.shiprocket?.awb ?? '').filter(Boolean);
  return artifact('SHIPMENT', awbs.length === shipping.length, awbs, shipping.length);
}

interface AuditReads {
  pod: IPod | null;
  membership: AuditMembership | null;
  ticket: { ticket_code: string; status: string } | null;
  orders: IProductOrder[];
  points: { points: number }[];
  coins: ICoinTransaction[];
  coupon: ICoupon | null;
  click: { code: string; click_id: string } | null;
  /** What a pod join is priced at right now. 0 means the admin turned that
   * board's reward off, so nothing was ever supposed to be written. */
  join_points: number;
}

function buildArtifacts(payment: IPayment, reads: AuditReads): PaymentArtifact[] {
  const debit = reads.coins.find((c) => c.type === 'DEBIT');
  const credit = reads.coins.find((c) => c.type === 'CREDIT');
  return [
    paymentArtifact(payment),
    invoiceArtifact(payment),
    podSeatArtifact(payment, reads.pod, reads.membership),
    membershipArtifact(payment, reads.membership),
    ticketArtifact(payment, reads.ticket),
    pointsArtifact(payment, reads.points, reads.join_points),
    productOrderArtifact(payment, reads.orders),
    stockArtifact(payment, reads.orders),
    couponArtifact(payment, reads.coupon),
    coinsSpentArtifact(payment, debit),
    coinsEarnedArtifact(payment, credit),
    attributionArtifact(reads.click),
    receiptArtifact(payment),
    shipmentArtifact(reads.orders),
  ];
}

/** The recorded steps, in execution order. A payment finalized before this
 * feature shipped has none — nothing is synthesized, the artifacts carry the
 * truth on their own. */
function buildSteps(payment: IPayment): PaymentStepPub[] {
  const recorded = payment.steps ?? [];
  return STEP_ORDER.flatMap((key) => {
    const step = recorded.find((s) => s.key === key);
    if (!step) return [];
    return [
      {
        key,
        label: STEP_LABELS[key],
        status: step.status,
        detail: step.detail ?? '',
        refs: step.refs ?? [],
        at: step.at ? step.at.toISOString() : null,
      },
    ];
  });
}

function buildCoupon(payment: IPayment, coupon: ICoupon | null): PaymentCouponInfo | null {
  if (!payment.coupon_code) return null;
  return {
    code: payment.coupon_code,
    discount: payment.coupon_discount ?? 0,
    // Coupons are percentage-only today; the pair is spelt out so a future flat
    // discount does not need the screen changed.
    discount_type: 'PERCENT',
    discount_value: coupon?.discount_pct ?? 0,
    title: coupon?.description ?? '',
    still_exists: Boolean(coupon),
  };
}

function buildPodBooking(payment: IPayment, reads: AuditReads): PaymentPodBooking | null {
  if (!payment.pod_id) return null;
  const meta = payment.metadata as Record<string, unknown> | undefined;
  return {
    pod_id: String(payment.pod_id),
    pod_title: reads.pod?.pod_title ?? '',
    pod_date_time: reads.pod?.pod_date_time?.toISOString() ?? null,
    // Seats come off the payment's own metadata, frozen when it was priced.
    seats: normalizeSeats(meta?.seats ?? 1),
    membership_id: reads.membership ? String(reads.membership._id) : null,
    membership_status: reads.membership?.status ?? null,
    ticket_code: reads.ticket?.ticket_code ?? null,
    ticket_status: reads.ticket?.status ?? null,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The gross the cart was worth before the coupon and the coins came off — the
 * top line of the amount waterfall, which then SUBTRACTS both from it.
 *
 * `metadata.original_total` is that number frozen at checkout, but it only
 * exists on payments priced after the key shipped. `payment.total` is not a
 * fallback for it: the total is already net of the coupon and the coins, so
 * using it makes the card subtract them a second time and show a bill that does
 * not add up. Older rows are reconstructed by adding them back instead.
 */
function originalTotal(payment: IPayment, meta: Record<string, unknown> | undefined): number {
  const frozen = Number(meta?.original_total ?? Number.NaN);
  if (Number.isFinite(frozen)) return frozen;
  return round2(payment.total + (payment.coupon_discount ?? 0) + (payment.coins_redeemed ?? 0));
}

const toOrderLine = (o: IProductOrder): PaymentProductOrderLine => ({
  id: String(o._id),
  order_no: o.order_no,
  fulfilment_method: o.fulfilment_method,
  fulfilment_status: o.fulfilment_status,
  total: o.total,
  item_count: o.line_items.reduce((n, l) => n + Number(l.qty || 0), 0),
  awb: o.shiprocket?.awb || null,
});

const toCoinLine = (c: ICoinTransaction): PaymentCoinLine => ({
  type: c.type,
  amount: c.amount,
  balance_after: c.balance_after,
  source: c.source,
  reason: c.reason ?? '',
  earn_pct: c.earn_pct ?? 0,
  at: c.created_at?.toISOString?.() ?? '',
});

/** Everything the audit reads back, in one round trip. */
async function loadAuditReads(payment: IPayment): Promise<AuditReads> {
  const podId = payment.pod_id;
  const reads = await Promise.all([
    podId
      ? PodModel.findById(podId).select('pod_title pod_date_time pod_attendees extra_seats no_of_spots')
      : null,
    PodMemberModel.findOne({ payment_id: payment._id }).select('_id status seats'),
    TicketModel.findOne({ payment_id: payment._id }).select('ticket_code status'),
    ProductOrderModel.find({ payment_id: payment._id }).sort({ created_at: 1 }),
    podId
      ? LeaderboardPointModel.find({
          source_id: String(podId),
          user_id: payment.user_id,
          source_type: 'POD_JOIN',
        }).select('points')
      : [],
    // The coin ledger keys on the payment's BUSINESS id, not its document id.
    CoinTransactionModel.find({ payment_id: payment.payment_id }).sort({ created_at: 1 }),
    payment.coupon_code ? CouponModel.findOne({ code: payment.coupon_code }) : null,
    // `converted_payment_id` is the retired single-payment slot: payments made
    // before a click could hold more than one still live there, and only there.
    ShortLinkClickModel.findOne({
      $or: [
        { 'conversions.payment_id': payment._id },
        { converted_payment_id: payment._id },
      ],
    }).select('code click_id'),
    // The live economics, not what they were when the payment landed: a board
    // switched off retro-greys its rows, which is the honest reading — an award
    // that was never written cannot be produced later either.
    getLeaderboardSettings(),
  ]);
  const [pod, membership, ticket, orders, points, coins, coupon, click, leaderboard] = reads;
  // Mirrors leaderboard.service's own `pointsFor`: 0 (and anything unusable) is
  // the reward switched off, which is a legal setting, not a missing value.
  const joinPoints = Math.floor(Number(leaderboard.points_per_join));
  return {
    pod,
    membership,
    ticket,
    orders,
    points,
    coins,
    coupon,
    click,
    join_points: Number.isFinite(joinPoints) ? joinPoints : 0,
  };
}

export const paymentDetailService = {
  /** Null when the payment does not exist — the resolver turns that into NOT_FOUND. */
  async detail(paymentDocId: string): Promise<PaymentDetailResult | null> {
    const payment = await PaymentModel.findById(paymentDocId);
    if (!payment) return null;

    const reads = await loadAuditReads(payment);
    const meta = payment.metadata as Record<string, unknown> | undefined;
    const credit = reads.coins.find((c) => c.type === 'CREDIT');

    return {
      // The list query's own mapper, applied to the document already in hand —
      // `paymentService.getById` would read the same row a second time.
      payment: toPub(payment),
      finalize_state: payment.finalize_state,
      finalize_attempts: payment.finalize_attempts,
      finalized_at: payment.finalized_at ? payment.finalized_at.toISOString() : null,
      finalize_error: payment.finalize_error,
      needs_refund: payment.needs_refund,
      steps: buildSteps(payment),
      artifacts: buildArtifacts(payment, reads),
      coins: reads.coins.map(toCoinLine),
      coupon: buildCoupon(payment, reads.coupon),
      pod_booking: buildPodBooking(payment, reads),
      product_orders: reads.orders.map(toOrderLine),
      original_total: originalTotal(payment, meta),
      coins_redeemed: payment.coins_redeemed ?? 0,
      // The payment field mirrors the CREDIT row and only since this feature
      // shipped, so the ledger row — the thing that actually moved the balance —
      // is what the screen reports.
      coins_earned: credit?.amount ?? payment.coins_earned ?? 0,
    };
  },
};
