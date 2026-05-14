import crypto from 'crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PaymentReleaseModel, type IPaymentRelease, type PaymentReleaseKind } from './paymentRelease.model';
import { PodModel } from '../pod/pod.model';
import { VenueModel } from '../venue/venue.model';
import { UserModel } from '../user/user.model';
import { sendEmail } from '../../services/email/email.service';

const releaseId = () => `rel_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;

const mediaType = (url: string) => (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) ? 'VIDEO' : 'IMAGE');
const clean = (value: unknown) => String(value ?? '').trim();

function toPub(doc: IPaymentRelease) {
  return {
    id: String(doc._id),
    release_id: doc.release_id,
    kind: doc.kind,
    status: doc.status,
    pod_id: String(doc.pod_id),
    pod_title: doc.pod_title,
    venue_id: doc.venue_id ? String(doc.venue_id) : null,
    host_user_id: doc.host_user_id ? String(doc.host_user_id) : null,
    beneficiary_name: doc.beneficiary_name,
    beneficiary_email: doc.beneficiary_email,
    amount_requested: doc.amount_requested,
    bill_url: doc.bill_url ?? '',
    evidence_media: doc.evidence_media ?? [],
    notes: doc.notes ?? '',
    requested_by: doc.requested_by ? String(doc.requested_by) : null,
    requested_at: doc.requested_at?.toISOString?.() ?? '',
    reviewed_by: doc.reviewed_by ? String(doc.reviewed_by) : null,
    reviewed_at: doc.reviewed_at?.toISOString?.() ?? null,
    approval_type: doc.approval_type ?? null,
    approved_amount: doc.approved_amount ?? null,
    approval_reason: doc.approval_reason ?? '',
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

async function beneficiaryFor(kind: PaymentReleaseKind, pod: any, hostUserId?: string | null) {
  if (kind === 'VENUE_BILLING') {
    if (!pod.venue_id) throw new GraphQLError('This pod has no venue billing target', { extensions: { code: 'BAD_USER_INPUT' } });
    const venue = await VenueModel.findById(pod.venue_id);
    if (!venue) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
    if (!venue.owner_email) throw new GraphQLError('Venue owner email is missing', { extensions: { code: 'BAD_USER_INPUT' } });
    return {
      venue_id: venue._id,
      host_user_id: null,
      name: venue.venue_name || venue.owner_name || 'Venue',
      email: venue.owner_email,
    };
  }

  const hostId = hostUserId || String(pod.pod_hosts_id?.[0] ?? '');
  if (!hostId || !pod.pod_hosts_id?.some((id: any) => String(id) === hostId)) {
    throw new GraphQLError('Select a host assigned to this pod', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const host = await UserModel.findById(hostId);
  if (!host) throw new GraphQLError('Host user not found', { extensions: { code: 'NOT_FOUND' } });
  if (!host.email) throw new GraphQLError('Host email is missing', { extensions: { code: 'BAD_USER_INPUT' } });
  return {
    venue_id: null,
    host_user_id: host._id,
    name: [host.first_name, host.last_name].filter(Boolean).join(' ').trim() || host.email,
    email: host.email,
  };
}

async function notifyApproval(doc: IPaymentRelease) {
  if (doc.status !== 'APPROVED') return;
  try {
    await sendEmail({
      to: doc.beneficiary_email,
      subject: `Payment release approved · ${doc.pod_title}`,
      template: 'payment-release-approved',
      vars: {
        name: doc.beneficiary_name,
        pod_title: doc.pod_title,
        release_type: doc.kind === 'VENUE_BILLING' ? 'Venue billing' : 'Host payment',
        approval_type: doc.approval_type ?? 'FULL',
        amount_requested: String(doc.amount_requested),
        approved_amount: String(doc.approved_amount ?? doc.amount_requested),
        reason: doc.approval_reason ?? '',
      },
    });
  } catch (error) {
    console.warn('[paymentRelease] approval email failed:', (error as Error).message);
  }
}

export const paymentReleaseService = {
  async list(filter?: { status?: string | null; kind?: PaymentReleaseKind | null }) {
    const query: any = {};
    if (filter?.status) query.status = filter.status;
    if (filter?.kind) query.kind = filter.kind;
    const docs = await PaymentReleaseModel.find(query).sort({ created_at: -1 }).limit(300);
    return docs.map(toPub);
  },

  async create(input: any, actorId?: string | null) {
    const kind = input.kind as PaymentReleaseKind;
    if (!['VENUE_BILLING', 'HOST_PAYMENT'].includes(kind)) {
      throw new GraphQLError('Invalid payment release type', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const amount = Number(input.amount_requested);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new GraphQLError('Release amount must be greater than 0', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const pod = await PodModel.findById(input.pod_id);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const beneficiary = await beneficiaryFor(kind, pod, input.host_user_id);
    const evidence = (input.evidence_media ?? [])
      .map((media: any) => clean(media?.url || media))
      .filter(Boolean)
      .map((url: string) => ({ url, type: mediaType(url) }));
    const billUrl = clean(input.bill_url);
    if (kind === 'VENUE_BILLING' && !billUrl) {
      throw new GraphQLError('Upload a venue bill before requesting release', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (kind === 'HOST_PAYMENT' && evidence.length === 0) {
      throw new GraphQLError('Upload party photos or videos before requesting host payment', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await PaymentReleaseModel.create({
      release_id: releaseId(),
      kind,
      pod_id: pod._id,
      pod_title: pod.pod_title,
      venue_id: beneficiary.venue_id,
      host_user_id: beneficiary.host_user_id,
      beneficiary_name: beneficiary.name,
      beneficiary_email: beneficiary.email,
      amount_requested: amount,
      bill_url: billUrl,
      evidence_media: evidence,
      notes: clean(input.notes),
      requested_by: actorId ? new Types.ObjectId(actorId) : null,
      requested_at: new Date(),
    });
    if (!(pod as any).completed_at) {
      (pod as any).completed_at = new Date();
      await pod.save();
    }
    return toPub(doc);
  },

  async review(id: string, input: any, reviewerId?: string | null) {
    const doc = await PaymentReleaseModel.findById(id);
    if (!doc) throw new GraphQLError('Payment release request not found', { extensions: { code: 'NOT_FOUND' } });
    if (doc.status !== 'PENDING') {
      throw new GraphQLError('Only pending requests can be reviewed', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const status = input.status;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new GraphQLError('Select approval status', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const approvalType = input.approval_type || 'FULL';
    if (status === 'APPROVED' && !['FULL', 'PARTIAL'].includes(approvalType)) {
      throw new GraphQLError('Select full or partial release', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const amount = approvalType === 'FULL' ? doc.amount_requested : Number(input.approved_amount);
    if (status === 'APPROVED' && (!Number.isFinite(amount) || amount <= 0 || amount > doc.amount_requested)) {
      throw new GraphQLError('Approved amount must be between 1 and requested amount', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const reason = clean(input.approval_reason);
    if ((status === 'REJECTED' || approvalType === 'PARTIAL') && !reason) {
      throw new GraphQLError('Reason is required for partial release or rejection', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    doc.status = status;
    doc.approval_type = status === 'APPROVED' ? approvalType : null;
    doc.approved_amount = status === 'APPROVED' ? amount : 0;
    doc.approval_reason = reason;
    doc.reviewed_by = reviewerId ? new Types.ObjectId(reviewerId) : null;
    doc.reviewed_at = new Date();
    await doc.save();
    await notifyApproval(doc);
    return toPub(doc);
  },
};