/**
 * Pod cancellation side effects: the soft delete, the attendee refund claim
 * and the WhatsApp/email notices each cancellation path sends.
 */
import { podSeatsTaken } from './pod.seats';
import { trimTrailingSlash } from '@utils/url';
import { PodModel } from './pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { sendHostPodAutoCancelledEmail, sendPodRefundEmail } from '@services/email/email.service';
import { BackoutRequestModel } from '@modules/pods/podMember/backoutRequest.model';
import { getUrlConfigs } from '@config/url-configs';
import { holdRefundForPayment, refundHoldReleaseAt } from './pod.refundHold';
import { podAuditService } from '@modules/pods/podAudit/podAudit.service';
import type { PodAuditSource } from '@modules/pods/podAudit/podAudit.model';
import { logs } from '@observability/log';
import { notifyEach, notifyEvent } from '@services/notify/notify.service';
import {
  loadClubSlugMap,
  notFound,
  podAudience,
  podDateLabel,
  podNotificationLink,
  podOwnerId,
  podTimeLabel,
} from './pod.shared';
import { applyProductDeltas } from './pod.products';

/** Who cancelled a pod — doubles as the refund metadata tag and the audit source.
 * SYSTEM is the auto-cancel sweep: no human pressed anything. */
type PodCancelInitiator = 'HOST' | 'VENUE_OWNER' | 'ADMIN' | 'CLUB_ADMIN' | 'SYSTEM';

/** The WhatsApp scenario each cancel path fires. Duncit and a club admin share
 * one template — the attendee is told the platform cancelled it either way. */
const WA_CANCEL_EVENT: Record<PodCancelInitiator, string> = {
  HOST: 'USER_POD_CANCELLED_BY_HOST',
  VENUE_OWNER: 'USER_POD_CANCELLED_BY_VENUE',
  ADMIN: 'USER_POD_CANCELLED_BY_DUNCIT',
  CLUB_ADMIN: 'USER_POD_CANCELLED_BY_DUNCIT',
  // The sweep speaks as the platform: the attendee is told Duncit cancelled it.
  SYSTEM: 'USER_POD_CANCELLED_BY_DUNCIT',
};

/** The service method a cancellation's failures are filed under. */
const CANCEL_LOG_COMPONENT: Record<PodCancelInitiator, string> = {
  HOST: 'hostRemove',
  VENUE_OWNER: 'venueCancelPod',
  ADMIN: 'remove',
  CLUB_ADMIN: 'remove',
  SYSTEM: 'systemCancelPod',
};

/** Round to whole paise — refund figures are printed to people. */
export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Soft-deletes a pod exactly once. The `deleted_at` flip is a CONDITIONAL write,
 * so when two cancels race only one caller gets `true` back — the loser must not
 * fan out a second round of cancellation emails or dock the venue's health
 * twice. Returns false when the pod was already cancelled.
 */
export async function softDeletePod(
  id: string,
  audit?: { actorUserId?: string | null; source: PodAuditSource; note?: string | null }
): Promise<boolean> {
  const doc = await PodModel.findById(id).setOptions({ includeDeleted: true });
  if (!doc) notFound();
  if (doc!.deleted_at) return false;
  // Claim the delete FIRST, then release. The filter carries deleted_at itself,
  // so the soft-delete hook leaves it alone and the write only lands while the
  // pod is still live — only the winner goes on to release. Releasing before
  // the claim let two racing cancels both hand the reserved units back,
  // crediting the pool twice.
  const claimed = await PodModel.findOneAndUpdate(
    { _id: doc!._id, deleted_at: null },
    { $set: { deleted_at: new Date(), is_active: false } },
    { new: true }
  ).setOptions({ includeDeleted: true });
  if (!claimed) return false;
  // The cancellation is committed; a failed release must not stop the refunds
  // that follow it. It is logged for an operator to put right.
  try {
    await applyProductDeltas(doc!.product_requests ?? [], []);
    await venueSlotService.releaseForPod(String(doc!._id));
  } catch (err) {
    logs.server.error('pod', 'softDeletePod', {
      error: err,
      pod_id: String(doc!._id),
      msg: 'releasing the slot or reserved inventory failed',
    });
  }
  await podAuditService.record({
    pod: claimed,
    action: 'DELETE',
    source: audit?.source ?? 'SYSTEM',
    actorUserId: audit?.actorUserId,
    note: audit?.note,
  });
  return true;
}

