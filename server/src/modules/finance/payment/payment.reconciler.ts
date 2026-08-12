/**
 * Safety net for the payments checkout could not finish on its own.
 *
 * Two failure modes, both invisible to the buyer AND to Finance until someone
 * complains: Razorpay captured the money but the client vanished before it
 * could call verifyRazorpayCheckout (closed tab, dead network, proxy timeout),
 * and finalization wrote the booking core but a side effect — a receipt email,
 * a shipment — threw. Neither can be retried by the client, so the server
 * retries them here.
 *
 * This module only decides WHICH payments to hand the finalizer; the finalizer
 * is idempotent, so re-handing it one costs nothing. Retrying it forever does,
 * though — hence a checked-recently cursor on both stages and, on the deferred
 * one, an attempt budget: no payment can hold the head of a bounded batch, and
 * no dead third party is called every five minutes until a human happens to
 * notice. Fault-tolerant (the interval survives any DB or gateway error) and
 * non-overlapping, mirroring the status/pod-draft schedulers. No-ops under
 * NODE_ENV=test.
 */
import type { HydratedDocument } from 'mongoose';
import { PaymentModel, type IPayment } from './payment.model';
import { findCapturedPaymentForOrder } from './razorpay.gateway';
import { logs } from '@observability/log';

const MINUTE_MS = 60_000;
const SWEEP_INTERVAL_MS = 5 * MINUTE_MS;
const FIRST_SWEEP_DELAY_MS = MINUTE_MS;
/** A checkout younger than this is probably still on screen, mid-verify. */
const CAPTURE_GRACE_MS = 5 * MINUTE_MS;
/** Older than this and Razorpay's own auto-refund has taken the decision. */
const CAPTURE_WINDOW_MS = 24 * 60 * MINUTE_MS;
/** A payment that reached CORE_DONE this recently may still be in phase 2. */
const SIDE_EFFECT_GRACE_MS = 2 * MINUTE_MS;
/**
 * How many deferred passes one payment gets before the sweep leaves it alone.
 *
 * Some phase-2 failures never resolve themselves — a revoked ShipRocket
 * credential, an address the mail server refuses — and retrying them every five
 * minutes forever both hammers that third party and, because the batch is
 * bounded, keeps newer payments whose receipts are still waiting behind them.
 * Six passes is roughly half an hour of trying, after which one warning names
 * the payment and a human takes over.
 */
const MAX_SIDE_EFFECT_ATTEMPTS = 6;
const BATCH_LIMIT = 50;

let sweeping = false;

/** The finalizer pulls in the whole booking stack (seats, memberships, tickets,
 * coins), which reaches back into this module's neighbours — importing it
 * lazily keeps that graph out of module-load order. */
async function loadFinalizer() {
  const { paymentFinalizer } = await import('./payment.finalize');
  return paymentFinalizer;
}

type Finalizer = Awaited<ReturnType<typeof loadFinalizer>>;

/** Adopt one capture Razorpay made but nobody claimed. */
async function recoverOneCapture(doc: HydratedDocument<IPayment>): Promise<void> {
  // While a payment is PENDING its gateway_ref still holds the ORDER id — the
  // handle Razorpay files its captures under.
  const orderId = doc.gateway_ref;
  if (!orderId) return;
  const captured = await findCapturedPaymentForOrder(orderId);
  if (!captured) return;

  // From here on the payment id is what Finance (and any refund) needs, so it
  // replaces the order id exactly as a successful verify would have done.
  doc.gateway_ref = captured.id;
  doc.metadata = {
    ...doc.metadata,
    razorpay_order_id: orderId,
    razorpay_payment_id: captured.id,
    reconciled_at: new Date().toISOString(),
  };
  await doc.save();

  const paymentFinalizer = await loadFinalizer();
  await paymentFinalizer.finalizePayment(String(doc._id), 'Razorpay (reconciled)');
  logs.server.info('payment-reconciler', 'capture', {
    payment_id: doc.payment_id,
    razorpay_payment_id: captured.id,
    amount_paise: captured.amount,
    msg: 'Adopted a Razorpay capture the client never verified',
  });
}

