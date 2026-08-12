import { GraphQLError } from 'graphql';
import type { ClientSession } from 'mongoose';
import {
  PaymentModel,
  type IPayment,
  type IPaymentStep,
  type PaymentStepKey,
  type PaymentStepStatus,
} from './payment.model';
import { invoiceDataForPayment } from './payment.invoice';
import { withTransaction } from '@utils/mongoTransaction';
import { getFinanceSettings, nextInvoiceNumber } from '@modules/finance/finance/finance.model';
import { coinService } from '@modules/finance/coin/coin.service';
import { couponService } from '@modules/finance/coupon/coupon.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { claimSeats } from '@modules/pods/pod/pod.seats.service';
import { normalizeSeats } from '@modules/pods/pod/pod.seats';
import { PodMemberModel, type IPodMember } from '@modules/pods/podMember/podMember.model';
import { fillBackoutsAfterJoin, podMemberService } from '@modules/pods/podMember/podMember.service';
import { ticketService } from '@modules/pods/ticket/ticket.service';
import { leaderboardService } from '@modules/engagement/leaderboard/leaderboard.service';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { productOrderService } from '@modules/commerce/productOrder/productOrder.service';
import { generateInvoicePdf } from '@services/invoice/invoice.pdf';
import { sendEmail } from '@services/email/email.service';
import { bookingLinkUrl, getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';

/**
 * What checkout does once the money is in — as one transaction, then the rest.
 *
 * Before this, eight independent best-effort side effects ran in sequence after
 * the charge: any one could fail silently and leave a membership with no ticket,
 * coins debited against no booking, or stock decremented for an order that was
 * never written. And the slow ones — PDF, SMTP, the ShipRocket HTTP call — ran
 * inside the GraphQL mutation, which is why verifying a Razorpay payment timed
 * out for the buyer.
 *
 * Phase 1 is the ACID core: the seat, the membership, the ticket, the orders,
 * the stock, the coins and the coupon commit together or not at all. Phase 2 is
 * everything the booking does not depend on, run afterwards, recorded step by
 * step, and safe to re-run until it lands.
 */

/** Execution order — the audit trail reads top to bottom in this order. */
const STEP_ORDER: PaymentStepKey[] = [
  'PAYMENT_CAPTURED',
  'INVOICE_NUMBER',
  'SEATS_CLAIMED',
  'MEMBERSHIP',
  'TICKET',
  'LEADERBOARD_POINTS',
  'PRODUCT_ORDERS',
  'STOCK_ADJUSTED',
  'COUPON_REDEEMED',
  'COINS_REDEEMED',
  'COINS_EARNED',
  'BACKOUT_FILL',
  'LINK_ATTRIBUTION',
  'TICKET_EMAIL',
  'INVOICE_PDF',
  'RECEIPT_EMAIL',
  'SHIPMENT',
];

/** The pod leg's steps — all skipped together on a payment with no pod. */
const POD_STEP_KEYS: PaymentStepKey[] = [
  'SEATS_CLAIMED',
  'MEMBERSHIP',
  'TICKET',
  'LEADERBOARD_POINTS',
];

/** Deferred steps, seeded PENDING by the core so the audit lists what it owes. */
const DEFERRED_STEP_KEYS: PaymentStepKey[] = [
  'BACKOUT_FILL',
  'LINK_ATTRIBUTION',
  'TICKET_EMAIL',
  'INVOICE_PDF',
  'RECEIPT_EMAIL',
  'SHIPMENT',
];

/**
 * How long one phase-2 run may hold the payment. The fire-and-forget run and the
 * reconciler's sweep both come for the same row, and phase 2 books a courier and
 * sends e-mail — work no `isDone` check can undo once it has left the process.
 * Long enough to cover a slow PDF + SMTP + two ShipRocket round trips.
 */
const SIDE_EFFECT_LEASE_MS = 5 * 60_000;

const NO_POD_DETAIL = 'This payment has no pod';
const NO_PRODUCTS_DETAIL = 'This payment has no products';

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error) || 'Unknown error';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Replace one step by key, keeping the contract's execution order. Immutable so
 * both phases write steps the same way and neither can half-mutate the array it
 * is about to persist.
 */