/**
 * Take ownership of one payment's cancellation refund — paid now, or held.
 *
 * Both branches are the SAME conditional write, keyed on the payment still
 * being an unclaimed SUCCESS: a human cancel racing the auto-cancel sweep may
 * already have refunded this payment at ITS figure, and a plain save() from a
 * stale snapshot would overwrite it. False means the other cancel owns this
 * payment — it quotes and emails it, not this one.
 */
async function claimCancellationRefund(input: {
  payment: any;
  refund: number;
  alreadyRefunded: number;
  reason: string;
  initiatedBy: PodCancelInitiator;
  actorUserId: string;
  holdUntil: Date | null;
}): Promise<boolean> {
  const { payment, refund, alreadyRefunded, reason, initiatedBy, actorUserId } = input;
  if (input.holdUntil) {
    return holdRefundForPayment({
      paymentId: payment._id,
      amount: refund,
      reason,
      releaseAt: input.holdUntil,
      initiatedBy,
      initiatorId: actorUserId,
    });
  }
  const flipped = await PaymentModel.findOneAndUpdate(
    { _id: payment._id, status: 'SUCCESS' },
    {
      $set: {
        status: 'REFUNDED',
        'metadata.refunded_amount': round2(alreadyRefunded + refund),
        // THIS cancellation's own share, kept apart from the running
        // refunded_amount because that total may already carry a Backout's
        // partial refund — and the revoke console quotes the cancellation's
        // figure as the loss, not the booking's whole refund history.
        'metadata.cancel_refund_amount': refund,
        'metadata.refund_reason': reason,
        'metadata.refunded_at': new Date().toISOString(),
        'metadata.refund_initiated_by': initiatedBy,
        'metadata.refund_initiator_id': actorUserId,
      },
    }
  );
  return Boolean(flipped);
}

/**
 * The money-and-mail half of a pod cancellation, shared by the host delete and
 * the venue-owner cancel flows: snapshot the audience, commit the soft delete,
 * refund every SUCCESS payment, then best-effort email a cancellation note
 * to each attendee and a refund note to each payer. Returns the refunded count,
 * or null when a concurrent cancel had already committed the delete — the
 * caller must then skip every follow-up effect rather than double-apply it.
 *
 * `refundPct` exists for the SYSTEM sweep, whose refund follows the venue's
 * cancellation policy: each payment returns that share of its refundable
 * remainder, the withheld rest staying with the platform to cover the venue's
 * cancellation charge. Every human-initiated path keeps the full-refund default.
 *
 * Whether the refund is PAID or merely SCHEDULED is not this function's
 * decision — `refundHoldReleaseAt` answers it from one admin setting, for every
 * cancellation path at once, so no caller can hold on one route and pay on
 * another. The count returned is payments ACTIONED either way.
 */
