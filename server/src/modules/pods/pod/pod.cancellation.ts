/**
 * `podService` — ending a pod: host delete, venue and system cancellation,
 * admin removal, revoking a cancellation, and releasing a completed pod's
 * stock. Composed into `podService` in pod.service.ts.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from './pod.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { bucketForPod } from '@modules/finance/finance/breakdown.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { accountHealthService } from '@modules/access/accountHealth/accountHealth.service';
import { cancelHeldRefundsForPod, isRevokeWindowOpen } from './pod.refundHold';
import { podAuditService } from '@modules/pods/podAudit/podAudit.service';
import type { PodAuditSource } from '@modules/pods/podAudit/podAudit.model';
import { loadClubSlugMap, notFound, podOwnerId, toPub } from './pod.shared';
import { findHostedPod } from './pod.validation';
import { assertOwnedVenue } from './pod.venue';
import { applyProductDeltas } from './pod.products';
import {
  emailHostAutoCancelled,
  refundAndNotifyCancellation,
  round2,
  softDeletePod,
  whatsappHostCancellationRequested,
} from './pod.cancelRefund';

/** Revoking reads the pod twice — once to check, once to claim the flip — and
 * both misses mean the same thing to the caller: there is no cancellation here
 * to undo (somebody else already undid it). */
function notCancelled(): never {
  throw new GraphQLError('This pod is not cancelled.', {
    extensions: { code: 'BAD_USER_INPUT' },
  });
}

/** Why the console must grey the Revoke button, or null when it must not.
 * The same two tests `revokeCancellation` throws on, answered without throwing
 * so a panel can explain itself before the admin clicks. */
function revokeBlockedReason(pod: any): 'NOT_CANCELLED' | 'POD_DATE_PASSED' | null {
  if (!pod.deleted_at) return 'NOT_CANCELLED';
  return isRevokeWindowOpen(pod) ? null : 'POD_DATE_PASSED';
}

/** A pod cannot be brought back once its own start has gone by: nobody can
 * attend a session that has already begun, and reinstating it would put a pod
 * on the platform that is live or over with an empty door. The console greys
 * its button on the same test — this is the one that actually decides. */
function revokeWindowClosed(): never {
  throw new GraphQLError(
    'This pod already started — a cancellation can only be revoked before the pod date and time.',
    { extensions: { code: 'BAD_USER_INPUT' } }
  );
}

/** Subjects offered in the host's delete-pod reason dropdown (kept in sync with the apps). */
export const POD_DELETE_REASON_SUBJECTS = [
  'Event cancelled',
  'Venue unavailable',
  'Low attendance',
  'Rescheduling',
  'Other',
] as const;

const POD_DELETE_REASON_SET = new Set<string>(POD_DELETE_REASON_SUBJECTS);