/** Look at one payment, then record that we did — whether or not a capture was
 * found, and whether or not the attempt threw. An abandoned checkout stays
 * PENDING forever, so an unstamped failure would sit at the head of the queue
 * and hold back everything behind it. Written with `updateOne` rather than on
 * the document because the finalizer may have rewritten it in the meantime. */
async function inspectOneStuckCapture(doc: HydratedDocument<IPayment>): Promise<void> {
  try {
    await recoverOneCapture(doc);
  } catch (err) {
    logs.server.error('payment-reconciler', 'capture', {
      error: err,
      payment_id: doc.payment_id,
      msg: 'capture recovery failed',
    });
  }
  // `timestamps: false` — the cursor is bookkeeping, and bumping updated_at
  // would push a CORE_DONE payment back out of the side-effect retry window.
  await PaymentModel.updateOne(
    { _id: doc._id },
    { $set: { reconcile_checked_at: new Date() } },
    { timestamps: false }
  ).catch((err) => {
    logs.server.error('payment-reconciler', 'capture', {
      error: err,
      payment_id: doc.payment_id,
      msg: 'could not stamp reconcile cursor',
    });
  });
}

/** Payments still PENDING on our side that Razorpay may already have charged.
 * This is what stops a timed-out checkout from silently eating someone's money. */
async function recoverStuckCaptures(): Promise<void> {
  const now = Date.now();
  const stuck = await PaymentModel.find({
    status: 'PENDING',
    gateway: 'RAZORPAY',
    created_at: {
      $lt: new Date(now - CAPTURE_GRACE_MS),
      $gt: new Date(now - CAPTURE_WINDOW_MS),
    },
    // Never examined, or not since the last sweep. Abandoned checkouts stay
    // PENDING indefinitely, so without this cursor a day with more than
    // BATCH_LIMIT of them keeps re-reading the same rows while a real captured
    // payment behind them is never looked at before the 24h window closes.
    $or: [
      { reconcile_checked_at: null },
      { reconcile_checked_at: { $lt: new Date(now - SWEEP_INTERVAL_MS) } },
    ],
  })
    // Oldest first: those are the ones closest to falling out of the window.
    .sort({ created_at: 1 })
    .limit(BATCH_LIMIT);

  for (const doc of stuck) {
    // One unreachable order must not abandon the rest of the batch.
    await inspectOneStuckCapture(doc);
  }
}

/** The retry budget is spent. Say so once, naming the payment, so a permanently
 * broken step reaches a human instead of being retried in silence forever. The
 * payment deliberately stays CORE_DONE with its FAILED steps intact — that is
 * what the Finance detail page renders, and what a re-run would need. A pass
 * that finally landed leaves it COMPLETE, so re-read before crying wolf. */
async function warnBudgetSpent(doc: HydratedDocument<IPayment>): Promise<void> {
  const fresh = await PaymentModel.findById(doc._id).select('finalize_state');
  if (fresh?.finalize_state !== 'CORE_DONE') return;
  logs.server.warn('payment-reconciler', 'side-effects', {
    payment_id: doc.payment_id,
    payment_doc_id: String(doc._id),
    attempts: MAX_SIDE_EFFECT_ATTEMPTS,
    msg: 'Side effects still failing after the last retry — no longer retried, needs a human',
  });
}

/** One deferred pass over one stuck payment. The attempt is counted BEFORE the
 * run, so a pass that dies mid-way still spends its budget — a step that kills
 * the process is exactly the one that must not be retried forever. */
async function retryOneSideEffect(
  doc: HydratedDocument<IPayment>,
  paymentFinalizer: Finalizer
): Promise<void> {
  const attempt = doc.side_effect_attempts + 1;
  // `timestamps: false` — bookkeeping, and updated_at is the grace window this
  // stage selects on. The cursor and the counter move together: the cursor
  // rotates the batch within a sweep, the counter ends the retries for good.
  await PaymentModel.updateOne(
    { _id: doc._id },
    { $set: { reconcile_checked_at: new Date() }, $inc: { side_effect_attempts: 1 } },
    { timestamps: false }
  );
  await paymentFinalizer.runSideEffects(String(doc._id)).catch((err) => {
    logs.server.error('payment-reconciler', 'side-effects', {
      error: err,
      payment_id: doc.payment_id,
      msg: 'side-effect retry failed',
    });
  });
  if (attempt < MAX_SIDE_EFFECT_ATTEMPTS) return;
  await warnBudgetSpent(doc);
}

