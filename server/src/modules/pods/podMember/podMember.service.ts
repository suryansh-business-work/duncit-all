import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import crypto from 'node:crypto';
import { PodMemberModel, type IPodMember, type JoinSource } from './podMember.model';
import {
  BackoutRequestModel,
  nextBackoutNo,
  type BackoutStatus,
  type IBackoutRequest,
} from './backoutRequest.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { UserModel } from '@modules/access/user/user.model';
import { evaluateBadgesForUser } from '@modules/engagement/badge/badge.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { sendBackoutSpotFilledEmail, sendPodRefundEmail } from '@services/email/email.service';
import { bookingLinkUrl, getUrlConfigs } from '@config/url-configs';
import {
  maxSeatsForBooking,
  normalizeSeats,
  podSeatsAvailable,
  podSeatsTaken,
} from '@modules/pods/pod/pod.seats';
import {
  claimExtraSeats,
  claimSeats,
  releaseExtraSeats,
  releaseSeats,
} from '@modules/pods/pod/pod.seats.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { userContactNumber } from '@utils/contact';
import { logs } from '@observability/log';

// Legacy display constant kept for schema compatibility (refund_threshold_pct).
const REFUND_THRESHOLD_PCT = 80;

/** Spec copy — shown when the per-pod backout attempt limit is exhausted. */
const BACKOUT_LIMIT_MESSAGE = 'You have reached the maximum number of Backout attempts allowed for this Pod.';
/** Spec copy — shown when the released seat was rebooked before "Keep My Spot". */
const REPLACEMENT_CONFIRMED_MESSAGE =
  'A replacement has been confirmed — this Backout request can no longer be cancelled.';

/** Spec copy — someone other than the booking's owner opened a booking link. */
export const BOOKING_FORBIDDEN_MESSAGE = 'You are not authorized to view this booking.';

const newToken = () => `ref_${crypto.randomBytes(8).toString('hex')}`;

const iso = (v?: Date | null) => (v instanceof Date ? v.toISOString() : null);

/** WhatsApp templates print the day and the clock time as two placeholders. */
const dateOnly = (v?: Date | string | null) =>
  v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium' }) : '';
const timeOnly = (v?: Date | string | null) =>
  v ? new Date(v).toLocaleString('en-IN', { timeStyle: 'short' }) : '';

/** The pod's own start time has passed — nothing about the seat can change now. */
const podHasHappened = (pod: { pod_date_time?: Date | null }) =>
  !!pod.pod_date_time && pod.pod_date_time.getTime() < Date.now();

const round2 = (n: number) => Math.round(n * 100) / 100;

const clampPct = (pct: unknown) => Math.max(0, Math.min(100, Number(pct) || 0));

/** Refund payable after the global Backouts deduction is applied. */
const refundAfterDeduction = (amount: number, pct: number) =>
  round2(Math.max(0, amount - (amount * pct) / 100));

/**
 * Seats a backout gives back: what was asked for, never more than the booking
 * holds and never fewer than one. Omitting the count means the whole booking,
 * which is what every backout was before a booking could cover several people.
 */