function recordStep(
  steps: IPaymentStep[],
  key: PaymentStepKey,
  status: PaymentStepStatus,
  detail = '',
  refs: string[] = []
): IPaymentStep[] {
  return [...steps.filter((s) => s.key !== key), { key, status, detail, refs, at: new Date() }].sort(
    (a, b) => STEP_ORDER.indexOf(a.key) - STEP_ORDER.indexOf(b.key)
  );
}

/** Mongoose subdocuments do not survive a `$set` round trip — plain them out. */
const toPlainStep = (s: IPaymentStep): IPaymentStep => ({
  key: s.key,
  status: s.status,
  detail: s.detail ?? '',
  refs: [...(s.refs ?? [])],
  at: s.at ?? null,
});

const isDone = (steps: IPaymentStep[], key: PaymentStepKey) =>
  steps.some((s) => s.key === key && s.status === 'DONE');

/* ------------------------------------------------------------------ *
 * Phase 1 — the ACID core
 * ------------------------------------------------------------------ */

interface CoreContext {
  payment: IPayment;
  session: ClientSession | undefined;
  steps: IPaymentStep[];
  coinsEarned: number;
  /** Allocated before the transaction opened — see `allocateInvoiceNumber`.
   * Null when the payment already carries one. */
  invoiceNo: string | null;
}

function step(
  ctx: CoreContext,
  key: PaymentStepKey,
  status: PaymentStepStatus,
  detail = '',
  refs: string[] = []
): void {
  ctx.steps = recordStep(ctx.steps, key, status, detail, refs);
}

/** Promote the payment and give it its invoice number — the one place either
 * happens, so the dummy, free-settlement and Razorpay paths cannot disagree.
 * The number is only WRITTEN here; it was allocated before the transaction
 * opened, for the reason `allocateInvoiceNumber` sets out. */