/** Phase 2 stalled: the booking core is written but a side effect threw. This is
 * how a receipt email or a shipment that failed once eventually goes out. */
async function resumeSideEffects(): Promise<void> {
  const now = Date.now();
  const stale = await PaymentModel.find({
    finalize_state: 'CORE_DONE',
    updated_at: { $lt: new Date(now - SIDE_EFFECT_GRACE_MS) },
    // Out of budget — left alone from here on, and `warnBudgetSpent` has already
    // named it. `$not: $gte` rather than `$lt` on purpose: payments written
    // before this counter existed have no such field at all, and a bare `$lt`
    // matches nothing on a missing path, which would strand every one of them.
    side_effect_attempts: { $not: { $gte: MAX_SIDE_EFFECT_ATTEMPTS } },
    // Same cursor the capture sweep uses, for the same reason: with a bounded
    // batch, a handful of payments that fail every time would otherwise occupy
    // the head of the queue and newer receipts behind them would never be sent.
    // The stages never hold it at once (one reads PENDING, this one CORE_DONE);
    // a payment the capture stage just adopted carries its stamp across and so
    // waits one more sweep for phase 2, which is nothing next to the hours it
    // has already spent unclaimed.
    $or: [
      { reconcile_checked_at: null },
      { reconcile_checked_at: { $lt: new Date(now - SWEEP_INTERVAL_MS) } },
    ],
  })
    // Oldest first: the buyer who has been waiting longest for their receipt.
    .sort({ created_at: 1 })
    .limit(BATCH_LIMIT);
  if (stale.length === 0) return;

  const paymentFinalizer = await loadFinalizer();
  for (const doc of stale) {
    await retryOneSideEffect(doc, paymentFinalizer);
  }
}

/** Count what the reconciler deliberately will not touch. A FAILED finalize or a
 * capture with no booking behind it is a refund decision, and only a human in
 * Finance makes those — but an unseen one is a customer who paid for nothing,
 * so every sweep says out loud that they are waiting. */
async function reportNeedsHuman(): Promise<void> {
  const [failed, refundable] = await Promise.all([
    PaymentModel.countDocuments({ finalize_state: 'FAILED' }),
    PaymentModel.countDocuments({ needs_refund: true }),
  ]);
  if (failed === 0 && refundable === 0) return;
  logs.server.warn('payment-reconciler', 'needs-human', {
    failed,
    needs_refund: refundable,
    msg: 'Payments waiting on a Finance decision',
  });
}

/** Run one stage in isolation: a Razorpay outage must not stop the side-effect
 * retries, and neither must stop the count Finance reads. */
async function runStage(stage: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logs.server.error('payment-reconciler', stage, { error: err, msg: 'stage failed' });
  }
}

async function sweep(): Promise<void> {
  await runStage('captures', recoverStuckCaptures);
  await runStage('side-effects', resumeSideEffects);
  await runStage('needs-human', reportNeedsHuman);
}

/** Start the 5-minute reconciliation loop (first sweep ~1 min after boot).
 * No-ops under NODE_ENV=test. */
export function startPaymentReconciler(): void {
  if (process.env.NODE_ENV === 'test') return;
  const tick = () => {
    // Strictly one pass at a time: a slow gateway can make a sweep outrun the
    // interval, and a second pass over the same batch only doubles the
    // Razorpay calls — the finalizer would reject the duplicate work anyway.
    if (sweeping) return;
    sweeping = true;
    sweep()
      .catch((err) => {
        logs.server.error('payment-reconciler', 'sweep', { error: err, msg: 'sweep failed' });
      })
      .finally(() => {
        sweeping = false;
      });
  };
  const first = setTimeout(tick, FIRST_SWEEP_DELAY_MS);
  const interval = setInterval(tick, SWEEP_INTERVAL_MS);
  // Never keep the process alive just for payment reconciliation.
  first.unref?.();
  interval.unref?.();
}
