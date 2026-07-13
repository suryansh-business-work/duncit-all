import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import crypto from 'node:crypto';
import { PodMemberModel, type IPodMember, type JoinSource } from './podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { UserModel } from '@modules/access/user/user.model';
import { evaluateBadgesForUser } from '@modules/engagement/badge/badge.service';

// % of spots that must be filled before a backout triggers a refund.
const REFUND_THRESHOLD_PCT = 80;

const newToken = () => `ref_${crypto.randomBytes(8).toString('hex')}`;

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
  created_at: m.created_at?.toISOString?.() ?? '',
  updated_at: m.updated_at?.toISOString?.() ?? '',
});

function isFreePodType(t: string) {
  return t === 'NATIVE_FREE' || t === 'NON_NATIVE_FREE';
}

async function ensureSpotAvailable(pod: any) {
  if (pod.no_of_spots > 0 && (pod.pod_attendees?.length ?? 0) >= pod.no_of_spots) {
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

const fullName = (user: any) =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim();

// Flat shape for the Finance "Backout Refunds" list/detail — a backed-out member
// hydrated with the buyer's name/email and the linked join payment (if paid).
const toBackoutRefund = (m: IPodMember, user: any, payment: any) => ({
  id: String(m._id),
  pod_id: String(m.pod_id),
  user_id: String(m.user_id),
  user_name: fullName(user) || null,
  user_email: user?.auth?.email ?? null,
  status: m.status,
  joined_at: m.joined_at?.toISOString?.() ?? null,
  backed_out_at: m.backed_out_at ? m.backed_out_at.toISOString() : null,
  refund_status: m.refund_status,
  payment_id: m.payment_id ? String(m.payment_id) : null,
  payment_amount: payment ? payment.total : null,
  payment_currency: payment ? payment.currency_symbol : null,
  payment_status: payment ? payment.status : null,
  refund_threshold_pct: REFUND_THRESHOLD_PCT,
  created_at: m.created_at?.toISOString?.() ?? '',
});

// Batch-load users + payments to avoid an N+1 across the whole backed-out list.
async function hydrateBackouts(docs: IPodMember[]) {
  if (docs.length === 0) return [];
  const userIds = [...new Set(docs.map((d) => String(d.user_id)))];
  const paymentIds = docs.map((d) => d.payment_id).filter(Boolean).map(String);
  const [users, payments] = await Promise.all([
    UserModel.find({ _id: { $in: userIds } }).select('profile.first_name profile.last_name auth.email'),
    PaymentModel.find({ _id: { $in: paymentIds } }).select('total currency_symbol status'),
  ]);
  const userById = new Map<string, any>(users.map((u: any) => [String(u._id), u]));
  const paymentById = new Map<string, any>(payments.map((p: any) => [String(p._id), p]));
  return docs.map((m) =>
    toBackoutRefund(
      m,
      userById.get(String(m.user_id)),
      m.payment_id ? paymentById.get(String(m.payment_id)) : null
    )
  );
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
        status: 'JOINED',
      });
    }
    const isMember = !!membership;
    const full = spotsTotal > 0 && spotsTaken >= spotsTotal;
    return {
      pod_id: String(pod._id),
      is_member: isMember,
      status: membership?.status ?? null,
      membership: membership ? toPub(membership) : null,
      spots_taken: spotsTaken,
      spots_total: spotsTotal,
      can_backout: isMember,
      can_join: !!userId && !isMember && !full,
      refund_threshold_pct: REFUND_THRESHOLD_PCT,
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

    const existing = await PodMemberModel.findOne({
      pod_id: pod._id,
      user_id: new Types.ObjectId(userId),
      status: 'JOINED',
    });
    if (existing) return toPub(existing);

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
      user_id: new Types.ObjectId(userId),
      status: 'JOINED',
      joined_at: new Date(),
      source,
      referred_by: referredBy,
      refund_status: 'NONE',
    });

    await addAttendee(pod, userId);
    evaluateBadgesForUser(userId, 'POD_JOIN').catch(() => {});
    try {
      const { ticketService } = await import('@modules/pods/ticket/ticket.service');
      await ticketService.ensureForMembership(String(doc._id));
    } catch (e) {
      console.warn('Ticket issue (free join) failed', e);
    }
    return toPub(doc);
  },

  async backout(podDocId: string, userId: string) {
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

    const membership = await PodMemberModel.findOne({
      pod_id: pod._id,
      user_id: new Types.ObjectId(userId),
      status: 'JOINED',
    });
    if (!membership) {
      throw new GraphQLError('You are not a member of this pod', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    membership.status = 'BACKED_OUT';
    membership.backed_out_at = new Date();
    if (!membership.referral_token) membership.referral_token = newToken();

    // Refund logic — only relevant for paid pods that have a payment.
    if (membership.payment_id) {
      const filledPct =
        pod.no_of_spots > 0
          ? ((pod.pod_attendees?.length ?? 0) / pod.no_of_spots) * 100
          : 0;
      if (filledPct >= REFUND_THRESHOLD_PCT) {
        // Threshold met → process refund
        const payment = await PaymentModel.findById(membership.payment_id);
        if (payment?.status === 'SUCCESS') {
          payment.status = 'REFUNDED';
          (payment.metadata as any) = {
            ...payment.metadata,
            refund_reason: 'pod_backout_threshold_met',
            refunded_at: new Date().toISOString(),
          };
          await payment.save();
          membership.refund_status = 'PROCESSED';
          membership.refund_payment_id = payment._id;
        } else {
          membership.refund_status = 'PROCESSED';
        }
      } else {
        // Below threshold → pending until referral or threshold met
        membership.refund_status = 'PENDING';
      }
    } else {
      membership.refund_status = 'NOT_ELIGIBLE';
    }

    await membership.save();
    await removeAttendee(pod, userId);

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

    const existing = await PodMemberModel.findOne({
      pod_id: pod._id,
      user_id: new Types.ObjectId(userId),
      status: 'JOINED',
    });
    if (existing) return toPub(existing);

    await ensureSpotAvailable(pod);

    const doc = await PodMemberModel.create({
      pod_id: pod._id,
      user_id: new Types.ObjectId(userId),
      status: 'JOINED',
      joined_at: new Date(),
      source: 'REFERRAL',
      referred_by: refDoc.user_id,
      refund_status: 'NONE',
    });
    await addAttendee(pod, userId);

    // The vacated spot is now refilled — if backed-out member's refund was PENDING,
    // process it now (paid pods).
    if (refDoc.payment_id && refDoc.refund_status === 'PENDING') {
      const payment = await PaymentModel.findById(refDoc.payment_id);
      if (payment?.status === 'SUCCESS') {
        payment.status = 'REFUNDED';
        (payment.metadata as any) = {
          ...payment.metadata,
          refund_reason: 'referral_refilled_spot',
          refunded_at: new Date().toISOString(),
        };
        await payment.save();
        refDoc.refund_status = 'PROCESSED';
        refDoc.refund_payment_id = payment._id;
        await refDoc.save();
      }
    }

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
    return doc;
  },

  /**
   * Rejoin a pod the caller previously backed out of — no payment. Flips the
   * existing BACKED_OUT membership back to JOINED (reusing its join payment) and
   * re-adds the attendee. Allowed only until the pod completes / starts.
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

    await ensureSpotAvailable(pod);

    membership.status = 'JOINED';
    membership.joined_at = new Date();
    membership.backed_out_at = null;
    membership.refund_status = 'NONE';
    await membership.save();

    await addAttendee(pod, userId);
    evaluateBadgesForUser(userId, 'POD_JOIN').catch(() => {});
    try {
      const { ticketService } = await import('@modules/pods/ticket/ticket.service');
      await ticketService.ensureForMembership(String(membership._id));
    } catch (e) {
      console.warn('Ticket issue (rejoin) failed', e);
    }
    return toPub(membership);
  },

  /** Finance: all currently backed-out members, newest backout first. */
  async listBackoutRefunds() {
    const docs = await PodMemberModel.find({ status: 'BACKED_OUT' }).sort({ backed_out_at: -1 });
    return hydrateBackouts(docs);
  },

  /** Finance: one backed-out member by membership id (null once rejoined). */
  async getBackoutRefund(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await PodMemberModel.findById(id);
    if (doc?.status !== 'BACKED_OUT') return null;
    const [hydrated] = await hydrateBackouts([doc]);
    return hydrated ?? null;
  },
};