function runCaptureLeg(ctx: CoreContext, methodLabel: string): void {
  const p = ctx.payment;
  if (p.status !== 'SUCCESS') {
    p.status = 'SUCCESS';
    p.paid_at = new Date();
  }
  // The label the gateway went by at capture time is recorded on the step: the
  // invoice PDF is written in phase 2, long after the sheet closed, and a stored
  // gateway name alone cannot say "Coupon (100% off)" or "Duncit Coins".
  step(ctx, 'PAYMENT_CAPTURED', 'DONE', methodLabel, [p.payment_id]);
  // One of the two is always there: the allocator hands over a number precisely
  // when the payment has none, and the only other case it declines — a payment
  // already finalized — returns out of `runCore` long before this leg.
  const invoiceNo = p.invoice_no ?? ctx.invoiceNo;
  if (!invoiceNo) {
    throw new GraphQLError('This payment could not be given an invoice number', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
  p.invoice_no = invoiceNo;
  step(ctx, 'INVOICE_NUMBER', 'DONE', '', [invoiceNo]);
}

/**
 * The seat and the membership row that holds it.
 *
 * Split out because the replay guard, the claim and the row are one indivisible
 * thought: the claim is an `$inc` and is the only write on this path that is not
 * idempotent, so a payment that has already booked must never reach it.
 */
async function claimAndRecordSeat(ctx: CoreContext, seats: number): Promise<IPodMember> {
  const p = ctx.payment;
  const podId = String(p.pod_id);
  const booked = await PodMemberModel.findOne({ payment_id: p._id })
    .select('_id')
    .session(ctx.session ?? null);
  if (booked) {
    step(ctx, 'SEATS_CLAIMED', 'SKIPPED', 'This payment had already claimed its seats', [podId]);
    step(ctx, 'MEMBERSHIP', 'DONE', 'Existing booking reused', [String(booked._id)]);
    return booked;
  }
  // A DIFFERENT booking for the same person on the same pod (two sheets opened at
  // once, a free join or a rejoin landing mid-checkout) must abort, not proceed:
  // `createPaidMembership` would hand back that other membership while the claim
  // below has already `$inc`d the pod's seat counter, so the pod would lose the
  // capacity permanently and this payment would commit SUCCESS holding nothing.
  // `assertNotAlreadyBooked` makes the same check at checkout creation; this is
  // the same rule re-asserted inside the transaction, where it is atomic.
  const rival = await PodMemberModel.findOne({
    pod_id: p.pod_id,
    user_id: p.user_id,
    status: { $in: ['JOINED', 'BACKOUT_IN_PROCESS'] },
  })
    .select('_id')
    .session(ctx.session ?? null);
  if (rival) {
    throw new GraphQLError(
      'This pod is already booked by this account — this payment is a duplicate',
      { extensions: { code: 'ALREADY_BOOKED' } }
    );
  }
  // A failed claim aborts the whole transaction: never book a seat nobody holds.
  await claimSeats(podId, String(p.user_id), seats, ctx.session);
  step(ctx, 'SEATS_CLAIMED', 'DONE', plural(seats, 'seat', 'seats'), [podId]);
  const membership = await podMemberService.createPaidMembership(
    podId,
    String(p.user_id),
    String(p._id),
    seats,
    ctx.session
  );
  step(ctx, 'MEMBERSHIP', 'DONE', '', [String(membership._id)]);
  return membership;
}

async function runPodLeg(ctx: CoreContext): Promise<void> {
  const p = ctx.payment;
  if (!p.pod_id) {
    for (const key of POD_STEP_KEYS) step(ctx, key, 'SKIPPED', NO_POD_DETAIL);
    return;
  }
  // Seats come off the payment's own metadata, frozen when the order was priced,
  // so a replay books exactly what was paid for and not what a client says now.
  const seats = normalizeSeats((p.metadata as Record<string, unknown>)?.seats ?? 1);
  const membership = await claimAndRecordSeat(ctx, seats);

  const ticket = await ticketService.ensureForMembership(String(membership._id), ctx.session);
  if (!ticket) {
    throw new GraphQLError('The booking could not be issued a ticket', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
  step(ctx, 'TICKET', 'DONE', ticket.ticket_code, [String(ticket._id)]);

  await leaderboardService.awardPodJoin(String(p.user_id), String(p.pod_id), ctx.session);
  step(ctx, 'LEADERBOARD_POINTS', 'DONE', '', [String(p.pod_id)]);
}

async function runProductLeg(ctx: CoreContext): Promise<void> {
  const lines = (ctx.payment.metadata as Record<string, unknown>)?.product_lines;
  if (!Array.isArray(lines) || lines.length === 0) {
    step(ctx, 'PRODUCT_ORDERS', 'SKIPPED', NO_PRODUCTS_DETAIL);
    step(ctx, 'STOCK_ADJUSTED', 'SKIPPED', NO_PRODUCTS_DETAIL);
    return;
  }
  // The order docs and the stock they consume move in the same transaction —
  // this is the bug it fixes: an order could exist with stock never decremented,
  // or the stock could go with no order behind it.
  const orders = await productOrderService.createFromPayment(ctx.payment, ctx.session);
  const orderIds = orders.map((o) => o.id);
  step(ctx, 'PRODUCT_ORDERS', 'DONE', plural(orders.length, 'order', 'orders'), orderIds);
  step(ctx, 'STOCK_ADJUSTED', 'DONE', plural(lines.length, 'line', 'lines'), orderIds);
}

async function runCoinLeg(ctx: CoreContext): Promise<void> {
  const p = ctx.payment;
  const reason = p.description || 'Purchase';
  const spent = p.coins_redeemed ?? 0;
  if (spent > 0) {
    const redeemed = await coinService.redeemForPayment({
      userId: String(p.user_id),
      paymentId: p.payment_id,
      coins: spent,
      reason,
      session: ctx.session,
    });
    // The discount was priced against a balance nothing reserved. If the debit
    // did not land the coins were spent elsewhere, and committing here would
    // hand out the reduction for free — as many times as sheets were opened.
    if (!redeemed) {
      throw new GraphQLError(
        'The Duncit Coins applied to this payment are no longer available — the booking was not created',
        { extensions: { code: 'COIN_BALANCE_CHANGED' } }
      );
    }
    step(ctx, 'COINS_REDEEMED', 'DONE', plural(spent, 'coin spent', 'coins spent'));
  } else {
    step(ctx, 'COINS_REDEEMED', 'SKIPPED', 'No coins were applied to this payment');
  }
  // Earned on `total`, which is already net of the coins spent, so coins can
  // never earn more coins.
  ctx.coinsEarned = await coinService.creditForPayment({
    userId: String(p.user_id),
    paymentId: p.payment_id,
    spendAmount: p.total,
    reason,
    // Pod tickets and shop orders earn at separately configured rates.
    targetType: p.target_type,
    session: ctx.session,
  });
  if (ctx.coinsEarned > 0) {
    step(ctx, 'COINS_EARNED', 'DONE', plural(ctx.coinsEarned, 'coin earned', 'coins earned'));
  } else {
    step(ctx, 'COINS_EARNED', 'SKIPPED', 'This purchase earned no coins');
  }
}

async function runCouponLeg(ctx: CoreContext): Promise<void> {
  const code = ctx.payment.coupon_code;
  if (!code) {
    step(ctx, 'COUPON_REDEEMED', 'SKIPPED', 'No coupon was applied');
    return;
  }
  // This used to sit at the CALL SITES, so it was skipped whenever finalization
  // threw — `used_count` could disagree with the payments that consumed it.
  //
  // It stays INSIDE the transaction, unlike the invoice counter: this document is
  // contended only by concurrent redemptions of the same coupon, which is rare,
  // and a rolled-back payment that left a redemption counted would quietly eat a
  // use of a limited coupon. Correctness wins over contention here.
  await couponService.recordRedemption(code, ctx.session);
  step(ctx, 'COUPON_REDEEMED', 'DONE', code, [code]);
}

/**
 * Take the payment's invoice number BEFORE the transaction opens.
 *
 * `nextInvoiceNumber` `$inc`s the FinanceSettings SINGLETON, so calling it from
 * inside the core makes any two concurrent checkouts anywhere on the platform
 * write the same document — a write conflict by construction. `withTransaction`
 * retries, but a burst can exhaust the retry window, and a throw out of the core
 * routes straight to `markFinalizeFailed`: captured money marked FAILED and
 * flagged for refund. A hot counter must never be able to fail a real payment,
 * so the number is allocated here — one uncontended, sessionless update — and
 * the core only writes the string it was handed, alongside status and paid_at.
 *
 * The trade is a GAP in the sequence whenever the core then rolls back: that
 * number is simply never used. Gaps are normal and auditable — every one of them
 * now has a `finalize_state: 'FAILED'` payment row explaining it — and a hole in
 * the numbering is strictly better than failing a payment whose money has
 * already been taken.
 *
 * Returns null when there is nothing to allocate: a payment that already carries
 * a number must not burn a second one on re-entry, and a replayed webhook over a
 * committed core (the state `runCore` returns early on) must not allocate at
 * all. Reading that state costs one cheap query and saves the counter from every
 * retried webhook on the platform.
 */
async function allocateInvoiceNumber(paymentDocId: string): Promise<string | null> {
  const current = await PaymentModel.findById(paymentDocId).select('invoice_no finalize_state');
  if (!current || current.invoice_no) return null;
  if (current.finalize_state === 'CORE_DONE' || current.finalize_state === 'COMPLETE') return null;
  return nextInvoiceNumber();
}

async function runCore(
  paymentDocId: string,
  methodLabel: string,
  invoiceNo: string | null,
  session: ClientSession | undefined
): Promise<void> {
  const payment = await PaymentModel.findById(paymentDocId).session(session ?? null);
  if (!payment) throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
  // Idempotent: a replayed webhook or a second verify finds the core already
  // written and does nothing at all.
  if (payment.finalize_state === 'CORE_DONE' || payment.finalize_state === 'COMPLETE') return;

  const ctx: CoreContext = { payment, session, steps: [], coinsEarned: 0, invoiceNo };
  runCaptureLeg(ctx, methodLabel);
  await runPodLeg(ctx);
  await runProductLeg(ctx);
  await runCoinLeg(ctx);
  await runCouponLeg(ctx);
  for (const key of DEFERRED_STEP_KEYS) {
    step(ctx, key, 'PENDING', 'Runs once the booking is committed');
  }

  // The last write of the transaction: everything the legs decided lands in one
  // update, so a payment is never read half-finalized.
  await PaymentModel.updateOne(
    { _id: payment._id },
    {
      $set: {
        status: payment.status,
        paid_at: payment.paid_at,
        invoice_no: payment.invoice_no,
        steps: ctx.steps,
        finalize_state: 'CORE_DONE',
        finalize_error: null,
        needs_refund: false,
        coins_earned: ctx.coinsEarned,
      },
      $inc: { finalize_attempts: 1 },
    },
    { session }
  );
}

/**
 * The one write after a rolled-back core. The transaction gave the payment back
 * untouched, so this is a separate, uncontested update: money was captured and
 * nothing was booked, which is a refund Finance has to make.
 *
 * A throw is NOT proof of a rollback — a commit can surface
 * UnknownTransactionCommitResult, and a concurrent finalize can exhaust its
 * retry window after the other attempt already committed. So the write is
 * conditional on the core not having landed: stamping FAILED over a committed
 * booking would both stall phase 2 (the reconciler only resumes CORE_DONE) and
 * ask Finance to refund a customer holding a valid ticket.
 *
 * @returns whether the payment was actually marked FAILED.
 */
async function markFinalizeFailed(paymentDocId: string, message: string): Promise<boolean> {
  const captured = await PaymentModel.findById(paymentDocId).select('total');
  const res = await PaymentModel.updateOne(
    { _id: paymentDocId, finalize_state: { $nin: ['CORE_DONE', 'COMPLETE'] } },
    {
      $set: {
        finalize_state: 'FAILED',
        finalize_error: message,
        // A zero-charge settlement (100%-off coupon, coins covering the whole
        // bill) took no money, so there is nothing to give back.
        needs_refund: (captured?.total ?? 0) > 0,
      },
      $inc: { finalize_attempts: 1 },
    }
  );
  return res.matchedCount > 0;
}

/* ------------------------------------------------------------------ *
 * Phase 2 — the deferred side effects
 * ------------------------------------------------------------------ */

interface DeferredContext {
  payment: IPayment;
  steps: IPaymentStep[];
  methodLabel: string;
  failed: boolean;
}

interface StepOutcome {
  status?: PaymentStepStatus;
  detail?: string;
  refs?: string[];
}

function markStepFailed(ctx: DeferredContext, key: PaymentStepKey, error: unknown): void {
  ctx.steps = recordStep(ctx.steps, key, 'FAILED', messageOf(error));
  ctx.failed = true;
  logs.server.error('payment', 'runSideEffects', {
    error,
    paymentDocId: String(ctx.payment._id),
    stepKey: key,
  });
}

/** Run one deferred step, recording whatever happened. A step already DONE is
 * skipped, so a retry only redoes what the payment still owes. */
async function guardStep(
  ctx: DeferredContext,
  key: PaymentStepKey,
  run: () => Promise<StepOutcome>
): Promise<void> {
  if (isDone(ctx.steps, key)) return;
  try {
    const outcome = await run();
    ctx.steps = recordStep(
      ctx.steps,
      key,
      outcome.status ?? 'DONE',
      outcome.detail ?? '',
      outcome.refs ?? []
    );
  } catch (error) {
    markStepFailed(ctx, key, error);
  }
}

/** The booking consumed a seat somebody had released — close their backout and
 * tell them, which is what makes their refund eligible. */
async function fillBackouts(ctx: DeferredContext): Promise<StepOutcome> {
  const p = ctx.payment;
  if (!p.pod_id) return { status: 'SKIPPED', detail: NO_POD_DETAIL };
  const pod = await PodModel.findById(p.pod_id);
  if (!pod) return { status: 'SKIPPED', detail: 'The pod no longer exists' };
  await fillBackoutsAfterJoin(pod, String(p.user_id));
  return {};
}

/** Credit this sale to the short link the buyer came through, if any. Silent for
 * the majority who never followed one. */
async function attributeShortLink(ctx: DeferredContext): Promise<StepOutcome> {
  const p = ctx.payment;
  const { shortLinkJourneyService } = await import('@modules/crm/marketing/shortLinkJourney.service');
  await shortLinkJourneyService.attributePayment({
    userId: String(p.user_id),
    paymentId: String(p._id),
    amount: p.total,
    at: p.paid_at ?? undefined,
  });
  return {};
}

/** ShipRocket, over HTTP — the reason this whole phase exists. */
async function createShipments(ctx: DeferredContext): Promise<StepOutcome> {
  const orders = await ProductOrderModel.find({
    payment_id: ctx.payment._id,
    fulfilment_method: 'SHIP',
  });
  if (orders.length === 0) return { status: 'SKIPPED', detail: 'Nothing on this payment ships' };
  for (const order of orders) {
    // Already booked with the courier — a retry must never buy a second parcel.
    if (order.shiprocket?.order_id) continue;
    await productOrderService.tryCreateShipment(order);
  }
  // Both `tryCreateShipment` and `createShipment` swallow their errors, so the
  // order doc is the only honest report. Recording DONE over a shipment that
  // never reached ShipRocket flips the payment to COMPLETE and the reconciler
  // never looks again — the buyer has paid for goods nothing will ever ship.
  //
  // "Never reached ShipRocket" is the test, not "FAILED": an order that got its
  // ShipRocket order id and then failed AWB assignment IS with the courier, and
  // is deliberately never re-sent (that would be a second parcel), so failing
  // the step on it would only spin the reconciler forever with nothing to retry.
  const unsent = orders.filter((o) => o.fulfilment_status === 'FAILED' && !o.shiprocket?.order_id);
  if (unsent.length > 0) {
    throw new Error(
      `${plural(unsent.length, 'shipment', 'shipments')} could not be booked: ${unsent[0].last_error || 'ShipRocket rejected the order'}`
    );
  }
  return {
    detail: plural(orders.length, 'shipment', 'shipments'),
    refs: orders.map((o) => String(o._id)),
  };
}

/**
 * The entry ticket's own e-mail — a PDF build plus an SMTP send, deferred for
 * the same reason the receipt is: it cannot be rolled back. The core issues the
 * ticket inside its transaction and this ships it once that has committed, so a
 * transaction retry can no longer mail one ticket per attempt.
 */
async function emailTicket(ctx: DeferredContext): Promise<StepOutcome> {
  const ticketId = ctx.steps.find((s) => s.key === 'TICKET')?.refs?.[0];
  if (!ticketId) return { status: 'SKIPPED', detail: NO_POD_DETAIL };
  await ticketService.emailById(ticketId);
  return { detail: ctx.payment.user_email, refs: [ticketId] };
}

/** The booking the receipt deep-links to, as the MEMBERSHIP step recorded it. */
const membershipRef = (steps: IPaymentStep[]) =>
  steps.find((s) => s.key === 'MEMBERSHIP')?.refs?.[0] ?? null;

async function sendReceipt(ctx: DeferredContext, pdf: Buffer): Promise<void> {
  const p = ctx.payment;
  const [fs, urlConfigs] = await Promise.all([getFinanceSettings(), getUrlConfigs()]);
  const pod = p.pod_id ? await PodModel.findById(p.pod_id) : null;
  const bookingId = membershipRef(ctx.steps);
  const bookingUrl = bookingId ? bookingLinkUrl(urlConfigs.appUrl, bookingId) : urlConfigs.appUrl;
  const summary = pod?.pod_date_time
    ? `${pod.pod_title} — ${new Date(pod.pod_date_time).toLocaleString('en-IN')}`
    : p.description;
  await sendEmail({
    to: p.user_email,
    subject: `Payment Receipt — ${p.invoice_no}`,
    template: 'payment-receipt',
    category: 'billing',
    vars: {
      name: p.user_name,
      summary,
      invoice_no: p.invoice_no ?? '',
      payment_id: p.payment_id,
      amount: `${fs.currency_symbol}${p.total.toFixed(2)}`,
      booking_url: bookingUrl,
      // Templates already cached in the DB still carry the old `{{app_url}}`
      // CTA, so it has to resolve to the same deep link (the disk template is
      // only imported once, never re-synced).
      app_url: bookingUrl,
    },
    attachments: [
      {
        filename: `invoice-${String(p.invoice_no).replaceAll(/[^\w-]+/g, '-')}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });
}

/**
 * The invoice and the email that carries it, as a pair: the receipt cannot be
 * sent without the document attached, so a retry that still owes the email
 * regenerates the PDF rather than posting an empty one.
 */
async function emailReceipt(ctx: DeferredContext): Promise<void> {
  if (isDone(ctx.steps, 'RECEIPT_EMAIL')) return;
  let pdf: Buffer;
  try {
    pdf = await generateInvoicePdf(
      await invoiceDataForPayment(ctx.payment, { paymentMethod: ctx.methodLabel })
    );
    ctx.steps = recordStep(ctx.steps, 'INVOICE_PDF', 'DONE', plural(pdf.length, 'byte', 'bytes'));
  } catch (error) {
    markStepFailed(ctx, 'INVOICE_PDF', error);
    markStepFailed(ctx, 'RECEIPT_EMAIL', new Error('The invoice it attaches was not generated'));
    return;
  }
  try {
    await sendReceipt(ctx, pdf);
    ctx.steps = recordStep(ctx.steps, 'RECEIPT_EMAIL', 'DONE', ctx.payment.user_email);
  } catch (error) {
    markStepFailed(ctx, 'RECEIPT_EMAIL', error);
  }
}

/** The gateway label recorded at capture — see runCaptureLeg. */
function capturedMethod(payment: IPayment): string {
  const captured = (payment.steps ?? []).find((s) => s.key === 'PAYMENT_CAPTURED');
  return captured?.detail || payment.gateway || 'Gateway';
}

export const paymentFinalizer = {
  /**
   * Idempotent. Phase 1 = the ACID core (one transaction). Phase 2 = the side
   * effects, which the caller fires without awaiting.
   *
   * Rethrows on failure so the caller reports an honest error rather than
   * telling a buyer their booking worked; the payment is left FAILED and, when
   * money actually moved, flagged for refund. The exception is a throw over a
   * core that committed anyway — there the booking exists, so it returns.
   */
  async finalizePayment(paymentDocId: string, methodLabel: string): Promise<void> {
    try {
      // Deliberately outside the transaction (see allocateInvoiceNumber) but
      // inside this try, so a counter that is unreachable still leaves the
      // payment FAILED and flagged for refund rather than throwing unrecorded.
      const invoiceNo = await allocateInvoiceNumber(paymentDocId);
      await withTransaction((session) => runCore(paymentDocId, methodLabel, invoiceNo, session));
    } catch (error) {
      logs.server.error('payment', 'finalizePayment', { error, paymentDocId });
      const marked = await markFinalizeFailed(paymentDocId, messageOf(error));
      // The core is on disk despite the throw (an unknown commit result, or the
      // other racer won). The booking is real, so this is not the caller's
      // error to report — let phase 2 carry on and finish the receipt.
      if (!marked) {
        logs.server.warn('payment', 'finalizePayment', {
          paymentDocId,
          msg: 'Finalize threw but the core had already committed — treating as done',
        });
        return;
      }
      throw error;
    }
  },

  /** Phase 2 only. Safe to re-run any number of times — every step that already
   * landed is skipped, and a step that fails leaves the payment at CORE_DONE for
   * the reconciler to pick up again. */
  async runSideEffects(paymentDocId: string): Promise<void> {
    // Claim the payment before touching a third party. Only a committed core has
    // side effects to run (NOT_STARTED and FAILED have no booking behind them,
    // COMPLETE is already done) — and only ONE runner may hold it, or the
    // fire-and-forget run and the reconciler's sweep both read the same PENDING
    // steps and book the courier twice.
    const payment = await PaymentModel.findOneAndUpdate(
      {
        _id: paymentDocId,
        finalize_state: 'CORE_DONE',
        $or: [
          { side_effects_lease_at: null },
          { side_effects_lease_at: { $lt: new Date(Date.now() - SIDE_EFFECT_LEASE_MS) } },
        ],
      },
      { $set: { side_effects_lease_at: new Date() } },
      { new: true }
    );
    if (!payment) return;

    const ctx: DeferredContext = {
      payment,
      steps: (payment.steps ?? []).map(toPlainStep),
      methodLabel: capturedMethod(payment),
      failed: false,
    };

    await guardStep(ctx, 'BACKOUT_FILL', () => fillBackouts(ctx));
    await guardStep(ctx, 'LINK_ATTRIBUTION', () => attributeShortLink(ctx));
    await guardStep(ctx, 'TICKET_EMAIL', () => emailTicket(ctx));
    await guardStep(ctx, 'SHIPMENT', () => createShipments(ctx));
    await emailReceipt(ctx);

    // The run is over, so the lease goes back: a step that failed should be
    // retried on the reconciler's next sweep, not after the lease ages out.
    const set: Record<string, unknown> = { steps: ctx.steps, side_effects_lease_at: null };
    if (!ctx.failed) {
      set.finalize_state = 'COMPLETE';
      set.finalized_at = new Date();
    }
    await PaymentModel.updateOne({ _id: payment._id }, { $set: set });
  },
};
