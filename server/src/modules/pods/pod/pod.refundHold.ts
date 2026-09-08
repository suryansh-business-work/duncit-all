/**
 * Refunds a cancellation SCHEDULES rather than pays (Admin > Pods > Pod
 * Settings > "Hold cancellation refunds").
 *
 * One instant decides both halves of this feature: the pod's own START.
 *
 *   before the start   the cancellation can still be revoked, so its refund
 *                      might yet turn out to have been unnecessary — it is HELD
 *   at / after it      the cancellation is final, so the refund is RELEASED
 *
 * That is why there is no second deadline setting to keep in step with the
 * first. Revoking before the start cancels a held refund outright and the money
 * never leaves; the sweep below pays every held refund the moment its pod's
 * start passes. With the setting off nothing here runs at all and a
 * cancellation refunds immediately, exactly as it always did.
 *
 * A held payment stays `SUCCESS` on purpose: the money genuinely is still
 * collected. It carries `metadata.refund_hold` and is invisible to everything
 * else, because a cancelled pod never settles.
 *
 * SINGLE REPLICA ONLY, like every scheduler here. No-ops under NODE_ENV=test.
 */
import { PodModel } from './pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { sendPodRefundEmail } from '@services/email/email.service';
import { logs } from '@observability/log';

const SWEEP_INTERVAL_MS = 5 * 60_000;
const FIRST_SWEEP_DELAY_MS = 60_000;

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** The instant a pod's cancellation stops being reversible: its own start.
 * Null when the pod carries no usable start, which every caller must read as
 * "no window at all" rather than "an open one". */
export function podRevokeDeadline(pod: {
  pod_date_time?: Date | string | null;
}): Date | null {
  const start = pod?.pod_date_time ? new Date(pod.pod_date_time).getTime() : Number.NaN;
  return Number.isNaN(start) ? null : new Date(start);
}

/** Whether a cancelled pod may still be put back — the same test the revoke
 * mutation enforces and the console greys its button on. */
export function isRevokeWindowOpen(
  pod: { pod_date_time?: Date | string | null },
  now: Date = new Date()
): boolean {
  const deadline = podRevokeDeadline(pod);
  return deadline !== null && deadline.getTime() > now.getTime();
}

/**
 * When this pod's cancellation refunds come due, or null to pay them now.
 *
 * Null in three cases that all mean the same thing: the operator has not asked
 * for holds, the pod has no usable start, or its start is already behind us —
 * and a cancellation that can never be revoked has nothing to wait for.
 */
export async function refundHoldReleaseAt(pod: {
  pod_date_time?: Date | string | null;
}): Promise<Date | null> {
  if (!(await settingsService.getPodCancelRefundHold())) return null;
  return isRevokeWindowOpen(pod) ? podRevokeDeadline(pod) : null;
}

/**
 * Claim one payment for a HELD refund: it stays SUCCESS and is stamped with
 * what it owes, to whom, and when it comes due.
 *
 * The CAS mirrors the immediate refund's — keyed on the payment still being an
 * unheld SUCCESS — so two cancels racing claim each payment once and only the
 * winner quotes it. Returns false when the other one owns it.
 *
 * `release_at` is stored as a real Date, not the ISO string the sibling refund
 * fields use: the sweep RANGE-QUERIES it, and a string comparison that happens
 * to work is a trap for the first row written in another format.
 */
export async function holdRefundForPayment(input: {
  paymentId: unknown;
  amount: number;
  reason: string;
  releaseAt: Date;
  initiatedBy: string;
  initiatorId: string;
}): Promise<boolean> {
  const claimed = await PaymentModel.findOneAndUpdate(
    { _id: input.paymentId, status: 'SUCCESS', 'metadata.refund_hold': { $ne: true } },
    {
      $set: {
        'metadata.refund_hold': true,
        'metadata.refund_hold_amount': round2(input.amount),
        'metadata.refund_hold_reason': input.reason,
        'metadata.refund_hold_release_at': input.releaseAt,
        'metadata.refund_hold_initiated_by': input.initiatedBy,
        'metadata.refund_hold_initiator_id': input.initiatorId,
      },
    }
  );
  return Boolean(claimed);
}

/**
 * Drop every held refund on a pod — what revoking a cancellation does to the
 * money. The payments stay SUCCESS and otherwise untouched: the pod is back
 * on, so nothing was ever owed. Returns how many were let go.
 */
