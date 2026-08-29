import { GraphQLError } from 'graphql';
import type { ClientSession } from 'mongoose';
import {
  PaymentModel,
  type IPayment,
  type IPaymentStep,
  type PaymentStepKey,
  type PaymentStepStatus,
} from './payment.model';
import {
  DEFERRED_STEP_KEYS,
  POD_STEP_KEYS,
  STEP_ORDER,
  isDeferredStep,
  withPairedSteps,
} from './payment.steps';
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
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { generateInvoicePdf } from '@services/invoice/invoice.pdf';
import { sendEmail } from '@services/email/email.service';
import { bookingLinkUrl, getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import { notifyEvent } from '@services/notify/notify.service';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import type { GiftCardPurchaseFacts } from '@modules/finance/giftcard/giftcard.service';

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

/* The execution order, the pod leg's keys and the deferred keys live in
 * `payment.steps.ts`, which the audit service reads from the same source. */

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

async function runGiftCardLeg(ctx: CoreContext): Promise<void> {
  const p = ctx.payment;
  if (p.target_type !== 'GIFT_CARD') {
    step(ctx, 'GIFT_CARD_ISSUED', 'SKIPPED', 'This payment bought no gift card');
    return;
  }
  const facts = p.metadata?.gift_card;
  if (!facts) {
    throw new GraphQLError('This gift card payment carries no card facts', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
  // Inside the transaction: a rolled-back payment must not leave a live card
  // behind. The card's unique payment_id absorbs every replay of this leg.
  const { giftcardService } = await import('@modules/finance/giftcard/giftcard.service');
  const card = await giftcardService.issueForPayment({
    paymentId: p.payment_id,
    purchaserId: String(p.user_id),
    facts,
    session: ctx.session,
  });
  step(ctx, 'GIFT_CARD_ISSUED', 'DONE', card.code, [String(card._id)]);
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
  await runGiftCardLeg(ctx);
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
  /**
   * The steps this run is allowed to touch, or null for "everything still
   * owed". Finance re-running ONE row from the detail page must not also post
   * the receipt or book the courier as a side effect of pressing it.
   */
  only: Set<PaymentStepKey> | null;
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

/** Whether this run is meant to touch a given step. */
const inScope = (ctx: DeferredContext, key: PaymentStepKey) => !ctx.only || ctx.only.has(key);

/** Run one deferred step, recording whatever happened. A step already DONE is
 * skipped, so a retry only redoes what the payment still owes. */
async function guardStep(
  ctx: DeferredContext,
  key: PaymentStepKey,
  run: () => Promise<StepOutcome>
): Promise<void> {
  if (!inScope(ctx, key)) return;
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

/** The gift card itself — the code, the personal note and the redeem link,
 * mailed to whoever the card is for. Deferred like the receipt: SMTP cannot be
 * rolled back, and the card only exists once the core has committed. */
async function emailGiftCard(ctx: DeferredContext): Promise<StepOutcome> {
  const p = ctx.payment;
  if (p.target_type !== 'GIFT_CARD') {
    return { status: 'SKIPPED', detail: 'This payment bought no gift card' };
  }
  const { giftcardService } = await import('@modules/finance/giftcard/giftcard.service');
  const sent = await giftcardService.emailForPayment(p);
  return { detail: sent.to, refs: [sent.cardId] };
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

/**
 * One receipt, chosen by what the payment bought.
 *
 * A single `payment-receipt` used to answer for all of them, with a one-line
 * `summary` standing in for a pod's date, an order's contents and a gift card's
 * recipient alike. `target_type` already knows which of the four it is, so it
 * picks the template and the values only that kind has; the name, the money and
 * the invoice PDF are identical for all four and are added once by
 * `sendReceipt`.
 *
 * `subject` is the FALLBACK — the stored template's own subject wins, so an
 * admin editing it in Tech > Emails keeps control — which is why it is written
 * here beside the catalogue row it mirrors.
 */
interface ReceiptMail {
  template: string;
  subject: string;
  vars: Record<string, string>;
}

/**
 * A pod: which pod, and when its members have to turn up.
 *
 * The venue and the ticket code are deliberately absent — the ticket email
 * carries both, and this is the money's record, not a second ticket.
 */
async function podReceiptMail(p: IPayment, bookingUrl: string): Promise<ReceiptMail> {
  const pod = p.pod_id ? await PodModel.findById(p.pod_id) : null;
  return {
    template: 'payment-receipt-pod',
    subject: `Pod booking receipt — ${p.invoice_no}`,
    vars: {
      // A pod cancelled and deleted between the charge and this run must not
      // cost the buyer their receipt: the checkout's own description is what
      // the pod was sold to them as.
      pod_title: pod?.pod_title ?? p.description,
      date_label: pod?.pod_date_time
        ? new Date(pod.pod_date_time).toLocaleString('en-IN')
        : p.description,
      booking_url: bookingUrl,
    },
  };
}

/**
 * A shop order: the order number and what was in it.
 *
 * Plural on purpose — one checkout splits into a shipped order and a pickup one
 * when the basket mixes the two, and both hang off this single payment.
 */
async function productReceiptMail(p: IPayment, appUrl: string): Promise<ReceiptMail> {
  const orders = await ProductOrderModel.find({ payment_id: p._id });
  return {
    template: 'payment-receipt-product',
    subject: `Order receipt — ${p.invoice_no}`,
    vars: {
      order_no: orders.map((o) => o.order_no).join(', '),
      items: orders.flatMap((o) => o.line_items.map((i) => `${i.name} × ${i.qty}`)).join(', '),
      orders_url: `${appUrl}/orders`,
    },
  };
}

/**
 * A gift card: what it is worth and who it is for — never the CODE.
 *
 * The code is a bearer instrument, and it travels exactly once, in the card's
 * own email, to the person the card is for. Repeating it in the purchaser's
 * receipt would put the money in a second inbox for no reason.
 */
function giftCardReceiptMail(p: IPayment, appUrl: string, currencySymbol: string): ReceiptMail {
  const facts = p.metadata?.gift_card as GiftCardPurchaseFacts | undefined;
  return {
    template: 'payment-receipt-gift-card',
    subject: `Gift card receipt — ${p.invoice_no}`,
    vars: {
      // The card's face value — what the holder can redeem. Not always the
      // charge: coins spent at checkout come off what was actually paid.
      card_amount: `${currencySymbol}${(facts?.amount ?? p.total).toFixed(2)}`,
      // Bought for somebody else: their name, or just the address it was sent
      // to when the buyer gave no name. Bought for yourself: neither is set,
      // and the buyer IS the recipient.
      recipient: facts?.recipient_name || facts?.recipient_email || p.user_name,
      gift_cards_url: `${appUrl}/gift-cards`,
    },
  };
}

/**
 * Everything else money is taken for.
 *
 * It has a description and nothing else — which is precisely what the one
 * receipt for all four could ever say, and why the other three now exist.
 */
function otherReceiptMail(p: IPayment, bookingUrl: string): ReceiptMail {
  return {
    template: 'payment-receipt',
    subject: `Payment Receipt — ${p.invoice_no}`,
    vars: {
      summary: p.description,
      booking_url: bookingUrl,
      // Templates already cached in the DB still carry the old `{{app_url}}`
      // CTA, so it has to resolve to the same deep link (the disk template is
      // only imported once, never re-synced).
      app_url: bookingUrl,
    },
  };
}

/** Which of the four this payment gets. `target_type` is the whole decision. */
async function receiptMailFor(
  p: IPayment,
  appUrl: string,
  bookingUrl: string,
  currencySymbol: string
): Promise<ReceiptMail> {
  if (p.target_type === 'POD') return podReceiptMail(p, bookingUrl);
  if (p.target_type === 'PRODUCT') return productReceiptMail(p, appUrl);
  if (p.target_type === 'GIFT_CARD') return giftCardReceiptMail(p, appUrl, currencySymbol);
  return otherReceiptMail(p, bookingUrl);
}

async function sendReceipt(ctx: DeferredContext, pdf: Buffer): Promise<void> {
  const p = ctx.payment;
  const [fs, urlConfigs] = await Promise.all([getFinanceSettings(), getUrlConfigs()]);
  const bookingId = membershipRef(ctx.steps);
  const bookingUrl = bookingId ? bookingLinkUrl(urlConfigs.appUrl, bookingId) : urlConfigs.appUrl;
  const mail = await receiptMailFor(p, urlConfigs.appUrl, bookingUrl, fs.currency_symbol);
  await sendEmail({
    to: p.user_email,
    subject: mail.subject,
    template: mail.template,
    category: 'billing',
    vars: {
      // The three every receipt carries, whatever it is a receipt for.
      name: p.user_name,
      invoice_no: p.invoice_no ?? '',
      payment_id: p.payment_id,
      amount: `${fs.currency_symbol}${p.total.toFixed(2)}`,
      ...mail.vars,
    },
    // The invoice does NOT fork with the receipt: it is the tax document, built
    // the same way whatever was bought, and every one of the four attaches it.
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
  // The pair is widened by `withPairedSteps` before the run, so asking for
  // either one puts both in scope and this single check covers them.
  if (!inScope(ctx, 'RECEIPT_EMAIL')) return;
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

/* ------------------------------------------------------------------ *
 * The failure notice — the one step of a payment that did NOT book
 * ------------------------------------------------------------------ */

const fullName = (user: any) =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim();

// WhatsApp templates print the day and the clock time as two placeholders.
const dateOnly = (value?: Date | null) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium' }) : '';
const timeOnly = (value?: Date | null) =>
  value ? new Date(value).toLocaleString('en-IN', { timeStyle: 'short' }) : '';

/** The buyer's message: their pod payment did not turn into a seat. */
async function whatsappPaymentFailed(payment: IPayment): Promise<StepOutcome> {
  if (!payment.pod_id) return { status: 'SKIPPED', detail: NO_POD_DETAIL };
  const pod = await PodModel.findById(payment.pod_id).select(
    'pod_id pod_title pod_date_time pod_hosts_id club_id pod_images_and_videos'
  );
  if (!pod) return { status: 'SKIPPED', detail: 'The pod no longer exists' };
  const [{ mwebUrl }, club, buyer, host] = await Promise.all([
    getUrlConfigs(),
    ClubModel.findById(pod.club_id).select('club_id').lean(),
    // `auth.phone` and `communication.whatsapp` are the only two paths a number
    // is resolved from — a projection without them skips the send in silence.
    UserModel.findById(payment.user_id)
      .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
      .lean(),
    UserModel.findById((pod.pod_hosts_id ?? [])[0])
      .select('profile.first_name profile.last_name')
      .lean(),
  ]);
  const name = payment.user_name || fullName(buyer) || 'there';
  // Both channels. A failed payment is the one message a buyer MUST get — the
  // seat is not held and they do not know it — and it was WhatsApp-only.
  const { wa: outcome } = await notifyEvent({
    event: 'USER_PAYMENT_FAILED',
    // The payment, not the pod: a buyer whose second attempt also fails is owed
    // the news about that attempt too.
    entityId: String(payment._id),
    user: buyer,
    name,
    assets: podImageAssets(pod.pod_images_and_videos),
    params: [
      name,
      pod.pod_title,
      pod.pod_title,
      dateOnly(pod.pod_date_time),
      timeOnly(pod.pod_date_time),
      `${mwebUrl.replace(/\/+$/, '')}/club/${(club as any)?.club_id ?? ''}/pod/${pod.pod_id}`,
      fullName(host) || 'A host',
      payment.payment_id,
    ],
    email: payment.user_email,
  });
  if (outcome.status === 'SENT') return { refs: [outcome.message_id] };
  // A funnel FAILURE is worth another pass — the reconciler re-enters
  // finalization. A SKIP (no number, switched off, opted out) is final.
  if (outcome.status === 'FAILED') return { status: 'FAILED', detail: outcome.reason };
  return { status: 'SKIPPED', detail: outcome.reason };
}

/**
 * Tell the buyer, and record it on the payment like every other side effect.
 *
 * It lives in this file rather than at the checkout call site because this is
 * the only place a payment is declared failed, and because `finalizePayment` is
 * re-entered by `startPaymentReconciler`: a notice the funnel could not deliver
 * is recorded FAILED here and simply tried again on the next pass, with the
 * funnel's own (event, entity, destination) index making sure a retry cannot
 * become a second message.
 *
 * Deliberately NOT in DEFERRED_STEP_KEYS, unlike the notification steps it sits
 * beside in STEP_ORDER: those are seeded PENDING by a core that COMMITTED and
 * are run by `runSideEffects`, which only ever claims a CORE_DONE payment. This
 * one exists precisely because the core rolled back, so seeding it there would
 * leave a step on every successful payment that nothing ever clears.
 */
async function notifyPaymentFailed(paymentDocId: string): Promise<void> {
  const payment = await PaymentModel.findById(paymentDocId);
  if (!payment) return;
  const recorded = (payment.steps ?? []).map(toPlainStep);
  if (isDone(recorded, 'PAYMENT_FAILED_NOTICE')) return;

  let outcome: StepOutcome;
  try {
    outcome = await whatsappPaymentFailed(payment);
  } catch (error) {
    logs.server.error('payment', 'notifyPaymentFailed', { error, paymentDocId });
    outcome = { status: 'FAILED', detail: messageOf(error) };
  }
  const steps = recordStep(
    recorded,
    'PAYMENT_FAILED_NOTICE',
    outcome.status ?? 'DONE',
    outcome.detail ?? '',
    outcome.refs ?? []
  );
  // Scoped to the FAILED row this notice is about: a concurrent finalize that
  // committed after the mark owns the step list, and its receipt must not be
  // overwritten by a failure that no longer stands.
  await PaymentModel.updateOne({ _id: paymentDocId, finalize_state: 'FAILED' }, { $set: { steps } });
}

/** The gateway label recorded at capture — see runCaptureLeg. */
function capturedMethod(payment: IPayment): string {
  const captured = (payment.steps ?? []).find((s) => s.key === 'PAYMENT_CAPTURED');
  return captured?.detail || payment.gateway || 'Gateway';
}

/* ------------------------------------------------------------------ *
 * Re-running what did not land — Finance's retry
 * ------------------------------------------------------------------ */

/** A deferred step that has neither landed nor been ruled out. SKIPPED is a
 * decision ("this payment has no pod"), not an omission, so it is settled. */
const isOwed = (steps: IPaymentStep[], key: PaymentStepKey): boolean => {
  const step = steps.find((s) => s.key === key);
  return !step || (step.status !== 'DONE' && step.status !== 'SKIPPED');
};

/** Does the payment still owe ANY deferred work? The COMPLETE gate. */
const stillOwed = (steps: IPaymentStep[]): boolean =>
  DEFERRED_STEP_KEYS.some((key) => isOwed(steps, key));

const outstandingDeferred = (
  steps: IPaymentStep[],
  candidates: readonly PaymentStepKey[]
): PaymentStepKey[] => candidates.filter((key) => isOwed(steps, key));

/**
 * The caller's step selection, checked against the steps that CAN be re-run on
 * their own. Anything else — a core step, a typo — is refused rather than
 * silently dropped: a retry button that reports success while having run
 * nothing is worse than one that says the row cannot be retried.
 */
function normalizeRetryKeys(keys?: readonly string[]): PaymentStepKey[] | null {
  if (!keys || keys.length === 0) return null;
  const unknown = keys.filter((key) => !isDeferredStep(key));
  if (unknown.length > 0) {
    throw new GraphQLError(`These steps cannot be re-run on their own: ${unknown.join(', ')}`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return withPairedSteps(keys.filter(isDeferredStep));
}

const RETRY_DETAIL = 'Re-run requested from Finance';

/**
 * Put the chosen steps back to PENDING and hand the payment to phase 2 again.
 *
 * The state goes back to CORE_DONE because that is the only state
 * `runSideEffects` will claim, and the lease is released so the retry does not
 * have to wait out a run that has already finished. The reconciler's attempt
 * budget is cleared with them: it gave up on this payment, and a human asking
 * again is the reason to start counting over.
 */
async function reopenSteps(paymentDocId: string, keys: readonly PaymentStepKey[]): Promise<void> {
  const payment = await PaymentModel.findById(paymentDocId).select('steps');
  if (!payment) return;
  let steps = (payment.steps ?? []).map(toPlainStep);
  for (const key of keys) {
    steps = recordStep(steps, key, 'PENDING', RETRY_DETAIL);
  }
  await PaymentModel.updateOne(
    { _id: paymentDocId },
    {
      $set: {
        steps,
        finalize_state: 'CORE_DONE',
        finalized_at: null,
        side_effects_lease_at: null,
        side_effect_attempts: 0,
      },
    }
  );
}

/** The same budget reset for the core re-run, which rewrites the steps itself. */
const resetRetryBudget = (paymentDocId: string) =>
  PaymentModel.updateOne(
    { _id: paymentDocId },
    { $set: { side_effects_lease_at: null, side_effect_attempts: 0 } },
    { timestamps: false }
  );

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
      // Only now that the payment is on record as failed — a core that quietly
      // committed anyway must never tell the buyer their booking did not happen.
      await notifyPaymentFailed(paymentDocId).catch((err) =>
        logs.server.error('payment', 'notifyPaymentFailed', { error: err, paymentDocId })
      );
      throw error;
    }
  },

  /**
   * Phase 2 only. Safe to re-run any number of times — every step that already
   * landed is skipped, and a step that fails leaves the payment at CORE_DONE for
   * the reconciler to pick up again.
   *
   * `only` narrows the run to named steps, which is what Finance's row-level
   * retry sends. The payment still only reaches COMPLETE once NOTHING deferred
   * is outstanding, so re-running one row out of three failures leaves the other
   * two visible instead of quietly declaring the payment finished.
   */
  async runSideEffects(paymentDocId: string, only?: readonly PaymentStepKey[]): Promise<void> {
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
      only: only ? new Set(only) : null,
    };

    await guardStep(ctx, 'BACKOUT_FILL', () => fillBackouts(ctx));
    await guardStep(ctx, 'LINK_ATTRIBUTION', () => attributeShortLink(ctx));
    await guardStep(ctx, 'TICKET_EMAIL', () => emailTicket(ctx));
    await guardStep(ctx, 'GIFT_CARD_EMAIL', () => emailGiftCard(ctx));
    await guardStep(ctx, 'SHIPMENT', () => createShipments(ctx));
    await emailReceipt(ctx);

    // The run is over, so the lease goes back: a step that failed should be
    // retried on the reconciler's next sweep, not after the lease ages out.
    const set: Record<string, unknown> = { steps: ctx.steps, side_effects_lease_at: null };
    if (!ctx.failed && !stillOwed(ctx.steps)) {
      set.finalize_state = 'COMPLETE';
      set.finalized_at = new Date();
    }
    await PaymentModel.updateOne({ _id: payment._id }, { $set: set });
  },

  /**
   * Re-run the checkout work that did not land, at Finance's request.
   *
   * Two different repairs behind one entry point, because which one applies is
   * a fact about the payment rather than a choice the caller should make:
   *
   *  - the core never committed, so there is no booking at all → re-run the
   *    whole finalization. Every leg guards its own replay (an existing
   *    membership is reused, the coin debit and the gift card are keyed on the
   *    payment id), so a second pass repairs rather than duplicates.
   *  - the core committed and a deferred step failed → re-run just those steps,
   *    which is the same work the reconciler does, on demand.
   *
   * `stepKeys` picks individual rows; omit it to re-run everything still owed.
   * The reconciler's attempt budget is reset either way: a human asking again
   * is exactly the signal that the thing it gave up on is worth another try.
   */
  async retry(paymentDocId: string, stepKeys?: readonly string[]): Promise<void> {
    const payment = await PaymentModel.findById(paymentDocId);
    if (!payment) {
      throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
    }
    // The money went back. Nothing here should keep working for it — least of
    // all the core, which would claim a seat against a refunded charge.
    //
    // Note this does NOT check for SUCCESS: a payment whose core rolled back is
    // still PENDING, because the promotion to SUCCESS happens INSIDE that
    // transaction. Capture is proven by `finalize_state` instead — FAILED is
    // only ever written after the gateway confirmed the charge.
    if (payment.status === 'REFUNDED') {
      throw new GraphQLError('This payment has been refunded — there is nothing to re-run', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const requested = normalizeRetryKeys(stepKeys);

    // FAILED and only FAILED is the whole-core repair. `markFinalizeFailed`
    // refuses to stamp it over a core that committed, so it genuinely means
    // nothing was written — whereas NOT_STARTED is also what every payment
    // settled before this field existed reads, and re-running the core over one
    // of those would write its product orders twice and take the stock again.
    if (payment.finalize_state === 'FAILED') {
      await resetRetryBudget(paymentDocId);
      await this.finalizePayment(paymentDocId, capturedMethod(payment));
      await this.runSideEffects(paymentDocId);
      return;
    }
    if (payment.finalize_state !== 'CORE_DONE' && payment.finalize_state !== 'COMPLETE') {
      throw new GraphQLError(
        'This payment was settled before checkout recorded its steps — there is nothing here to re-run',
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }

    const recorded = (payment.steps ?? []).map(toPlainStep);
    // No steps at all is a payment that predates step tracking, not one owing
    // seven pieces of work — the same reading the audit page takes.
    const owed = recorded.length === 0 ? [] : outstandingDeferred(recorded, requested ?? DEFERRED_STEP_KEYS);
    if (owed.length === 0) {
      throw new GraphQLError('Nothing on this payment is waiting to be re-run', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    await reopenSteps(paymentDocId, owed);
    await this.runSideEffects(paymentDocId, owed);
  },
};
