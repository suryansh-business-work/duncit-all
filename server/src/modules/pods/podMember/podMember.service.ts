import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
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
import { sendBackoutSpotFilledEmail, sendPodRefundEmail } from '@services/email/email.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

// Legacy display constant kept for schema compatibility (refund_threshold_pct).
const REFUND_THRESHOLD_PCT = 80;

/** Spec copy — shown when the per-pod backout attempt limit is exhausted. */
const BACKOUT_LIMIT_MESSAGE = 'You have reached the maximum number of Backout attempts allowed for this Pod.';
/** Spec copy — shown when the released seat was rebooked before "Keep My Spot". */
const REPLACEMENT_CONFIRMED_MESSAGE =
  'A replacement has been confirmed — this Backout request can no longer be cancelled.';

const newToken = () => `ref_${crypto.randomBytes(8).toString('hex')}`;

const iso = (v?: Date | null) => (v instanceof Date ? v.toISOString() : null);

const round2 = (n: number) => Math.round(n * 100) / 100;

const clampPct = (pct: unknown) => Math.max(0, Math.min(100, Number(pct) || 0));

/** Refund payable after the global Backouts deduction is applied. */
const refundAfterDeduction = (amount: number, pct: number) =>
  round2(Math.max(0, amount - (amount * pct) / 100));

/** Current Backouts deduction % (Finance → Default Deductions → Backouts). */
async function backoutDeductionPct(): Promise<number> {
  const settings = await getFinanceSettings();
  return clampPct(settings.default_backout_deduction_pct);
}