function buildDeleteReason(subject: string, note?: string | null): string {
  const cleanSubject = (subject ?? '').trim();
  const cleanNote = (note ?? '').trim();
  if (!POD_DELETE_REASON_SET.has(cleanSubject)) {
    throw new GraphQLError('Select a valid delete reason', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (cleanSubject === 'Other' && !cleanNote) {
    throw new GraphQLError('Please describe the reason', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return cleanNote ? `${cleanSubject} — ${cleanNote}` : cleanSubject;
}

/** Duncit's own side of a cancellation. A type guard rather than a comparison at
 * the call site so `remove` can hand the source straight to the shared path. */
const isDuncitCancel = (source: PodAuditSource): source is 'ADMIN' | 'CLUB_ADMIN' =>
  source === 'ADMIN' || source === 'CLUB_ADMIN';

/** The admin and club-admin deletes carry no reason field, and both the refund
 * metadata and the cancellation email print one. */
const DUNCIT_CANCEL_REASON = 'Cancelled by Duncit';

/** The note a revoke records when the admin gave no reason of their own. */
const REVOKE_CANCELLATION_NOTE = 'Cancellation revoked by Duncit';

/**
 * A revoked cancellation puts the pod back ONLINE — that is the whole point of
 * the button. The one exception is a pod whose venue never answered: it was
 * never live to begin with, and publishing it now would advertise a booking the
 * venue has not agreed to.
 */
const isActiveAfterRevoke = (doc: any): boolean => doc.venue_approval_status !== 'PENDING';

/**
 * The venue seat a cancellation freed, taken back.
 *
 * The cancel ran `releaseForPod`, which put the slot back on the market — so by
 * the time somebody revokes, another pod may be sitting in it. The claim is the
 * SAME atomic write the original booking used (PENDING while the venue is still
 * deciding, BOOKED once it has said yes), so a lost race throws CONFLICT here
 * instead of quietly restoring this pod on top of another pod's seat.
 *
 * A venue-DECLINED pod carries no slot at all — the decline nulls it — so there
 * is nothing to take back and nothing to fail on.
 */
async function reclaimSlotForRevoke(doc: any): Promise<void> {
  if (!doc.venue_slot_id) return;
  const slot = await VenueSlotModel.findById(doc.venue_slot_id);
  if (!slot) {
    throw new GraphQLError(
      'The venue slot this pod held no longer exists. Edit the pod to pick another slot.',
      { extensions: { code: 'CONFLICT' } }
    );
  }
  const slotId = String(slot._id);
  const venueId = String(slot.venue_id);
  const podId = String(doc._id);
  if (doc.venue_approval_status === 'PENDING') {
    await venueSlotService.holdForPod(slotId, venueId, podId);
    return;
  }
  await venueSlotService.bookForPod(slotId, venueId, podId);
}

export const podCancellationMethods = {
  /** What deleting this pod means: other attendees + refundable paid amount (2B). */
  async hostDeleteImpact(id: string, userId: string) {
    const doc = await findHostedPod(id, userId);
    const hostIds = new Set((doc.pod_hosts_id ?? []).map(String));
    const others = (doc.pod_attendees ?? []).map(String).filter((uid: string) => !hostIds.has(uid));
    const payments = await PaymentModel.find({ pod_id: doc._id, status: 'SUCCESS' })
      .select('total currency_symbol')
      .lean();
    const settings = payments.length === 0 ? await getFinanceSettings() : null;
    return {
      // Seats, not buyers — this number is printed next to the refund total, and
      // one person cancelling a four-seat booking takes four people with them.
      other_attendee_count: others.length + (doc.extra_seats ?? 0),
      refundable_payment_count: payments.length,
      refund_total: payments.reduce((sum: number, p: any) => sum + (p.total ?? 0), 0),
      currency_symbol: payments[0]?.currency_symbol ?? settings?.currency_symbol ?? '₹',
    };
  },

  /**
   * Host self-service delete (2B): mandatory reason, refunds every SUCCESS
   * payment (visible in the Finance portal's payment logs), and emails the
   * audience — a cancellation note to each attendee and a refund note to payers.
   */
  async hostRemove(id: string, userId: string, reasonSubject: string, reasonNote?: string | null) {
    const doc = await findHostedPod(id, userId);
    const reason = buildDeleteReason(reasonSubject, reasonNote);
    const refunded = await refundAndNotifyCancellation(doc, userId, reason, 'HOST');
    // null means a concurrent cancel committed the delete first and has already
    // told everyone, the host included.
    if (refunded !== null) await whatsappHostCancellationRequested(doc, userId);
    return true;
  },

  /**
   * Venue owner cancels an UPCOMING pod booked at their venue: refunds every
   * SUCCESS payment, emails the audience and soft-deletes the pod (audit source
   * VENUE_OWNER, so Finance → Cancel & Refunds lists it as kind VENUE), then
   * deducts the Account Health penalty configured in Admin → Pods → Pod
   * Settings from that venue. Returns the penalty and the resulting score.
   */
  async venueCancelPod(podId: string, userId: string, reason: string) {
    if (!Types.ObjectId.isValid(podId)) {
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const trimmed = String(reason ?? '').trim();
    if (trimmed.length < 5) {
      throw new GraphQLError('Please describe why you are cancelling this pod', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const note = trimmed.slice(0, 500);
    // Deliberately NOT includeDeleted: an already-cancelled pod is a clean
    // NOT_FOUND before any refund or penalty runs.
    const doc = await PodModel.findById(podId);
    if (!doc) notFound();
    await assertOwnedVenue(doc, userId);
    if (bucketForPod(doc, Date.now()) !== 'upcoming') {
      throw new GraphQLError('Only an upcoming pod can be cancelled', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const podTitle = doc!.pod_title;
    const venueId = String(doc!.venue_id);
    const refunded_count = await refundAndNotifyCancellation(doc, userId, note, 'VENUE_OWNER');
    // A concurrent cancel committed the delete first and already took the
    // penalty. Report that cancellation's outcome — docking the venue a second
    // time for one cancellation is the bug this guard exists to stop.
    if (refunded_count === null) {
      const current = await accountHealthService.getVenueHealth(venueId);
      return {
        pod_id: podId,
        health_penalty: 0,
        venue_health_score: current.total_score,
        refunded_count: 0,
      };
    }

    const health_penalty = await settingsService.getVenueCancelHealthPenalty();
    const venue_health_score = await accountHealthService.applySystemPenalty({
      subject_type: 'VENUE',
      subject_id: venueId,
      points: health_penalty,
      remark: `Venue owner cancelled the pod "${podTitle}". Reason: ${note}`,
    });

    return { pod_id: podId, health_penalty, venue_health_score, refunded_count };
  },

  /**
   * Platform-initiated cancellation (the auto-cancel sweep): the same
   * money-and-mail path as every other cancel, except the refund follows the
   * venue's cancellation policy — `refundPct` of each payment's refundable
   * remainder — and the host is emailed that their pod was cancelled for them.
   * Returns the refunded payment count, or null when the pod was already
   * cancelled (or never existed) — the caller must then treat it as done.
   */
  async systemCancelPod(podDocId: string, reason: string, refundPct: number) {
    if (!Types.ObjectId.isValid(podDocId)) return null;
    // The soft-delete pre-find hook hides already-cancelled pods, which is
    // exactly the answer wanted here: null, nothing left to do.
    const doc = await PodModel.findById(podDocId);
    if (!doc) return null;
    // The host is an attendee by default and is told by `emailHostAutoCancelled`
    // below, so they stay out of the member fan-out — the same rule the host
    // path applies. The audit actor and refund_initiator_id stay '' (nobody).
    const refunded = await refundAndNotifyCancellation(
      doc,
      '',
      reason,
      'SYSTEM',
      refundPct,
      podOwnerId(doc)
    );
    if (refunded !== null) await emailHostAutoCancelled(doc);
    return refunded;
  },

  async remove(id: string, audit?: { actorUserId?: string | null; source: PodAuditSource; note?: string | null }) {
    // An admin or club-admin delete IS a cancellation, and this path used to run
    // it in silence: no refund of the SUCCESS payments and not a word to the
    // attendees, unlike the host and venue flows. It now goes through the same
    // money-and-mail path. A pod that is already cancelled has nothing left to
    // refund and falls through to the idempotent soft delete below.
    if (audit && isDuncitCancel(audit.source)) {
      const doc = await PodModel.findById(id);
      if (doc) {
        const reason = audit.note ?? DUNCIT_CANCEL_REASON;
        await refundAndNotifyCancellation(doc, String(audit.actorUserId ?? ''), reason, audit.source);
        return;
      }
    }
    // Portals now list cancelled pods, so Delete can be pressed on one twice.
    // softDeletePod answers idempotently instead of a confusing 404 — the slot
    // and inventory releases already ran the first time — so a repeat delete
    // succeeds whether or not this call is the one that committed it.
    await softDeletePod(id, audit);
  },

  /**
   * Undo a cancellation — the pod comes back, and comes back VISIBLE.
   *
   * A cancel is a soft delete plus two releases: the venue slot goes back on
   * the market, and the pod's reserved product units return to the sellable
   * pool. Bringing the pod back has to claim both AGAIN, and by now either can
   * be gone — the slot to another pod, the stock to the shop — which is why
   * this is not a `deleted_at = null` write.
   *
   * Order matters. The flag flips FIRST, as a conditional write, so two admins
   * pressing Revoke at the same moment cannot both go on to reserve the same
   * units; the loser reads "not cancelled" and stops. If a claim then fails,
   * the pod is put straight back to cancelled at its ORIGINAL timestamp — the
   * audit trail must not say it was cancelled later than it was.
   *
   * What this does NOT undo is the money. Every SUCCESS payment was refunded
   * and every attendee was emailed and messaged that the pod was off; those are
   * real movements, and re-charging somebody because an admin changed their
   * mind is not a thing a button may do. The pod returns with its bookings
   * intact and their payments refunded, and the console says exactly that
   * before the admin presses it.
   */
  /**
   * What revoking this pod's cancellation would cost, before anybody presses
   * anything: whether it is even allowed, who was refunded, and how much of
   * that money is gone for good.
   *
   * The two refund states are the whole point of the panel. A PAID row is a
   * LOSS — that money is back with the attendee and reinstating the pod does
   * not bring it back; the console totals those. A HELD row cost nothing yet
   * and the revoke drops it, which is exactly what the hold setting buys.
   *
   * A Backout's partial refund is deliberately NOT counted: it would have been
   * paid whether or not the pod was cancelled, so charging it to this decision
   * would overstate the price of undoing one. `cancel_refund_amount` is the
   * cancellation's own share, which is why it is stored separately.
   */
  async revokePreview(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await PodModel.findById(id).setOptions({ includeDeleted: true });
    if (!doc) notFound();
    const pod = doc!;
    const payments = await PaymentModel.find({
      pod_id: pod._id,
      $or: [{ 'metadata.cancel_refund_amount': { $gt: 0 } }, { 'metadata.refund_hold': true }],
    }).lean();

    const refunds = payments.map((payment: any) => {
      const meta = payment.metadata ?? {};
      const held = meta.refund_hold === true;
      // Rows written before this pod carried a per-cancellation figure fall back
      // to the booking's running refund total — the only number they have.
      const paid = Number(meta.cancel_refund_amount ?? meta.refunded_amount ?? 0);
      return {
        payment_id: String(payment._id),
        user_id: payment.user_id ? String(payment.user_id) : null,
        user_name: payment.user_name ?? '',
        user_email: payment.user_email ?? '',
        amount: round2(held ? Number(meta.refund_hold_amount ?? 0) : paid),
        currency_symbol: payment.currency_symbol ?? '',
        state: held ? 'HELD' : 'PAID',
      };
    });
    const totalOf = (state: string) =>
      round2(refunds.filter((r) => r.state === state).reduce((sum, r) => sum + r.amount, 0));

    return {
      pod_id: String(pod._id),
      pod_title: pod.pod_title,
      pod_date_time: pod.pod_date_time?.toISOString?.() ?? null,
      is_cancelled: Boolean(pod.deleted_at),
      can_revoke: Boolean(pod.deleted_at) && isRevokeWindowOpen(pod),
      blocked_reason: revokeBlockedReason(pod),
      refunds,
      loss_total: totalOf('PAID'),
      held_total: totalOf('HELD'),
      currency_symbol: refunds.find((r) => r.currency_symbol)?.currency_symbol ?? '₹',
    };
  },

  async revokeCancellation(id: string, actorUserId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await PodModel.findById(id).setOptions({ includeDeleted: true });
    if (!doc) notFound();
    const cancelledAt = doc.deleted_at;
    if (!cancelledAt) notCancelled();
    if (!isRevokeWindowOpen(doc)) revokeWindowClosed();
    // The filter names deleted_at itself, so the soft-delete pre-find hook
    // stands down and this is the one write that can win the flip.
    const restored = await PodModel.findOneAndUpdate(
      { _id: doc._id, deleted_at: { $ne: null } },
      { $set: { deleted_at: null, is_active: isActiveAfterRevoke(doc) } },
      { new: true }
    ).setOptions({ includeDeleted: true });
    if (!restored) notCancelled();
    try {
      await reclaimSlotForRevoke(restored);
      await applyProductDeltas([], restored.product_requests ?? []);
    } catch (e) {
      // Hand back whatever was claimed before the failure. A slot still held by
      // a pod that is cancelled again would be unbookable forever; the release
      // is keyed on this pod, so it is a no-op when the claim never landed.
      await venueSlotService.releaseForPod(String(restored._id));
      await PodModel.updateOne(
        { _id: restored._id },
        { $set: { deleted_at: cancelledAt, is_active: false } }
      ).setOptions({ includeDeleted: true });
      throw e;
    }
    // The money that was never sent: a refund the cancellation only SCHEDULED
    // is dropped outright, so a revoke inside the window costs nothing. Refunds
    // that were actually paid out stay paid — the console names them as the
    // loss before the admin presses the button.
    await cancelHeldRefundsForPod(restored._id);
    await podAuditService.record({
      pod: restored,
      action: 'RESTORE',
      source: 'ADMIN',
      actorUserId,
      note: REVOKE_CANCELLATION_NOTE,
    });
    const slugMap = await loadClubSlugMap([restored]);
    return toPub(restored, slugMap);
  },

  /**
   * When a pod completes (settlement submitted / finance approved), hand the
   * UNSOLD stocked units back to the sellable pool: each row's reservation
   * drops by (quantity − sold_count). Sold units already left inventory (and
   * their reservation share) at order time. Callers must invoke this exactly
   * once, at the moment completed_at transitions from null.
   */
  async releaseCompletedPodStock(podId: unknown) {
    const pod = await PodModel.findById(podId).select('product_requests');
    for (const row of (pod as any)?.product_requests ?? []) {
      const unsold = Math.max(0, Number(row.quantity || 0) - Number(row.sold_count || 0));
      if (!unsold) continue;
      const product = await InventoryProductModel.findById(row.product_id);
      if (!product) continue;
      product.requested_count = Math.max(0, product.requested_count - unsold);
      await product.save();
    }
    return true;
  },
};