export async function refundAndNotifyCancellation(
  doc: any,
  actorUserId: string,
  reason: string,
  initiatedBy: PodCancelInitiator,
  refundPct = 100,
  // Left out of the attendee fan-out because they are told separately. Defaults
  // to the actor; the SYSTEM sweep has no actor but still mails the host itself.
  excludeUserId = actorUserId
): Promise<number | null> {
  const podTitle = doc.pod_title;
  const logComponent = CANCEL_LOG_COMPONENT[initiatedBy];
  const pct = Math.min(100, Math.max(0, Number(refundPct) || 0));

  // The delete is claimed BEFORE any money moves, so of two cancels racing on
  // one pod exactly one refunds, mails and reports the count — the loser stops
  // here with nothing done. Refunding first let the loser claim the payments
  // while the other call won the delete, and then neither of them sent the
  // refund notes or quoted the refund. The audience is snapshotted from `doc`.
  const audience = await podAudience(doc, excludeUserId);
  const won = await softDeletePod(String(doc._id), {
    actorUserId,
    source: initiatedBy,
    note: reason,
  });
  // Another cancel committed first and owns the refunds and the notices.
  if (!won) return null;

  const payments = await PaymentModel.find({ pod_id: doc._id, status: 'SUCCESS' });
  // Null pays now; a Date holds every refund until the pod's start, which is
  // also the last moment the cancellation could still be revoked.
  const holdUntil = await refundHoldReleaseAt(doc);
  // Keyed by payer and SUMMED: one person can hold several payments for a pod
  // (a second seat, a re-try), every one of them is actioned here, and keeping
  // only the last document quoted them a fraction of their refund.
  const refundedByUser = new Map<string, { total: number; currency_symbol: string }>();
  const paymentRefunds = new Map<string, number>();
  for (const payment of payments) {
    const meta = (payment as any).metadata ?? {};
    // A partial Backout refund may already sit in refunded_amount — ticket
    // money, so it nets against the ticket share, never against the products.
    const alreadyRefunded = Number(meta.refunded_amount ?? 0);
    // The venue's charge is a claim on TICKET money only: product add-ons ride
    // on the same payment but never enter the pod waterfall (settlement's
    // ticketMoneyOf), so the policy share applies to the ticket remainder and
    // product money returns in full. At pct 100 this is total − alreadyRefunded.
    const products = Number(meta.product_cost_total) || 0;
    const ticketRefundable = Math.max(0, (payment.total ?? 0) - products - alreadyRefunded);
    const refund = round2(products + (ticketRefundable * pct) / 100);
    const claimed = await claimCancellationRefund({
      payment,
      refund,
      alreadyRefunded,
      reason,
      initiatedBy,
      actorUserId,
      holdUntil,
    });
    if (!claimed) continue;
    paymentRefunds.set(String(payment._id), refund);
    const payerId = String(payment.user_id);
    const soFar = refundedByUser.get(payerId);
    refundedByUser.set(payerId, {
      total: round2((soFar?.total ?? 0) + refund),
      currency_symbol: payment.currency_symbol,
    });
  }

  // A cancelled pod can never fill a released seat, and the payments behind any
  // open Backout were just flipped to REFUNDED above — left IN_PROCESS, the
  // Finance refund flow would CONFLICT on them forever. Close them the way a
  // rejoin does: CANCELLED, with the transition on the immutable timeline.
  try {
    const openBackouts = await BackoutRequestModel.find({
      pod_id: doc._id,
      status: 'IN_PROCESS',
    });
    for (const request of openBackouts) {
      request.status = 'CANCELLED';
      request.events.push({
        status: 'CANCELLED',
        backout_count: request.attempt_no,
        at: new Date(),
      });
      await request.save();
    }
  } catch (err) {
    logs.server.error('pod', logComponent, {
      error: err,
      msg: 'closing open backouts failed',
    });
  }

  // Same reasoning, same place: a cancelled pod must not leave a Request Change
  // sitting in the admin queue for a pod that no longer exists — nor keep its
  // "one live request per pod per role" index held.
  //
  // Wrapped INCLUDING the dynamic import: `closeAllForPod` swallows its own
  // errors, but a module that fails to resolve throws before it is ever called,
  // and by this line the refunds have already been written.
  try {
    const { podChangeRequestService } = await import(
      '@modules/pods/podChangeRequest/podChangeRequest.service'
    );
    await podChangeRequestService.closeAllForPod(String(doc._id), reason);
  } catch (err) {
    logs.server.error('pod', logComponent, {
      error: err,
      msg: 'closing open change requests failed',
    });
  }

  // Best-effort after the delete commits: the payers' refund records.
  //
  // The CANCELLATION email is not here any more. It used to be one generic
  // `pod-cancelled` to everybody; `notifyPodCancellation` below now sends
  // `user-pod-cancelled-by-host` / `-venue` / `-duncit` instead — the same
  // audience, but naming who cancelled, the refund and how long it takes, off
  // the array the WhatsApp message was already built from. Sending both would
  // put two cancellation emails in front of every attendee.
  //
  // A HELD refund sends nothing here. "Your refund has been initiated" would be
  // untrue — no money has moved and, if the cancellation is revoked, none will.
  // The release sweep sends each note at the moment it becomes true. The
  // cancellation message above still quotes the figure, so the attendee is told
  // what is coming; only the claim that it is on its way waits.
  try {
    await Promise.allSettled(
      (holdUntil ? [] : payments)
        // A payer whose policy share came to nothing gets no "refund initiated"
        // note — the cancellation email still reaches them, quoting a dash.
        .filter((payment) => (paymentRefunds.get(String(payment._id)) ?? 0) > 0)
        .map((payment) =>
          sendPodRefundEmail({
            to: payment.user_email,
            name: payment.user_name,
            pod_title: podTitle,
            amount: `${payment.currency_symbol}${paymentRefunds.get(String(payment._id)) ?? 0}`,
            reason,
          })
        )
    );
  } catch (err) {
    logs.server.error('pod', logComponent, {
      error: err,
      msg: 'delete emails failed',
    });
  }

  await whatsappPodCancellation(doc, initiatedBy, audience, refundedByUser);

  return paymentRefunds.size;
}

/** The refund as an email prints it: with its currency, or as a dash. */
const refundLabel = (refund?: { total: number; currency_symbol: string }): string =>
  refund && refund.total > 0 ? `${refund.currency_symbol}${refund.total}` : '—';

