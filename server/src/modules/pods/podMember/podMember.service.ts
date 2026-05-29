import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { PodMemberModel, type IPodMember, type JoinSource } from './podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
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
        if (payment && payment.status === 'SUCCESS') {
          payment.status = 'REFUNDED';
          (payment.metadata as any) = {
            ...(payment.metadata || {}),
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
      if (payment && payment.status === 'SUCCESS') {
        payment.status = 'REFUNDED';
        (payment.metadata as any) = {
          ...(payment.metadata || {}),
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
    return doc;
  },
};