export async function cancelHeldRefundsForPod(podId: unknown): Promise<number> {
  const result = await PaymentModel.updateMany(
    { pod_id: podId, 'metadata.refund_hold': true },
    {
      $set: {
        'metadata.refund_hold': false,
        'metadata.refund_hold_cancelled_at': new Date(),
      },
    }
  );
  return result.modifiedCount ?? 0;
}

/**
 * Pay one held refund out: SUCCESS becomes REFUNDED at the figure the hold
 * quoted, then the refund note its payer never got at cancellation time.
 *
 * The pod is re-read INSIDE the release rather than trusted from the sweep's
 * query, because the one thing that must never happen is paying out on a pod an
 * admin revoked a moment ago — the release and the revoke meet at exactly the
 * pod's start, so that window is small but real.
 */
async function releaseHeldRefund(payment: any): Promise<boolean> {
  const pod = await PodModel.findById(payment.pod_id)
    .setOptions({ includeDeleted: true })
    .select('pod_title deleted_at')
    .lean();
  if (!pod?.deleted_at) {
    // Revoked while the sweep was reading: the hold is void, not due.
    await cancelHeldRefundsForPod(payment.pod_id);
    return false;
  }
  const meta = payment.metadata ?? {};
  const amount = round2(Number(meta.refund_hold_amount) || 0);
  const alreadyRefunded = Number(meta.refunded_amount ?? 0);
  const flipped = await PaymentModel.findOneAndUpdate(
    { _id: payment._id, status: 'SUCCESS', 'metadata.refund_hold': true },
    {
      $set: {
        status: 'REFUNDED',
        'metadata.refunded_amount': round2(alreadyRefunded + amount),
        // The cancellation's own share, as the immediate path records it too.
        'metadata.cancel_refund_amount': amount,
        'metadata.refund_reason': meta.refund_hold_reason ?? '',
        'metadata.refunded_at': new Date().toISOString(),
        'metadata.refund_initiated_by': meta.refund_hold_initiated_by ?? 'SYSTEM',
        'metadata.refund_initiator_id': meta.refund_hold_initiator_id ?? '',
        'metadata.refund_hold': false,
        'metadata.refund_hold_released_at': new Date(),
      },
    }
  );
  if (!flipped) return false;
  if (amount <= 0) return true;
  // Best-effort, exactly as the immediate path treats it: the money has moved
  // whether or not the note about it lands.
  try {
    await sendPodRefundEmail({
      to: payment.user_email,
      name: payment.user_name,
      pod_title: (pod as { pod_title?: string }).pod_title ?? '',
      amount: `${payment.currency_symbol}${amount}`,
      reason: meta.refund_hold_reason ?? '',
    });
  } catch (error) {
    logs.server.error('pod-refund-hold', 'releaseHeldRefund', {
      error,
      payment_id: String(payment._id),
      msg: 'held refund released but its email failed',
    });
  }
  return true;
}

/**
 * One sweep: pay every held refund whose pod has started. Exported so it can be
 * run on demand. Returns how many refunds this run released.
 *
 * The query reads PAYMENTS, not pods: the due date is stamped on the hold, so
 * this is one indexed range read rather than a scan of every cancelled pod.
 */
export async function runRefundHoldReleaseSweep(): Promise<number> {
  const cursor = PaymentModel.find({
    status: 'SUCCESS',
    'metadata.refund_hold': true,
    'metadata.refund_hold_release_at': { $lte: new Date() },
  }).cursor();

  let released = 0;
  for await (const payment of cursor) {
    try {
      if (await releaseHeldRefund(payment)) released += 1;
    } catch (error) {
      // One payment's failure never aborts the sweep — the next tick retries it.
      logs.server.error('pod-refund-hold', 'releaseHeldRefund', {
        error,
        payment_id: String(payment._id),
        msg: 'held refund release failed',
      });
    }
  }
  return released;
}

/** Start the release loop (first sweep ~1 min after boot). Returns a stop
 * function. No-ops under NODE_ENV=test. */
export function startRefundHoldReleaseScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  let sweeping = false;
  const sweep = () => {
    if (sweeping) return;
    sweeping = true;
    runRefundHoldReleaseSweep()
      .catch((error) => {
        logs.server.error('pod-refund-hold', 'sweep', { error, msg: 'sweep failed' });
      })
      .finally(() => {
        sweeping = false;
      });
  };
  const first = setTimeout(sweep, FIRST_SWEEP_DELAY_MS);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