const toPub = (m: IPodMember) => ({
  id: String(m._id),
  pod_id: String(m.pod_id),
  user_id: String(m.user_id),
  status: m.status,
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

function isFreePodType(t: string) {
  return t === 'NATIVE_FREE' || t === 'NON_NATIVE_FREE';
}

const isPodFull = (pod: any) =>
  pod.no_of_spots > 0 && (pod.pod_attendees?.length ?? 0) >= pod.no_of_spots;

async function ensureSpotAvailable(pod: any) {
  if (isPodFull(pod)) {
    throw new GraphQLError('Pod is full', { extensions: { code: 'POD_FULL' } });
  }
}

async function addAttendee(pod: any, userId: string) {
  const uid = new Types.ObjectId(userId);
  if (!pod.pod_attendees.some((u: any) => String(u) === userId)) {
    pod.pod_attendees.push(uid as any);
    await pod.save();
  }
}

async function removeAttendee(pod: any, userId: string) {
  const before = pod.pod_attendees.length;
  pod.pod_attendees = pod.pod_attendees.filter((u: any) => String(u) !== userId);
  if (pod.pod_attendees.length !== before) await pod.save();
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
      UserModel.findById(member.user_id).select('profile.first_name profile.last_name auth.email'),
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
    const email = (user as any)?.auth?.email;
    if (email) {
      await sendBackoutSpotFilledEmail({
        to: email,
        name: fullName(user) || 'there',
        pod_title: pod.pod_title ?? 'your pod',
        refund_line: refundLine,
      });
    }
  } catch (err) {
    console.error('[backout] spot-filled notify failed:', err);
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
    const email = (user as any)?.auth?.email;
    if (email) {
      await sendPodRefundEmail({
        to: email,
        name: fullName(user) || 'there',
        pod_title: pod?.pod_title ?? 'your pod',
        amount,
        reason: `Backout ${request.backout_no} — spot filled`,
      });
    }
  } catch (err) {
    console.error('[backout] refund-processed notify failed:', err);
  }
}

/** Terminal transition: a replacement consumed the released seat. */
async function markSpotFilled(pod: any, member: IPodMember) {
  const request = member.active_backout_id
    ? await BackoutRequestModel.findById(member.active_backout_id)
    : null;
  member.status = 'BACKED_OUT';
  member.active_backout_id = null;
  await member.save();
  if (request?.status === 'IN_PROCESS') {
    request.status = 'SPOT_FILLED';
    request.events.push({ status: 'SPOT_FILLED', backout_count: request.attempt_no, at: new Date() });
    await request.save();
  }
  await notifySpotFilled(pod, member, request);
}

/**
 * After ANY successful join, fill in-process backouts (oldest first) whose
 * released seats the join consumed. A backout counts as filled only when seat
 * demand actually needed it: taken + in-process > total spots. Pods with
 * unlimited spots (0) have no seat scarcity, so nothing to fill.
 */
async function fillBackoutsAfterJoin(pod: any) {
  const spots = pod.no_of_spots ?? 0;
  if (spots <= 0) return;
  const inProcess = await PodMemberModel.find({ pod_id: pod._id, status: 'BACKOUT_IN_PROCESS' }).sort({
    backed_out_at: 1,
  });
  let overflow = (pod.pod_attendees?.length ?? 0) + inProcess.length - spots;
  for (const member of inProcess) {
    if (overflow <= 0) break;
    await markSpotFilled(pod, member);
    overflow -= 1;
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
) => ({
  id: String(request._id),
  backout_no: request.backout_no,
  pod_id: String(request.pod_id),
  user_id: String(request.user_id),
  user_name: fullName(user) || null,
  user_email: user?.auth?.email ?? null,
  status: member?.status ?? MEMBER_STATUS_BY_REQUEST[request.status],
  backout_status: request.status,
  attempt_no: request.attempt_no,
  backout_attempts_used: attemptsUsed,
  max_backout_attempts: maxAttempts,
  replacement_confirmed: request.status === 'SPOT_FILLED',
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
  const userIds = [...new Set(requests.map((r) => String(r.user_id)))];
  const paymentIds = requests.map((r) => r.payment_id).filter(Boolean).map(String);
  const [members, users, payments, attempts, maxAttempts] = await Promise.all([
    PodMemberModel.find({ _id: { $in: memberIds } }),
    UserModel.find({ _id: { $in: userIds } }).select('profile.first_name profile.last_name auth.email'),
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
    ),
  );
}

/** Estimated refund for a membership's join payment after deduction. */
async function previewRefundAmount(membership: IPodMember | null, pct: number): Promise<number | null> {
  if (!membership?.payment_id) return null;
  const payment = await PaymentModel.findById(membership.payment_id).select('total');
  if (!payment) return null;
  return refundAfterDeduction(payment.total, pct);
}

export const podMemberService = {
  async getState(podDocId: string, userId: string | null) {
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const spotsTaken = pod.pod_attendees?.length ?? 0;
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
    const refundAmount = await previewRefundAmount(membership, deductionPct);
    return {
      pod_id: String(pod._id),
      is_member: isMember,
      status: membership?.status ?? null,
      membership: membership ? toPub(membership) : null,
      spots_taken: spotsTaken,
      spots_total: spotsTotal,
      can_backout: isMember && attemptsUsed < maxAttempts,
      can_join: !!userId && !membership && !full,
      refund_threshold_pct: REFUND_THRESHOLD_PCT,
      backout_in_process: inProcess,
      can_cancel_backout: inProcess && !full,
      backout_attempts_used: attemptsUsed,
      backout_attempts_max: maxAttempts,
      backout_deduction_pct: deductionPct,
      backout_refund_amount: refundAmount,
    };
  },

  async listMine(userId: string, status?: string) {
    const q: any = { user_id: new Types.ObjectId(userId) };
    if (status) q.status = status;
    const docs = await PodMemberModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  async listForPod(podDocId: string, status?: string) {
    const q: any = { pod_id: new Types.ObjectId(podDocId) };
    if (status) q.status = status;
    const docs = await PodMemberModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  async lookupReferral(token: string) {
    const m = await PodMemberModel.findOne({ referral_token: token });
    return m ? toPub(m) : null;
  },

  async joinFree(podDocId: string, userId: string, referralToken?: string | null) {
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    if (pod.pod_date_time && pod.pod_date_time.getTime() < Date.now()) {
      throw new GraphQLError('This pod has already taken place — booking is closed.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    if (!isFreePodType(pod.pod_type)) {
      throw new GraphQLError('This pod is paid. Use checkout to book.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const uid = new Types.ObjectId(userId);
    const existing = await PodMemberModel.findOne({ pod_id: pod._id, user_id: uid, status: 'JOINED' });
    if (existing) return toPub(existing);
    await assertNoBackoutInProcess(pod._id as Types.ObjectId, uid);

    await ensureSpotAvailable(pod);

    let referredBy: Types.ObjectId | null = null;
    let source: JoinSource = 'FREE';
    if (referralToken) {
      const refDoc = await PodMemberModel.findOne({ referral_token: referralToken });
      if (refDoc && String(refDoc.pod_id) === String(pod._id)) {
        referredBy = refDoc.user_id;
        source = 'REFERRAL';
      }
    }

    const doc = await PodMemberModel.create({
      pod_id: pod._id,
      user_id: uid,
      status: 'JOINED',
      joined_at: new Date(),
      source,
      referred_by: referredBy,
      refund_status: 'NONE',
    });

    await addAttendee(pod, userId);
    await fillBackoutsAfterJoin(pod);
    evaluateBadgesForUser(userId, 'POD_JOIN').catch(() => {});
    try {
      const { ticketService } = await import('@modules/pods/ticket/ticket.service');
      await ticketService.ensureForMembership(String(doc._id));
    } catch (e) {
      console.warn('Ticket issue (free join) failed', e);
    }
    return toPub(doc);
  },

  /**
   * Confirm Backout — the booking moves to 'Backout in process' and the seat
   * is released for public booking immediately. No refund is initiated here:
   * the refund becomes eligible only when a replacement fills the seat. Every
   * request is a NEW immutable BackoutRequest with a fresh, permanent
   * Backout ID; attempts are capped per user per pod (Admin > Pod Settings).
   */
  async backout(podDocId: string, userId: string) {
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

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

    const payment = membership.payment_id ? await PaymentModel.findById(membership.payment_id) : null;
    const paymentAmount = payment ? payment.total : null;
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
      status: 'IN_PROCESS',
      payment_amount: paymentAmount,
      deduction_pct: deductionPct,
      refund_amount: refundAmount,
      events: [{ status: 'IN_PROCESS', backout_count: attemptNo, at: now }],
    });

    membership.status = 'BACKOUT_IN_PROCESS';
    membership.backed_out_at = now;
    membership.backout_count = attemptNo;
    membership.active_backout_id = request._id as Types.ObjectId;
    membership.refund_status = membership.payment_id ? 'PENDING' : 'NOT_ELIGIBLE';
    if (!membership.referral_token) membership.referral_token = newToken();
    await membership.save();
    await removeAttendee(pod, userId);

    return toPub(membership);
  },

  /**
   * Keep My Spot — cancel an in-process backout and restore the booking.
   * Only possible while the released seat has not been rebooked; once a
   * replacement is confirmed the request is terminal (SPOT_FILLED).
   */
  async cancelBackout(podDocId: string, userId: string) {
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

    const uid = new Types.ObjectId(userId);
    const membership = await PodMemberModel.findOne({
      pod_id: pod._id,
      user_id: uid,
      status: 'BACKOUT_IN_PROCESS',
    });
    if (!membership) {
      const latest = await BackoutRequestModel.findOne({ pod_id: pod._id, user_id: uid }).sort({
        created_at: -1,
      });
      if (latest?.status === 'SPOT_FILLED') {
        throw new GraphQLError(REPLACEMENT_CONFIRMED_MESSAGE, { extensions: { code: 'CONFLICT' } });
      }
      throw new GraphQLError('You have no backout in process for this pod', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    if (isPodFull(pod)) {
      throw new GraphQLError(REPLACEMENT_CONFIRMED_MESSAGE, { extensions: { code: 'CONFLICT' } });
    }

    const request = membership.active_backout_id
      ? await BackoutRequestModel.findById(membership.active_backout_id)
      : null;
    if (request?.status === 'IN_PROCESS') {
      request.status = 'CANCELLED';
      request.events.push({ status: 'CANCELLED', backout_count: request.attempt_no, at: new Date() });
      await request.save();
    }

    membership.status = 'JOINED';
    membership.backed_out_at = null;
    membership.refund_status = 'NONE';
    membership.active_backout_id = null;
    await membership.save();
    await addAttendee(pod, userId);

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

    await ensureSpotAvailable(pod);

    const doc = await PodMemberModel.create({
      pod_id: pod._id,
      user_id: uid,
      status: 'JOINED',
      joined_at: new Date(),
      source: 'REFERRAL',
      referred_by: refDoc.user_id,
      refund_status: 'NONE',
    });
    await addAttendee(pod, userId);
    // The vacated seat is consumed like any other join — the oldest in-process
    // backout (usually the referrer's) flips to Spot Filled and becomes
    // refund-eligible for Finance to process.
    await fillBackoutsAfterJoin(pod);

    evaluateBadgesForUser(userId, 'POD_JOIN').catch(() => {});
    return toPub(doc);
  },

  /**
   * Used by paymentService after a successful paid checkout to record the
   * membership row alongside attendee push.
   */
  async recordPaidJoin(podDocId: string, userId: string, paymentId: string) {
    const existing = await PodMemberModel.findOne({
      pod_id: new Types.ObjectId(podDocId),
      user_id: new Types.ObjectId(userId),
      status: 'JOINED',
    });
    if (existing) return existing;
    const doc = await PodMemberModel.create({
      pod_id: new Types.ObjectId(podDocId),
      user_id: new Types.ObjectId(userId),
      status: 'JOINED',
      joined_at: new Date(),
      source: 'PAID',
      payment_id: new Types.ObjectId(paymentId),
      refund_status: 'NONE',
    });
    try {
      const { ticketService } = await import('@modules/pods/ticket/ticket.service');
      await ticketService.ensureForMembership(String(doc._id));
    } catch (e) {
      console.warn('Ticket issue (paid join) failed', e);
    }
    // The payment flow pushes the attendee before recording the membership, so
    // a fresh pod read sees the taken seat — fill in-process backouts it
    // consumed. Best-effort: a fill failure must not fail the booking.
    try {
      const pod = await PodModel.findById(podDocId);
      if (pod) await fillBackoutsAfterJoin(pod);
    } catch (e) {
      console.warn('Backout fill (paid join) failed', e);
    }
    return doc;
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

    await ensureSpotAvailable(pod);

    membership.status = 'JOINED';
    membership.joined_at = new Date();
    membership.backed_out_at = null;
    membership.refund_status = 'NONE';
    await membership.save();

    await addAttendee(pod, userId);
    await fillBackoutsAfterJoin(pod);
    evaluateBadgesForUser(userId, 'POD_JOIN').catch(() => {});
    try {
      const { ticketService } = await import('@modules/pods/ticket/ticket.service');
      await ticketService.ensureForMembership(String(membership._id));
    } catch (e) {
      console.warn('Ticket issue (rejoin) failed', e);
    }
    return toPub(membership);
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
    if (payment?.status !== 'SUCCESS') {
      throw new GraphQLError('The linked payment cannot be refunded', {
        extensions: { code: 'CONFLICT' },
      });
    }

    payment.status = 'REFUNDED';
    (payment.metadata as any) = {
      ...payment.metadata,
      refund_reason: 'backout_spot_filled',
      refunded_at: new Date().toISOString(),
      backout_no: request.backout_no,
    };
    await payment.save();
    request.refund_processed_at = new Date();
    await request.save();
    const member = await PodMemberModel.findById(request.member_id);
    if (member) {
      member.refund_status = 'PROCESSED';
      member.refund_payment_id = payment._id;
      await member.save();
    }
    await notifyRefundProcessed(request, payment);
    const [row] = await hydrateBackoutRequests([request]);
    return row;
  },
};