function clampReleaseSeats(requested: number | null | undefined, held: number): number {
  if (requested == null) return held;
  const want = Math.floor(Number(requested) || 0);
  if (want < 1) {
    throw new GraphQLError('Choose at least one seat to release', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (want > held) {
    throw new GraphQLError(
      `Your booking holds ${held} seat${held === 1 ? '' : 's'} — you cannot release more than that`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
  return want;
}

/**
 * The open release a "Keep My Spot" refers to.
 *
 * Named explicitly when the member has several outstanding (one per partial
 * release); otherwise the newest one, which is what a single button means.
 */
async function findCancellableRequest(
  podId: Types.ObjectId,
  uid: Types.ObjectId,
  backoutId?: string | null
): Promise<IBackoutRequest> {
  const scope = { pod_id: podId, user_id: uid };
  if (backoutId) {
    const byId = await BackoutRequestModel.findOne({ ...scope, _id: backoutId });
    if (!byId) {
      throw new GraphQLError('That backout is not yours', { extensions: { code: 'NOT_FOUND' } });
    }
    if (byId.status !== 'IN_PROCESS') {
      throw new GraphQLError(REPLACEMENT_CONFIRMED_MESSAGE, { extensions: { code: 'CONFLICT' } });
    }
    return byId;
  }
  const open = await BackoutRequestModel.findOne({ ...scope, status: 'IN_PROCESS' }).sort({
    created_at: -1,
  });
  if (open) return open;
  const latest = await BackoutRequestModel.findOne(scope).sort({ created_at: -1 });
  if (latest?.status === 'SPOT_FILLED') {
    throw new GraphQLError(REPLACEMENT_CONFIRMED_MESSAGE, { extensions: { code: 'CONFLICT' } });
  }
  throw new GraphQLError('You have no backout in process for this pod', {
    extensions: { code: 'NOT_FOUND' },
  });
}

/**
 * Keep the ticket honest after a partial release.
 *
 * One ticket admits the booking's seats, so giving two of them back has to
 * shrink what the QR lets through the door — otherwise the party walks in on
 * seats that are back on sale. The scanner re-reads this from the membership
 * too, but the row is what a re-download prints.
 */
async function syncTicketSeats(membership: IPodMember) {
  try {
    const { TicketModel } = await import('@modules/pods/ticket/ticket.model');
    await TicketModel.updateOne(
      { membership_id: membership._id },
      { $set: { seats: normalizeSeats(membership.seats ?? 1) } }
    );
  } catch (e) {
    logs.server.warn('podMember', 'syncTicketSeats', { error: e, msg: 'Ticket seat sync failed' });
  }
}

/** Current Backouts deduction % (Finance → Default Deductions → Backouts). */
async function backoutDeductionPct(): Promise<number> {
  const settings = await getFinanceSettings();
  return clampPct(settings.default_backout_deduction_pct);
}

/** One extra person on a booking, as the apps and the admin roster read them. */
const toPubCompanion = (c: any) => ({
  name: c.name ?? '',
  phone_extension: c.phone_extension ?? null,
  phone_number: c.phone_number ?? '',
  added_at: c.added_at?.toISOString?.() ?? new Date(0).toISOString(),
});

const toPub = (m: IPodMember) => ({
  id: String(m._id),
  pod_id: String(m.pod_id),
  user_id: String(m.user_id),
  status: m.status,
  seats: m.seats ?? 1,
  companions: (m.companions ?? []).map(toPubCompanion),
  joined_at: m.joined_at?.toISOString?.() ?? null,
  backed_out_at: m.backed_out_at ? m.backed_out_at.toISOString() : null,
  payment_id: m.payment_id ? String(m.payment_id) : null,
  source: m.source,
  referral_token: m.referral_token,
  referred_by: m.referred_by ? String(m.referred_by) : null,
  refund_status: m.refund_status,
  refund_payment_id: m.refund_payment_id ? String(m.refund_payment_id) : null,
  backout_count: m.backout_count ?? 0,
  created_at: m.created_at?.toISOString?.() ?? '',
  updated_at: m.updated_at?.toISOString?.() ?? '',
});

const isPodFull = (pod: any) => {
  const spots = pod.no_of_spots ?? 0;
  return spots > 0 && podSeatsTaken(pod) >= spots;
};

/**
 * Seats a booking of `want` more would need. Throws when they do not fit, so a
 * multi-seat booking fails BEFORE money moves rather than overselling the pod.
 */
async function ensureSeatsAvailable(pod: any, want = 1) {
  const spots = pod.no_of_spots ?? 0;
  if (spots <= 0) return;
  const free = spots - podSeatsTaken(pod);
  if (free < want) {
    const message =
      free <= 0 ? 'Pod is full' : `Only ${free} seat${free === 1 ? '' : 's'} left on this pod`;
    throw new GraphQLError(message, { extensions: { code: 'POD_FULL' } });
  }
}

/**
 * Add the person once and record whatever seats they hold beyond their own.
 *
 * The write is atomic and re-checks capacity (see `claimSeats`), so it can throw
 * POD_FULL when the seats went between the caller's gate and here. The caller's
 * loaded pod is refreshed from the result because the code after a join reads
 * occupancy straight off it.
 */
async function addAttendee(pod: any, userId: string, seats = 1) {
  const fresh = await claimSeats(pod._id, userId, seats);
  pod.pod_attendees = fresh.pod_attendees;
  pod.extra_seats = fresh.extra_seats;
}

/** Release the person and every seat they held. */
async function removeAttendee(pod: any, userId: string, seats = 1) {
  await releaseSeats(pod._id, userId, seats);
}

/** Callers must not join while their own backout is still in process. */
async function assertNoBackoutInProcess(podId: Types.ObjectId, uid: Types.ObjectId) {
  const inProcess = await PodMemberModel.findOne({
    pod_id: podId,
    user_id: uid,
    status: 'BACKOUT_IN_PROCESS',
  });
  if (inProcess) {
    throw new GraphQLError(
      'Your backout for this pod is still in process — use "Keep My Spot" to restore your booking.',
      { extensions: { code: 'BACKOUT_IN_PROCESS' } },
    );
  }
}

const fullName = (user: any) =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim();

/** Leaderboard points for a successful join — fire-and-forget like the badge
 * hook. Idempotent per (user, pod) inside the service, so a rejoin after a
 * backout never awards twice. Dynamic import keeps the engagement module out
 * of this file's import graph. */
function awardJoinPoints(userId: string, podDocId: string): void {
  import('@modules/engagement/leaderboard/leaderboard.service')
    .then(({ leaderboardService }) => leaderboardService.awardPodJoin(userId, podDocId))
    .catch(() => {});
}


/** Best-effort in-app + push (Notification Center fan-out) to one user. */
async function notifyUserInApp(userId: string, title: string, body: string) {
  const { notificationService } = await import('@modules/engagement/notification/notification.service');
  await notificationService.create({
    title,
    body,
    scope: 'USER',
    target_user_ids: [userId],
    silent: false,
    link_url: '/pod-history',
  });
}

/** Email + in-app + push after a replacement books the released seat. */
async function notifySpotFilled(pod: any, member: IPodMember, request: IBackoutRequest | null) {
  try {
    const [user, settings] = await Promise.all([
      // The phone paths ride along for the WhatsApp send below — without them
      // `destinationFor` reads nothing and every message silently skips.
      UserModel.findById(member.user_id).select(
        'profile.first_name profile.last_name auth.email auth.phone communication.whatsapp',
      ),
      getFinanceSettings(),
    ]);
    const sym = settings.currency_symbol ?? '₹';
    const refundLine =
      request?.refund_amount == null
        ? ''
        : `Your refund of ${sym}${request.refund_amount} will be processed by our team shortly.`;
    const tail = refundLine || 'You can book the pod again anytime.';
    await notifyUserInApp(
      String(member.user_id),
      'Your spot was filled',
      `A replacement booked your spot in "${pod.pod_title}". ${tail}`,
    );
    // Sent unconditionally: an empty address is recorded as a FAILED row
    // naming this template, which is what tells someone the notice went
    // nowhere. Guarding here made that invisible.
    await sendBackoutSpotFilledEmail({
      to: (user as any)?.auth?.email ?? '',
      name: fullName(user) || 'there',
      pod_title: pod.pod_title ?? 'your pod',
      refund_line: refundLine,
    });
    const { appUrl } = await getUrlConfigs();
    await whatsappService.send({
      event: 'USER_REPLACEMENT_FOUND',
      // The RELEASE, not the pod: a booking can give back seats twice and have
      // each release filled separately, and keying on the pod would swallow the
      // second notice.
      entityId: request ? String(request._id) : null,
      user,
      name: fullName(user),
      params: [
        fullName(user) || 'there',
        pod.pod_title,
        dateOnly(pod.pod_date_time),
        timeOnly(pod.pod_date_time),
        // Bare — the template prints the rupee sign itself.
        request?.refund_amount,
        bookingLinkUrl(appUrl, String(member._id)),
        settings.refund_processing_days,
      ],
    });
  } catch (err) {
    logs.server.error('podMember', 'notifySpotFilled', { error: err, msg: '[backout] spot-filled notify failed' });
  }
}

/** Email + in-app + push after Finance processes the refund. */
async function notifyRefundProcessed(request: IBackoutRequest, payment: any) {
  try {
    const [user, pod] = await Promise.all([
      UserModel.findById(request.user_id).select('profile.first_name profile.last_name auth.email'),
      PodModel.findById(request.pod_id).select('pod_title'),
    ]);
    const amount = `${payment.currency_symbol ?? '₹'}${request.refund_amount ?? payment.total}`;
    await notifyUserInApp(
      String(request.user_id),
      'Refund processed',
      `Your backout refund of ${amount} for "${pod?.pod_title ?? 'your pod'}" has been processed.`,
    );
    // Unconditional for the same reason as the spot-filled notice above: money
    // moved, and "we could not tell them" belongs in the log.
    await sendPodRefundEmail({
      to: (user as any)?.auth?.email ?? '',
      name: fullName(user) || 'there',
      pod_title: pod?.pod_title ?? 'your pod',
      amount,
      reason: `Backout ${request.backout_no} — spot filled`,
    });
  } catch (err) {
    logs.server.error('podMember', 'notifyRefundProcessed', { error: err, msg: '[backout] refund-processed notify failed' });
  }
}

/**
 * Terminal transition: a replacement consumed the released seats.
 *
 * Driven by the REQUEST, not the membership. A booking can give back some of
 * its seats and keep the rest, so one membership can have more than one release
 * outstanding and the membership alone cannot say which of them was filled.
 * Only a request that gave back the WHOLE booking ends the membership.
 */
export async function markSpotFilled(pod: any, request: IBackoutRequest, replacementUserId: string) {
  const member = await PodMemberModel.findById(request.member_id);
  const wholeBooking = (request.seats ?? 1) >= (request.seats_before ?? 1);
  if (member && wholeBooking) {
    member.status = 'BACKED_OUT';
    member.active_backout_id = null;
    await member.save();
  }
  if (request.status === 'IN_PROCESS') {
    request.status = 'SPOT_FILLED';
    // Who Finance can point at when the refund is questioned. Recorded with
    // the transition so it can never disagree with the SPOT_FILLED event.
    request.replacement_user_id = new Types.ObjectId(replacementUserId);
    request.events.push({ status: 'SPOT_FILLED', backout_count: request.attempt_no, at: new Date() });
    await request.save();
    // Only the TRANSITION is news. Outside this guard a re-run of the fill
    // sweep told the same member their spot was filled all over again — free on
    // email, a second billed message on WhatsApp.
    if (member) await notifySpotFilled(pod, member, request);
  }
}

/**
 * After ANY successful join, fill in-process backouts (oldest first) whose
 * released seats the join consumed. A backout counts as filled only when seat
 * demand actually needed it: taken + in-process > total spots. Pods with
 * unlimited spots (0) have no seat scarcity, so nothing to fill.
 *
 * Both sides of that comparison are SEATS, not people. Backing out releases the
 * whole booking (`removeAttendee` above drops the id and every extra seat), so
 * an in-process member reserves `seats` of them while "Keep My Spot" is still
 * open — and the joiner who displaces them may have taken several at once.
 * Counting people here left a multi-seat pod short of the threshold, so the
 * backers-out stayed in BACKOUT_IN_PROCESS and never became refund-eligible.
 */
export async function fillBackoutsAfterJoin(pod: any, joiningUserId: string) {
  const spots = pod.no_of_spots ?? 0;
  if (spots <= 0) return;
  // The open REQUESTS are what is reserved. A partial backout leaves its member
  // JOINED — they are still coming, with fewer seats — so looking for members in
  // BACKOUT_IN_PROCESS would miss every partial release entirely.
  const requests = await BackoutRequestModel.find({
    pod_id: pod._id,
    status: 'IN_PROCESS',
  }).sort({ created_at: 1 });
  const reserved = requests.reduce((sum, r) => sum + normalizeSeats(r.seats ?? 1), 0);
  let overflow = podSeatsTaken(pod) + reserved - spots;
  for (const request of requests) {
    if (overflow <= 0) break;
    await markSpotFilled(pod, request, joiningUserId);
    // Filling a release gives up every seat it held open, not one.
    overflow -= normalizeSeats(request.seats ?? 1);
  }
}

/** Per-request refund state — derived so every history row reads correctly. */
function requestRefundStatus(request: IBackoutRequest): string {
  if (request.refund_processed_at) return 'PROCESSED';
  if (!request.payment_id) return 'NOT_ELIGIBLE';
  if (request.status === 'SPOT_FILLED') return 'PENDING';
  return 'NONE';
}

/** Membership status a request implies when the member row is unavailable. */
const MEMBER_STATUS_BY_REQUEST: Record<BackoutStatus, string> = {
  IN_PROCESS: 'BACKOUT_IN_PROCESS',
  CANCELLED: 'JOINED',
  SPOT_FILLED: 'BACKED_OUT',
};

// Flat shape for the Finance "Backout Refunds" list/detail — one row per
// Backout request, hydrated with the member, buyer and join payment.
const toBackoutRefund = (
  request: IBackoutRequest,
  member: IPodMember | undefined,
  user: any,
  payment: any,
  maxAttempts: number,
  attemptsUsed: number,
  replacement: any,
) => ({
  id: String(request._id),
  backout_no: request.backout_no,
  pod_id: String(request.pod_id),
  // Not in the schema — the participation field resolver needs the booking this
  // request came off, and only this row knows which one that was.
  member_id: request.member_id ? String(request.member_id) : null,
  user_id: String(request.user_id),
  user_name: fullName(user) || null,
  user_email: user?.auth?.email ?? null,
  user_phone: userContactNumber(user),
  status: member?.status ?? MEMBER_STATUS_BY_REQUEST[request.status],
  backout_status: request.status,
  attempt_no: request.attempt_no,
  // Finance refunds the seats this request gave back, not the whole booking —
  // a partial backout leaves the member attending on the seats they kept.
  seats: normalizeSeats(request.seats ?? 1),
  seats_before: normalizeSeats(request.seats_before ?? request.seats ?? 1),
  is_partial: normalizeSeats(request.seats ?? 1) < normalizeSeats(request.seats_before ?? 1),
  backout_attempts_used: attemptsUsed,
  max_backout_attempts: maxAttempts,
  replacement_confirmed: request.status === 'SPOT_FILLED',
  replacement_user_id: request.replacement_user_id ? String(request.replacement_user_id) : null,
  replacement_user_name: fullName(replacement) || null,
  replacement_user_email: replacement?.auth?.email ?? null,
  joined_at: iso(member?.joined_at) ?? iso(request.created_at) ?? '',
  backed_out_at: iso(request.created_at),
  refund_status: requestRefundStatus(request),
  payment_id: request.payment_id ? String(request.payment_id) : null,
  payment_amount: request.payment_amount ?? (payment ? payment.total : null),
  payment_currency: payment ? payment.currency_symbol : null,
  payment_status: payment ? payment.status : null,
  deduction_pct: request.deduction_pct ?? 0,
  refund_amount: request.refund_amount ?? null,
  refund_processed_at: iso(request.refund_processed_at),
  events: (request.events ?? []).map((e) => ({
    status: e.status,
    backout_count: e.backout_count,
    at: iso(e.at) ?? '',
  })),
  refund_threshold_pct: REFUND_THRESHOLD_PCT,
  created_at: iso(request.created_at) ?? '',
});

/** Allowlists for the shared table engine (backoutRefundRequestsTable — DUNCIT
 * TABLE CONTRACT v1). backout_no is stored on the request, so Backout-ID
 * search/filter runs server-side; hydrated member/payment fields stay
 * unsearchable. `backout_status` maps to the stored `status` path. */
const BACKOUT_REFUND_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['backout_no'],
  sortFields: {
    backout_no: 'backout_no',
    backout_status: 'status',
    attempt_no: 'attempt_no',
    created_at: 'created_at',
  },
  filterFields: {
    backout_no: { type: 'string' },
    backout_status: { path: 'status', type: 'enum' },
    pod_id: { type: 'string' },
    user_id: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** Backout attempts used per (pod,user) pair — batched for a page of rows. */
async function attemptsUsedMap(requests: IBackoutRequest[]): Promise<Map<string, number>> {
  const byKey = new Map<string, { pod_id: Types.ObjectId; user_id: Types.ObjectId }>();
  for (const r of requests) {
    byKey.set(`${r.pod_id}:${r.user_id}`, { pod_id: r.pod_id, user_id: r.user_id });
  }
  const rows = await BackoutRequestModel.aggregate([
    { $match: { $or: [...byKey.values()] } },
    { $group: { _id: { pod_id: '$pod_id', user_id: '$user_id' }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r: any) => [`${r._id.pod_id}:${r._id.user_id}`, r.count as number]));
}

// Batch-load members, users + payments to avoid an N+1 across the page.
async function hydrateBackoutRequests(requests: IBackoutRequest[]) {
  if (requests.length === 0) return [];
  const memberIds = [...new Set(requests.map((r) => String(r.member_id)))];
  // Members and replacements resolve from the same batch — one query, no N+1.
  const userIds = [
    ...new Set(
      requests.flatMap((r) => [String(r.user_id), r.replacement_user_id && String(r.replacement_user_id)]).filter(Boolean) as string[],
    ),
  ];
  const paymentIds = requests.map((r) => r.payment_id).filter(Boolean).map(String);
  const [members, users, payments, attempts, maxAttempts] = await Promise.all([
    PodMemberModel.find({ _id: { $in: memberIds } }),
    UserModel.find({ _id: { $in: userIds } }).select(
      'profile.first_name profile.last_name auth.email auth.phone.number auth.phone.extension',
    ),
    PaymentModel.find({ _id: { $in: paymentIds } }).select('total currency_symbol status'),
    attemptsUsedMap(requests),
    settingsService.getMaxBackoutAttempts(),
  ]);
  const memberById = new Map<string, IPodMember>(members.map((m: any) => [String(m._id), m]));
  const userById = new Map<string, any>(users.map((u: any) => [String(u._id), u]));
  const paymentById = new Map<string, any>(payments.map((p: any) => [String(p._id), p]));
  return requests.map((r) =>
    toBackoutRefund(
      r,
      memberById.get(String(r.member_id)),
      userById.get(String(r.user_id)),
      r.payment_id ? paymentById.get(String(r.payment_id)) : null,
      maxAttempts,
      attempts.get(`${r.pod_id}:${r.user_id}`) ?? 0,
      r.replacement_user_id ? userById.get(String(r.replacement_user_id)) : null,
    ),
  );
}

/** Estimated refund for a membership's join payment after deduction. */
/**
 * What a backout would pay back — per seat, and for everything still held.
 *
 * Divided by the seats the PAYMENT covered, not the seats the booking holds
 * today: a partial backout reduces the booking, and dividing by the smaller
 * number would inflate the value of every remaining seat. The per-seat figure
 * is what lets the apps price any number the buyer picks without a round trip.
 */
async function previewRefund(
  membership: IPodMember | null,
  pct: number
): Promise<{ perSeat: number | null; total: number | null }> {
  const none = { perSeat: null, total: null };
  if (!membership?.payment_id) return none;
  const payment = await PaymentModel.findById(membership.payment_id).select('total metadata');
  if (!payment) return none;
  const paidSeats = normalizeSeats((payment.metadata as any)?.seats ?? membership.seats ?? 1);
  const held = normalizeSeats(membership.seats ?? 1);
  // Seats are valued on the TICKET money only: the payment's total can carry
  // one-off product add-ons which are not per-seat and are not returned (the
  // product order still ships) — `requestBackout` divides the same way.
  const productMoney = Number((payment.metadata as any)?.product_cost_total) || 0;
  const perSeatPaid = Math.max(0, payment.total - productMoney) / paidSeats;
  return {
    perSeat: refundAfterDeduction(perSeatPaid, pct),
    total: refundAfterDeduction(round2(perSeatPaid * held), pct),
  };
}

export const podMemberService = {
  async getState(podDocId: string, userId: string | null) {
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const spotsTaken = podSeatsTaken(pod);
    const spotsTotal = pod.no_of_spots ?? 0;
    let membership: IPodMember | null = null;
    if (userId) {
      membership = await PodMemberModel.findOne({
        pod_id: pod._id,
        user_id: new Types.ObjectId(userId),
        status: { $in: ['JOINED', 'BACKOUT_IN_PROCESS'] },
      });
    }
    const isMember = membership?.status === 'JOINED';
    const inProcess = membership?.status === 'BACKOUT_IN_PROCESS';
    const full = spotsTotal > 0 && spotsTaken >= spotsTotal;
    const [maxAttempts, deductionPct, attemptsUsed] = await Promise.all([
      settingsService.getMaxBackoutAttempts(),
      backoutDeductionPct(),
      userId
        ? BackoutRequestModel.countDocuments({ pod_id: pod._id, user_id: new Types.ObjectId(userId) })
        : Promise.resolve(0),
    ]);
    const refund = await previewRefund(membership, deductionPct);
    const refundAmount = refund.total;
    // Seats this member has already released and is still waiting to have
    // filled. A partial release leaves them JOINED, so nothing else on this
    // state object would reveal that a Keep My Spot is available.
    const openRequests = membership
      ? await BackoutRequestModel.find({
          pod_id: pod._id,
          member_id: membership._id,
          status: 'IN_PROCESS',
        }).select('seats')
      : [];
    return {
      pod_id: String(pod._id),
      is_member: isMember,
      status: membership?.status ?? null,
      membership: membership ? toPub(membership) : null,
      spots_taken: spotsTaken,
      spots_total: spotsTotal,
      // What the seat picker on Pod Details offers: how many are left, the most
      // one booking may take, and how many the caller already holds.
      seats_available: podSeatsAvailable(pod),
      max_seats_per_booking: maxSeatsForBooking(pod),
      my_seats: membership?.seats ?? 0,
      // Same rule the shared podParticipationActions() applies, so Pod Details
      // and Pod History cannot disagree about whether a booking can still be
      // given up — and the mutation refuses it either way.
      can_backout: isMember && attemptsUsed < maxAttempts && !podHasHappened(pod),
      can_join: !!userId && !membership && !full,
      refund_threshold_pct: REFUND_THRESHOLD_PCT,
      backout_in_process: inProcess,
      // A partial release keeps the member JOINED, so "something is open" is
      // no longer the same question as "are they backing out".
      can_cancel_backout: (inProcess || openRequests.length > 0) && !full,
      backout_attempts_used: attemptsUsed,
      backout_attempts_max: maxAttempts,
      backout_deduction_pct: deductionPct,
      backout_refund_amount: refundAmount,
      backout_refund_per_seat: refund.perSeat,
      released_seats_pending: openRequests.reduce((sum, r) => sum + normalizeSeats(r.seats ?? 1), 0),
    };
  },

  async listMine(userId: string, status?: string) {
    const q: any = { user_id: new Types.ObjectId(userId) };
    if (status) q.status = status;
    const docs = await PodMemberModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  /**
   * Resolve a booking deep link (the receipt email's "View Booking" CTA) into
   * the pod it points at. Ownership is enforced HERE, before any booking field
   * leaves the server — a client hiding the screen is not access control.
   */
  async getBookingForUser(bookingId: string, userId: string) {
    const member = Types.ObjectId.isValid(bookingId)
      ? await PodMemberModel.findById(bookingId)
      : null;
    if (!member) {
      throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
    }
    if (String(member.user_id) !== String(userId)) {
      throw new GraphQLError(BOOKING_FORBIDDEN_MESSAGE, { extensions: { code: 'FORBIDDEN' } });
    }
    // Soft-deleted pods still resolve — a cancelled pod's booking must stay
    // reachable from the email exactly like Pod History keeps showing it.
    const { podService } = await import('@modules/pods/pod/pod.service');
    const pod = await podService.getById(String(member.pod_id), { includeDeleted: true });
    if (!pod) {
      throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return {
      id: String(member._id),
      pod_id: String(member.pod_id),
      club_slug: pod.club_slug,
      pod_slug: pod.pod_id,
      pod_title: pod.pod_title,
      pod_date_time: pod.pod_date_time,
      status: member.status,
      joined_at: iso(member.joined_at) ?? '',
      payment_id: member.payment_id ? String(member.payment_id) : null,
    };
  },

  async listForPod(podDocId: string, status?: string) {
    const q: any = { pod_id: new Types.ObjectId(podDocId) };
    if (status) q.status = status;
    const docs = await PodMemberModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  /**
   * Seats per JOINED member — just the pair, nothing else.
   *
   * The attendee list shows one face per person; this is what turns a face into
   * "Asha +3 other members" without the client having to guess from a count it
   * cannot break down.
   */
  async listAttendeeSeats(podDocId: string) {
    const docs = await PodMemberModel.find({
      pod_id: new Types.ObjectId(podDocId),
      status: 'JOINED',
    })
      .select('user_id seats')
      .lean();
    return docs.map((m: any) => ({
      user_id: String(m.user_id),
      seats: normalizeSeats(m.seats ?? 1),
    }));
  },

  async lookupReferral(token: string) {
    const m = await PodMemberModel.findOne({ referral_token: token });
    return m ? toPub(m) : null;
  },

  async joinFree(podDocId: string, userId: string, referralToken?: string | null, wantSeats = 1) {
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    if (pod.pod_date_time && pod.pod_date_time.getTime() < Date.now()) {
      throw new GraphQLError('This pod has already taken place — booking is closed.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    if (pod.pod_type !== 'FREE') {
      throw new GraphQLError('This pod is paid. Use checkout to book.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const uid = new Types.ObjectId(userId);
    const existing = await PodMemberModel.findOne({ pod_id: pod._id, user_id: uid, status: 'JOINED' });
    if (existing) return toPub(existing);
    await assertNoBackoutInProcess(pod._id as Types.ObjectId, uid);

    const seats = Math.min(normalizeSeats(wantSeats), maxSeatsForBooking(pod));
    await ensureSeatsAvailable(pod, seats);

    let referredBy: Types.ObjectId | null = null;
    let source: JoinSource = 'FREE';
    if (referralToken) {
      const refDoc = await PodMemberModel.findOne({ referral_token: referralToken });
      if (refDoc && String(refDoc.pod_id) === String(pod._id)) {
        referredBy = refDoc.user_id;
        source = 'REFERRAL';
      }
    }

    // Claim the seats BEFORE the membership row exists. The claim is the gate
    // that can still fail (someone else took the last seat while we got here),
    // and a membership written for seats we never held is the harder mess to
    // unwind — so if the row cannot be created, the seats go back.
    await addAttendee(pod, userId, seats);
    let doc;
    try {
      doc = await PodMemberModel.create({
        pod_id: pod._id,
        user_id: uid,
        status: 'JOINED',
        seats,
        joined_at: new Date(),
        source,
        referred_by: referredBy,
        refund_status: 'NONE',
      });
    } catch (e) {
      await removeAttendee(pod, userId, seats);
      throw e;
    }

    await fillBackoutsAfterJoin(pod, userId);
    evaluateBadgesForUser(userId, 'POD_JOIN').catch(() => {});
    awardJoinPoints(userId, String(pod._id));
    try {
      const { ticketService } = await import('@modules/pods/ticket/ticket.service');
      await ticketService.ensureForMembership(String(doc._id));
    } catch (e) {
      logs.server.warn('podMember', 'join', { error: e, msg: 'Ticket issue (free join) failed' });
    }
    return toPub(doc);
  },

  /**
   * Confirm Backout — the released seats go back on public sale immediately.
   * No refund is initiated here: it becomes eligible only when a replacement
   * fills them. Every request is a NEW immutable BackoutRequest with a fresh,
   * permanent Backout ID; attempts are capped per user per pod (Admin > Pod
   * Settings).
   *
   * `seats` releases only PART of a booking. Somebody who bought four and had
   * two friends drop out should give back two, not lose the evening — so a
   * partial release leaves them JOINED with fewer seats and refunds only the
   * seats they gave up, at the same deduction. Omitting `seats` (or passing the
   * whole booking) is the original all-or-nothing backout, unchanged.
   */
  async backout(podDocId: string, userId: string, requestedSeats?: number | null) {
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    // Joining and rejoining both refuse a pod that has happened; backing out did
    // not, so a seat could be released from an evening that was already over —
    // and the request then rewrote that member's own history as "spot not
    // filled" on a pod they had actually attended.
    if (pod.pod_date_time && pod.pod_date_time.getTime() < Date.now()) {
      throw new GraphQLError('This pod has already taken place — backout is closed.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const uid = new Types.ObjectId(userId);
    const membership = await PodMemberModel.findOne({ pod_id: pod._id, user_id: uid, status: 'JOINED' });
    if (!membership) {
      const inProcess = await PodMemberModel.findOne({
        pod_id: pod._id,
        user_id: uid,
        status: 'BACKOUT_IN_PROCESS',
      });
      if (inProcess) {
        throw new GraphQLError('Your backout for this pod is already in process.', {
          extensions: { code: 'CONFLICT' },
        });
      }
      throw new GraphQLError('You are not a member of this pod', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const [maxAttempts, attemptsUsed, deductionPct] = await Promise.all([
      settingsService.getMaxBackoutAttempts(),
      BackoutRequestModel.countDocuments({ pod_id: pod._id, user_id: uid }),
      backoutDeductionPct(),
    ]);
    if (attemptsUsed >= maxAttempts) {
      throw new GraphQLError(BACKOUT_LIMIT_MESSAGE, { extensions: { code: 'BACKOUT_LIMIT_REACHED' } });
    }

    const held = normalizeSeats(membership.seats ?? 1);
    const release = clampReleaseSeats(requestedSeats, held);
    const wholeBooking = release >= held;

    const payment = membership.payment_id ? await PaymentModel.findById(membership.payment_id) : null;
    // The refund is for the seats given back, so the request records that share
    // of what was paid — not the whole payment, which would refund a partial
    // backout for seats the buyer is still using.
    //
    // Divided by the seats the PAYMENT covered, never by the seats the booking
    // holds today. A partial release shrinks the booking, so dividing by what is
    // left re-values every remaining seat upward: release 1 of 4, then 1 of the
    // remaining 3, and the second seat is refunded at a third of the bill
    // instead of a quarter. Releasing one at a time would pay out more than was
    // ever collected. `previewRefund` uses the same divisor, so the number the
    // buyer was shown is the number Finance is told to pay.
    // And on the TICKET money only: product add-ons ride on the same payment
    // but are not per-seat and are not returned on a backout — the buyer keeps
    // the products and the product order still fulfils.
    const paidSeats = normalizeSeats((payment?.metadata as any)?.seats ?? held);
    const productMoney = Number((payment?.metadata as any)?.product_cost_total) || 0;
    const ticketPaid = payment ? Math.max(0, payment.total - productMoney) : 0;
    const paymentAmount = payment ? round2((ticketPaid * release) / paidSeats) : null;
    const attemptNo = attemptsUsed + 1;
    const now = new Date();
    const refundAmount = paymentAmount == null ? null : refundAfterDeduction(paymentAmount, deductionPct);
    const request = await BackoutRequestModel.create({
      backout_no: await nextBackoutNo(),
      pod_id: pod._id,
      user_id: uid,
      member_id: membership._id,
      payment_id: membership.payment_id,
      attempt_no: attemptNo,
      seats: release,
      seats_before: held,
      status: 'IN_PROCESS',
      payment_amount: paymentAmount,
      deduction_pct: deductionPct,
      refund_amount: refundAmount,
      events: [{ status: 'IN_PROCESS', backout_count: attemptNo, at: now }],
    });

    membership.backout_count = attemptNo;
    if (!membership.referral_token) membership.referral_token = newToken();
    if (wholeBooking) {
      membership.status = 'BACKOUT_IN_PROCESS';
      membership.backed_out_at = now;
      membership.active_backout_id = request._id as Types.ObjectId;
      membership.refund_status = membership.payment_id ? 'PENDING' : 'NOT_ELIGIBLE';
      await membership.save();
      await removeAttendee(pod, userId, held);
    } else {
      // Still going, just with a smaller party: the id stays in the identity
      // list (their chat, their permissions, their own ticket) and only the
      // seat counter moves.
      membership.seats = held - release;
      await membership.save();
      await releaseExtraSeats(pod._id, userId, release);
      await syncTicketSeats(membership);
    }

    return toPub(membership);
  },

  /**
   * Keep My Spot — cancel an in-process backout and restore the booking.
   * Only possible while the released seat has not been rebooked; once a
   * replacement is confirmed the request is terminal (SPOT_FILLED).
   */
  async cancelBackout(podDocId: string, userId: string, backoutId?: string | null) {
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

    const uid = new Types.ObjectId(userId);
    // The REQUEST is what gets kept, not the membership: after a partial release
    // the member is still JOINED, so there is no BACKOUT_IN_PROCESS row to find.
    const request = await findCancellableRequest(pod._id, uid, backoutId);
    const membership = await PodMemberModel.findById(request.member_id);
    if (!membership) {
      throw new GraphQLError('You are not a member of this pod', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (isPodFull(pod)) {
      throw new GraphQLError(REPLACEMENT_CONFIRMED_MESSAGE, { extensions: { code: 'CONFLICT' } });
    }

    const seats = normalizeSeats(request.seats ?? 1);
    const wholeBooking = seats >= (request.seats_before ?? 1);
    // The membership has to be in the state this request implies. Keeping a
    // PARTIAL release after the member has since left entirely would hand the
    // seats back to somebody who is no longer in `pod_attendees` — the counter
    // would climb, the pod would show seats occupied by nobody, and that
    // inflated occupancy would start marking other people's backouts filled
    // with no replacement behind them. The request id is a public argument, so
    // this is reachable, not theoretical.
    const expected = wholeBooking ? 'BACKOUT_IN_PROCESS' : 'JOINED';
    if (membership.status !== expected) {
      throw new GraphQLError('That backout can no longer be cancelled', {
        extensions: { code: 'CONFLICT' },
      });
    }
    // Take the seats back BEFORE the request is closed — if they have gone, the
    // claim throws and the backout stays open rather than leaving the member
    // "kept" with nothing to sit on.
    if (wholeBooking) {
      await addAttendee(pod, userId, seats);
    } else {
      await claimExtraSeats(pod._id, userId, seats);
    }

    request.status = 'CANCELLED';
    request.events.push({ status: 'CANCELLED', backout_count: request.attempt_no, at: new Date() });
    await request.save();

    if (wholeBooking) {
      membership.status = 'JOINED';
      membership.backed_out_at = null;
      membership.refund_status = 'NONE';
      membership.active_backout_id = null;
    } else {
      membership.seats = normalizeSeats(membership.seats ?? 1) + seats;
    }
    await membership.save();
    if (!wholeBooking) await syncTicketSeats(membership);

    return toPub(membership);
  },

  async redeemReferral(token: string, userId: string) {
    const refDoc = await PodMemberModel.findOne({ referral_token: token });
    if (!refDoc) {
      throw new GraphQLError('Invalid referral link', { extensions: { code: 'NOT_FOUND' } });
    }
    const pod = await PodModel.findById(refDoc.pod_id);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

    if (String(refDoc.user_id) === userId) {
      throw new GraphQLError('You cannot redeem your own referral', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const uid = new Types.ObjectId(userId);
    const existing = await PodMemberModel.findOne({ pod_id: pod._id, user_id: uid, status: 'JOINED' });
    if (existing) return toPub(existing);
    await assertNoBackoutInProcess(pod._id as Types.ObjectId, uid);

    await ensureSeatsAvailable(pod, 1);

    // Claim the seat BEFORE the membership row exists — the claim re-checks
    // capacity against the live pod and can throw where the old read-modify-write
    // could not, and a JOINED row holding a seat nobody granted is the harder
    // mess to unwind. Same ordering as joinFree and rejoin.
    await addAttendee(pod, userId);
    let doc;
    try {
      doc = await PodMemberModel.create({
        pod_id: pod._id,
        user_id: uid,
        status: 'JOINED',
        joined_at: new Date(),
        source: 'REFERRAL',
        referred_by: refDoc.user_id,
        refund_status: 'NONE',
      });
    } catch (e) {
      await removeAttendee(pod, userId);
      throw e;
    }
    // The vacated seat is consumed like any other join — the oldest in-process
    // backout (usually the referrer's) flips to Spot Filled and becomes
    // refund-eligible for Finance to process. The joiner is the redeemer, not
    // `refDoc.user_id` — that is the referrer, i.e. usually the backer-out.
    await fillBackoutsAfterJoin(pod, userId);

    evaluateBadgesForUser(userId, 'POD_JOIN').catch(() => {});
    awardJoinPoints(userId, String(pod._id));
    return toPub(doc);
  },

  /**
   * The membership row a paid checkout produces — and nothing else.
   *
   * The ticket, the backout fill and the points used to hang off this call as
   * unguarded side effects, which is how a booking could commit with no ticket
   * behind it. They now belong to the payment finalizer, which runs the ones
   * that must be atomic inside its transaction and the rest afterwards.
   *
   * Deduped twice: by the payment (a replayed webhook must not book again) and
   * by the pod+user pair (one booking per person per pod, see
   * `assertNotAlreadyBooked` on the checkout side).
   */
  async createPaidMembership(
    podDocId: string,
    userId: string,
    paymentDocId: string,
    seats = 1,
    session?: ClientSession
  ): Promise<IPodMember> {
    const paymentId = new Types.ObjectId(paymentDocId);
    const byPayment = await PodMemberModel.findOne({ payment_id: paymentId }).session(session ?? null);
    if (byPayment) return byPayment;
    const existing = await PodMemberModel.findOne({
      pod_id: new Types.ObjectId(podDocId),
      user_id: new Types.ObjectId(userId),
      status: 'JOINED',
    }).session(session ?? null);
    if (existing) return existing;
    // The array form is required with a session (and returns an array).
    const [doc] = await PodMemberModel.create(
      [
        {
          pod_id: new Types.ObjectId(podDocId),
          user_id: new Types.ObjectId(userId),
          status: 'JOINED',
          // Seats were priced and capacity-checked at checkout; the payment
          // carries the count so a webhook replay books exactly what was paid for.
          seats: normalizeSeats(seats),
          joined_at: new Date(),
          source: 'PAID',
          payment_id: paymentId,
          refund_status: 'NONE',
        },
      ],
      { session }
    );
    return doc;
  },

  /**
   * A paid join, end to end, OUTSIDE the payment finalizer: the membership plus
   * the three things that follow one — the ticket, the backout fill and the
   * join points.
   *
   * The finalizer does not call this. It needs the membership and the ticket
   * inside its transaction and the fill afterwards, so it composes the same
   * primitives in its own order. This is the composition for every other
   * caller, and it holds no logic of its own precisely so the two orderings
   * cannot drift into two different definitions of "joined".
   *
   * Every step after the membership is best-effort: the booking is the thing
   * that must not be lost, and a ticket or a points hiccup is recoverable.
   */
  async recordPaidJoin(
    podDocId: string,
    userId: string,
    paymentDocId: string,
    seats = 1
  ): Promise<IPodMember> {
    const member = await this.createPaidMembership(podDocId, userId, paymentDocId, seats);
    try {
      const { ticketService } = await import('@modules/pods/ticket/ticket.service');
      await ticketService.ensureForMembership(String(member._id));
    } catch (e) {
      logs.server.warn('podMember', 'recordPaidJoin', { error: e, msg: 'Ticket issue failed' });
    }
    try {
      const pod = await PodModel.findById(podDocId);
      if (pod) await fillBackoutsAfterJoin(pod, userId);
    } catch (e) {
      logs.server.warn('podMember', 'recordPaidJoin', { error: e, msg: 'Backout fill failed' });
    }
    awardJoinPoints(userId, podDocId);
    return member;
  },

  /**
   * Rejoin a pod the caller previously backed out of — no payment. Flips the
   * existing BACKED_OUT membership back to JOINED (reusing its join payment) and
   * re-adds the attendee. Allowed only until the pod completes / starts, and
   * never after a replacement was confirmed (book the pod again instead).
   */
  async rejoin(podDocId: string, userId: string) {
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    if (pod.completed_at) {
      throw new GraphQLError('This pod is already complete — rejoin is closed.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    if (pod.pod_date_time && pod.pod_date_time.getTime() < Date.now()) {
      throw new GraphQLError('This pod has already taken place — rejoin is closed.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const uid = new Types.ObjectId(userId);
    const alreadyJoined = await PodMemberModel.findOne({ pod_id: pod._id, user_id: uid, status: 'JOINED' });
    if (alreadyJoined) return toPub(alreadyJoined);

    const membership = await PodMemberModel.findOne({
      pod_id: pod._id,
      user_id: uid,
      status: 'BACKED_OUT',
    }).sort({ backed_out_at: -1 });
    if (!membership) {
      throw new GraphQLError('You have no backed-out booking for this pod', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    const latestRequest = await BackoutRequestModel.findOne({ member_id: membership._id }).sort({
      created_at: -1,
    });
    if (latestRequest?.status === 'SPOT_FILLED') {
      throw new GraphQLError('A replacement took your spot — please book the pod again.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const seats = normalizeSeats(membership.seats ?? 1);
    await ensureSeatsAvailable(pod, seats);
    // Claim before the membership flips. The claim re-checks capacity against
    // the live document and can still fail, and a JOINED row holding seats
    // nobody granted is the worse of the two outcomes.
    await addAttendee(pod, userId, seats);

    membership.status = 'JOINED';
    membership.joined_at = new Date();
    membership.backed_out_at = null;
    membership.refund_status = 'NONE';
    membership.active_backout_id = null;
    await membership.save();

    // The release that took them out of the pod is over — they are back in it.
    // Leaving it open would let a later join mark it Spot Filled and refund
    // somebody who is attending.
    if (latestRequest?.status === 'IN_PROCESS') {
      latestRequest.status = 'CANCELLED';
      latestRequest.events.push({
        status: 'CANCELLED',
        backout_count: latestRequest.attempt_no,
        at: new Date(),
      });
      await latestRequest.save();
    }

    await fillBackoutsAfterJoin(pod, userId);
    evaluateBadgesForUser(userId, 'POD_JOIN').catch(() => {});
    awardJoinPoints(userId, String(pod._id));
    try {
      const { ticketService } = await import('@modules/pods/ticket/ticket.service');
      await ticketService.ensureForMembership(String(membership._id));
    } catch (e) {
      logs.server.warn('podMember', 'rejoin', { error: e, msg: 'Ticket issue (rejoin) failed' });
    }
    return toPub(membership);
  },

  /**
   * Public, pod-scoped: every filled Backout seat — who left and who took the
   * spot. Powers the struck-through attendee rows on Pod Details (app + admin).
   * Names/photos are already public via publicUsersByIds, so no guard.
   */
  async listSpotFills(podDocId: string) {
    if (!Types.ObjectId.isValid(podDocId)) return [];
    // lean(): plain DB shapes, so legacy rows keep their genuinely-missing fields.
    const requests = await BackoutRequestModel.find({
      pod_id: new Types.ObjectId(podDocId),
      status: 'SPOT_FILLED',
    })
      .sort({ created_at: 1 })
      .lean();
    if (requests.length === 0) return [];
    const userIds = [
      ...new Set(
        requests
          .flatMap((r) => [String(r.user_id), r.replacement_user_id && String(r.replacement_user_id)])
          .filter(Boolean) as string[],
      ),
    ];
    const users = await UserModel.find({ _id: { $in: userIds } }).select(
      'profile.first_name profile.last_name profile.profile_photo',
    );
    const userById = new Map<string, any>(users.map((u: any) => [String(u._id), u]));
    return requests.map((r) => {
      const backedOut = userById.get(String(r.user_id));
      const replacement = r.replacement_user_id ? userById.get(String(r.replacement_user_id)) : null;
      const filledEvent = (r.events ?? []).find((e) => e.status === 'SPOT_FILLED');
      return {
        backout_no: r.backout_no,
        backed_out_user_id: String(r.user_id),
        backed_out_user_name: fullName(backedOut) || null,
        backed_out_profile_photo: backedOut?.profile?.profile_photo ?? null,
        replacement_user_id: r.replacement_user_id ? String(r.replacement_user_id) : null,
        replacement_user_name: fullName(replacement) || null,
        replacement_profile_photo: replacement?.profile?.profile_photo ?? null,
        filled_at: iso(filledEvent?.at) ?? iso(r.updated_at) ?? '',
      };
    });
  },

  /**
   * Admin/Finance: one row per person on a pod — hosts, current attendees and
   * backed-out members — hydrated with contact info and, for filled seats, who
   * replaced them. Includes soft-deleted pods (cancelled pods keep their list).
   */
  async listAdminAttendees(podDocId: string) {
    // lean(): plain DB shapes, so legacy pods keep their genuinely-missing arrays.
    const pod = Types.ObjectId.isValid(podDocId)
      ? await PodModel.findById(podDocId).setOptions({ includeDeleted: true }).lean()
      : null;
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const [members, spotFilled] = await Promise.all([
      PodMemberModel.find({ pod_id: pod._id }).sort({ joined_at: 1 }),
      BackoutRequestModel.find({ pod_id: pod._id, status: 'SPOT_FILLED' }).lean(),
    ]);
    const hostIds = new Set((pod.pod_hosts_id ?? []).map(String));
    const memberUserIds = new Set(members.map((m) => String(m.user_id)));
    // People on the pod without a membership row (the host's own free seat).
    const extraIds = (pod.pod_attendees ?? []).map(String).filter((id) => !memberUserIds.has(id));
    const fillByMemberId = new Map(spotFilled.map((r) => [String(r.member_id), r]));
    const userIds = [
      ...new Set([
        ...extraIds,
        ...members.map((m) => String(m.user_id)),
        ...(spotFilled
          .map((r) => r.replacement_user_id && String(r.replacement_user_id))
          .filter(Boolean) as string[]),
      ]),
    ];
    const users = await UserModel.find({ _id: { $in: userIds } }).select(
      'profile.first_name profile.last_name profile.profile_photo auth.email auth.phone.number auth.phone.extension',
    );
    const userById = new Map<string, any>(users.map((u: any) => [String(u._id), u]));
    const personFields = (userId: string) => {
      const user = userById.get(userId);
      return {
        user_id: userId,
        full_name: fullName(user) || null,
        email: user?.auth?.email ?? null,
        phone: userContactNumber(user),
        profile_photo: user?.profile?.profile_photo ?? null,
        is_host: hostIds.has(userId),
      };
    };
    const hostRows = extraIds.map((id) => ({
      ...personFields(id),
      member_id: null,
      // The host's own seat: one person, nobody brought along.
      seats: 1,
      companions: [],
      status: null,
      joined_at: null,
      backed_out_at: null,
      source: null,
      refund_status: null,
      payment_id: null,
      backout_no: null,
      replaced_by_user_id: null,
      replaced_by_name: null,
    }));
    const memberRows = members.map((m) => {
      const fill = fillByMemberId.get(String(m._id));
      const replacementId = fill?.replacement_user_id ? String(fill.replacement_user_id) : null;
      return {
        ...personFields(String(m.user_id)),
        member_id: String(m._id),
        // Not in the schema — the participation field resolver reads it.
        pod_id: String(m.pod_id),
        // Without these a 4-seat booking and a 1-seat booking were the same row,
        // which is a large part of why the under-billing went unnoticed.
        seats: m.seats ?? 1,
        companions: (m.companions ?? []).map(toPubCompanion),
        status: m.status,
        joined_at: iso(m.joined_at),
        backed_out_at: iso(m.backed_out_at),
        source: m.source,
        refund_status: m.refund_status,
        payment_id: m.payment_id ? String(m.payment_id) : null,
        backout_no: fill?.backout_no ?? null,
        replaced_by_user_id: replacementId,
        replaced_by_name: replacementId ? fullName(userById.get(replacementId)) || null : null,
      };
    });
    return [...hostRows, ...memberRows];
  },

  /** Finance: every Backout request ever raised, newest first (all statuses). */
  async listBackoutRefunds() {
    const docs = await BackoutRequestModel.find().sort({ created_at: -1 });
    return hydrateBackoutRequests(docs);
  },

  /** Server-side table page (search/filter/sort/paginate) for the
   * backoutRefundRequestsTable query — same hydrated rows as
   * listBackoutRefunds. All request statuses are listed (audit history). */
  async tableBackoutRefunds(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IBackoutRequest>(
      BackoutRequestModel,
      {},
      input,
      BACKOUT_REFUND_TABLE_CONFIG
    );
    return { rows: await hydrateBackoutRequests(docs), total, page, page_size };
  },

  /** Finance: one Backout request by id (null for unknown/invalid ids). */
  async getBackoutRefund(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await BackoutRequestModel.findById(id);
    if (!doc) return null;
    const [hydrated] = await hydrateBackoutRequests([doc]);
    return hydrated ?? null;
  },

  /**
   * Finance processes the refund for a Spot Filled request — exactly once per
   * request. Flips the join payment to REFUNDED (deduction already reflected in
   * refund_amount) and notifies the member on every channel.
   */
  async processBackoutRefund(id: string) {
    const request = Types.ObjectId.isValid(id) ? await BackoutRequestModel.findById(id) : null;
    if (!request) {
      throw new GraphQLError('Backout request not found', { extensions: { code: 'NOT_FOUND' } });
    }
    if (request.status !== 'SPOT_FILLED') {
      throw new GraphQLError('Refund can be processed only after the spot is filled', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    if (request.refund_processed_at) {
      throw new GraphQLError('This Backout request has already been refunded', {
        extensions: { code: 'CONFLICT' },
      });
    }
    if (!request.payment_id) {
      throw new GraphQLError('This booking has no payment to refund', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    const payment = await PaymentModel.findById(request.payment_id);
    // A partial release leaves the payment SUCCESS on purpose (below), so a
    // later release on the same booking has to be refundable too.
    const partial = normalizeSeats(request.seats ?? 1) < normalizeSeats(request.seats_before ?? 1);
    if (payment?.status !== 'SUCCESS') {
      throw new GraphQLError('The linked payment cannot be refunded', {
        extensions: { code: 'CONFLICT' },
      });
    }

    // Only a release of the WHOLE booking ends the payment. Marking a payment
    // REFUNDED for a partial release said the pod collected nothing from a
    // buyer who is still attending on the seats they kept — `collectedForPod`
    // counts SUCCESS payments only, so the host and the venue would have
    // settled on a booking that never left. It also made the payment
    // un-refundable, so a second released seat could never be paid back.
    const refundedSoFar = round2(
      Number((payment.metadata as any)?.refunded_amount ?? 0) + Number(request.refund_amount ?? 0)
    );
    (payment.metadata as any) = {
      ...payment.metadata,
      refund_reason: 'backout_spot_filled',
      refunded_at: new Date().toISOString(),
      backout_no: request.backout_no,
      // What has gone back across every release on this booking, so Finance can
      // see a part-refunded payment for what it is.
      refunded_amount: refundedSoFar,
    };
    if (!partial) payment.status = 'REFUNDED';
    await payment.save();
    request.refund_processed_at = new Date();
    await request.save();
    const member = await PodMemberModel.findById(request.member_id);
    // A partially-refunded member is still going, so their membership-level
    // refund state must not read as settled.
    if (member && !partial) {
      member.refund_status = 'PROCESSED';
      member.refund_payment_id = payment._id;
      await member.save();
    }
    await notifyRefundProcessed(request, payment);
    const [row] = await hydrateBackoutRequests([request]);
    return row;
  },
};
