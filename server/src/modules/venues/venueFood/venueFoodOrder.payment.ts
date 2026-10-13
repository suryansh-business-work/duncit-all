import type { Types } from 'mongoose';
import {
  createRazorpayRefund,
  findCapturedPaymentForOrder,
  listRazorpayRefunds,
} from '@modules/finance/payment/razorpay.gateway';
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { VenueFoodOrderModel, type IVenueFoodOrder } from './venueFoodOrder.model';
import { FOOD_LOG, razorpayKeysFor } from './venueFoodOrder.shared';

/**
 * The money half of a venue food order: marking it paid exactly once, adopting
 * a capture the guest's browser never reported, and sending a cancelled
 * order's money back. Razorpay has no webhook route on this platform, so —
 * like the main checkout — a sweep is what catches the closed tab.
 */

const MINUTE_MS = 60_000;
const SWEEP_INTERVAL_MS = 5 * MINUTE_MS;
const FIRST_SWEEP_DELAY_MS = 2 * MINUTE_MS;
/** A checkout younger than this is probably still on screen, mid-verify. */
const CAPTURE_GRACE_MS = 3 * MINUTE_MS;
/** Older than this and Razorpay's own auto-refund has taken the decision. */
const CAPTURE_WINDOW_MS = 24 * 60 * MINUTE_MS;
/** A guest polling their order page asks Razorpay at most this often. */
const READ_RECHECK_MS = 20_000;
const BATCH_LIMIT = 25;

/**
 * Mark an order paid. The guard is the write itself: of a verify, a status
 * poll and the sweep all landing together, exactly one matches PENDING — the
 * rest read the order it already became.
 */
export async function markFoodOrderPaid(orderId: Types.ObjectId, razorpayPaymentId: string) {
  const paid = await VenueFoodOrderModel.findOneAndUpdate(
    { _id: orderId, payment_status: 'PENDING' },
    { $set: { payment_status: 'PAID', razorpay_payment_id: razorpayPaymentId, paid_at: new Date() } },
    { new: true }
  );
  if (paid) {
    logs.server.info(FOOD_LOG, 'paid', {
      orderId: orderId.toHexString(),
      orderNo: paid.order_no,
      venueId: paid.venue_id.toHexString(),
      totalPaise: paid.total_paise,
    });
    return paid;
  }
  return VenueFoodOrderModel.findById(orderId);
}

/** Ask Razorpay whether an unpaid order was in fact captured, and adopt it when the amount is the order's own. */
async function adoptCapture(order: IVenueFoodOrder) {
  await VenueFoodOrderModel.updateOne({ _id: order._id }, { $set: { reconcile_checked_at: new Date() } });
  const keys = await razorpayKeysFor(order.razorpay_integration_id);
  const captured = await findCapturedPaymentForOrder(order.razorpay_order_id, keys);
  if (!captured) return order;
  if (captured.amount !== order.total_paise) {
    logs.server.warn(FOOD_LOG, 'reconcile', {
      orderNo: order.order_no,
      capturedPaise: captured.amount,
      totalPaise: order.total_paise,
      msg: 'captured amount differs from the order total — left for a human',
    });
    return order;
  }
  return (await markFoodOrderPaid(order._id, captured.id)) ?? order;
}

/** The guest's order page: a still-unpaid order is rechecked with Razorpay, but never more than once per window. */
export async function recheckOnRead(order: IVenueFoodOrder) {
  if (order.payment_status !== 'PENDING' || !order.razorpay_order_id) return order;
  const last = order.reconcile_checked_at?.getTime() ?? 0;
  if (Date.now() - last < READ_RECHECK_MS) return order;
  try {
    return await adoptCapture(order);
  } catch (error) {
    logs.server.warn(FOOD_LOG, 'recheck', { error, orderNo: order.order_no, msg: 'payment recheck failed' });
    return order;
  }
}

const refundReceipt = (order: IVenueFoodOrder) => `refund_${order.order_no}`;

/**
 * Send a cancelled order's money back, once. Razorpay has no idempotency key
 * on a refund, so the order is stamped REFUND_PENDING before this runs and the
 * refund is looked up by its receipt before one is sent — a retry after a
 * timeout finds the refund it already made.
 */
export async function settleFoodRefund(order: IVenueFoodOrder) {
  if (order.payment_status !== 'REFUND_PENDING' || !order.razorpay_payment_id) return;
  const keys = await razorpayKeysFor(order.razorpay_integration_id);
  const receipt = refundReceipt(order);
  const sent = (await listRazorpayRefunds(order.razorpay_payment_id, keys)).find((refund) => refund.receipt === receipt);
  const refund =
    sent ??
    (await createRazorpayRefund({
      paymentId: order.razorpay_payment_id,
      amountPaise: order.total_paise,
      receipt,
      notes: { kind: 'venue_food', order_no: order.order_no },
      account: keys,
    }));
  if (refund.status === 'failed') {
    logs.server.error(FOOD_LOG, 'refund', { orderNo: order.order_no, refundId: refund.id, msg: 'Razorpay failed the refund — needs a human' });
    return;
  }
  await VenueFoodOrderModel.updateOne(
    { _id: order._id, payment_status: 'REFUND_PENDING' },
    { $set: { payment_status: 'REFUNDED', razorpay_refund_id: refund.id } }
  );
  logs.server.info(FOOD_LOG, 'refunded', { orderNo: order.order_no, refundId: refund.id, totalPaise: order.total_paise });
}

async function eachSafely(orders: IVenueFoodOrder[], operation: string, run: (order: IVenueFoodOrder) => Promise<unknown>) {
  for (const order of orders) {
    try {
      await run(order);
    } catch (error) {
      logs.server.warn(FOOD_LOG, operation, { error, orderNo: order.order_no, msg: 'sweep step failed' });
    }
  }
}

async function sweep() {
  const now = Date.now();
  const unclaimed = await VenueFoodOrderModel.find({
    payment_status: 'PENDING',
    razorpay_order_id: { $ne: '' },
    created_at: { $gte: new Date(now - CAPTURE_WINDOW_MS), $lte: new Date(now - CAPTURE_GRACE_MS) },
    $or: [{ reconcile_checked_at: null }, { reconcile_checked_at: { $lte: new Date(now - SWEEP_INTERVAL_MS) } }],
  })
    .sort({ reconcile_checked_at: 1 })
    .limit(BATCH_LIMIT);
  await eachSafely(unclaimed, 'reconcile', adoptCapture);

  const owed = await VenueFoodOrderModel.find({
    payment_status: 'REFUND_PENDING',
    // A refund Razorpay keeps failing is a human's job after a day, not a call every five minutes forever.
    updated_at: { $gte: new Date(now - CAPTURE_WINDOW_MS), $lte: new Date(now - CAPTURE_GRACE_MS) },
  })
    .sort({ updated_at: 1 })
    .limit(BATCH_LIMIT);
  await eachSafely(owed, 'refund', settleFoodRefund);
}

/** Start the 5-minute food-order sweep. No-ops under NODE_ENV=test. */
export function startVenueFoodReconciler(): void {
  startClusterJob({
    component: FOOD_LOG,
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: sweep,
  });
}