/**
 * The same cancellation over WhatsApp, one attendee at a time — AiSensy
 * rate-limits, so a 40-attendee pod fanned out in parallel is 40 concurrent
 * POSTs. The send never throws; every outcome lands in the WhatsApp log.
 *
 * The template quotes a refund and how long it takes, so the working-days
 * promise comes from Finance Settings rather than a constant here.
 */
async function whatsappPodCancellation(
  doc: any,
  initiatedBy: PodCancelInitiator,
  audience: Awaited<ReturnType<typeof podAudience>>,
  refundedByUser: Map<string, { total: number; currency_symbol: string }>
) {
  const [{ mwebUrl }, financeSettings, clubSlugById] = await Promise.all([
    getUrlConfigs(),
    getFinanceSettings(),
    loadClubSlugMap([doc]),
  ]);
  const path = podNotificationLink(doc, clubSlugById);
  const podLink = path ? `${trimTrailingSlash(mwebUrl)}${path}` : '';
  // `notifyEach`, not `sendEach`: the same fan-out now also sends
  // `user-pod-cancelled-by-host` / `-venue` / `-duncit`, filled from this very
  // array. `podAudience` already carries each attendee's address.
  await notifyEach(
    audience.map((attendee) => ({
      event: WA_CANCEL_EVENT[initiatedBy],
      email: attendee.email,
      entityId: String(doc._id),
      user: attendee.user,
      name: attendee.name,
      assets: podImageAssets(doc.pod_images_and_videos),
      params: [
        attendee.name,
        doc.pod_title,
        doc.pod_title,
        podDateLabel(doc),
        podTimeLabel(doc),
        // An attendee who paid nothing is still owed the news; the template
        // prints the rupee sign itself, so the figure carries no symbol.
        String(refundedByUser.get(attendee.user_id)?.total ?? 0),
        podLink,
        String(financeSettings.refund_processing_days),
      ],
      // The EMAIL renders the figure on its own, with no symbol printed around
      // it, so it needs one — and "nothing to refund" reads better than "0".
      vars: { refund_amount: refundLabel(refundedByUser.get(attendee.user_id)) },
    }))
  );
}

/** Tell the host their own cancellation went through, with what it cost the
 * people who had booked. Fires beside the attendee fan-out, not inside it — the
 * host is excluded from that audience. */
export async function whatsappHostCancellationRequested(doc: any, hostUserId: string) {
  const host: any = await UserModel.findById(hostUserId)
    // `auth.email` alongside the phone fields: the notify funnel reads the
    // address off this document, and a narrower projection would send the
    // WhatsApp message and skip the email without saying so.
    .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
    .lean();
  const venue: any = doc.venue_id
    ? await VenueModel.findById(doc.venue_id).select('venue_name').lean()
    : null;
  const hostName = `${host?.profile?.first_name ?? ''} ${host?.profile?.last_name ?? ''}`.trim() || 'there';
  await notifyEvent({
    event: 'HOST_POD_CANCELLATION_REQUESTED',
    entityId: String(doc._id),
    user: host,
    name: hostName,
    assets: podImageAssets(doc.pod_images_and_videos),
    params: [
      hostName,
      doc.pod_title,
      doc.pod_title,
      podDateLabel(doc),
      podTimeLabel(doc),
      venue?.venue_name ?? '',
      String(podSeatsTaken(doc)),
    ],
  });
}

/** Tell the host the platform cancelled their pod for them — the auto-cancel is
 * the one cancellation the host did not see coming, so silence here would read
 * as the pod simply vanishing. Email only: there is no WhatsApp scenario for it. */
export async function emailHostAutoCancelled(doc: any) {
  try {
    const host: any = await UserModel.findById(podOwnerId(doc))
      .select('profile.first_name profile.last_name auth.email')
      .lean();
    const email = host?.auth?.email;
    if (!email) return;
    const venue: any = doc.venue_id
      ? await VenueModel.findById(doc.venue_id).select('venue_name').lean()
      : null;
    const hostName =
      `${host?.profile?.first_name ?? ''} ${host?.profile?.last_name ?? ''}`.trim() || 'there';
    await sendHostPodAutoCancelledEmail({
      to: email,
      name: hostName,
      pod_title: doc.pod_title,
      date: podDateLabel(doc),
      time: podTimeLabel(doc),
      venue: venue?.venue_name ?? '',
      spots: String(podSeatsTaken(doc)),
    });
  } catch (err) {
    logs.server.error('pod', 'systemCancelPod', {
      error: err,
      msg: 'host auto-cancel email failed',
    });
  }
}
