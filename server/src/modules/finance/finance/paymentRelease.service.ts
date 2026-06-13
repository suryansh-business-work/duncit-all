import crypto from 'crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PaymentReleaseModel, type IPaymentRelease, type PaymentReleaseKind } from './paymentRelease.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { sendEmail } from '@services/email/email.service';
import { getFinanceSettings } from './finance.model';
import { computePodSettlement, type SettlementParty } from './settlement.service';
import { generatePayoutPdf } from '@services/payout/payout.pdf';

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
    breakdown: doc.breakdown
      ? {
          collected_total: doc.breakdown.collected_total ?? 0,
          venue_bill: doc.breakdown.venue_bill ?? 0,
          gst_pct: doc.breakdown.gst_pct ?? 0,
          gst_amount: doc.breakdown.gst_amount ?? 0,
          duncit_pct: doc.breakdown.duncit_pct ?? 0,
          duncit_amount: doc.breakdown.duncit_amount ?? 0,
          payout_pct: doc.breakdown.payout_pct ?? 0,
          payout_amount: doc.breakdown.payout_amount ?? 0,
        }
      : null,
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

const partyToBreakdown = (p: SettlementParty) => ({
  collected_total: p.collected_total,
  venue_bill: p.venue_bill,
  gst_pct: p.gst_pct,
  gst_amount: p.gst_amount,
  duncit_pct: p.duncit_pct,
  duncit_amount: p.duncit_amount,
  payout_pct: p.payout_pct,
  payout_amount: p.payout_amount,
});

// On approval, email the beneficiary their payout statement. When the release
// carries a settlement breakdown (the host-completion flow), a payout PDF is
// generated and attached with the reconciled lines. Best-effort.
async function notifyApproval(doc: IPaymentRelease) {
  if (doc.status !== 'APPROVED') return;
  try {
    const fs = await getFinanceSettings();
    const cur = fs.currency_symbol;
    const money = (n: number) => `${cur}${(Number(n) || 0).toFixed(2)}`;
    const isHost = doc.kind === 'HOST_PAYMENT';
    const tmpl = isHost ? fs.invoice_templates.host : fs.invoice_templates.venue;
    const b = doc.breakdown;
    const payout = doc.approved_amount ?? b?.payout_amount ?? doc.amount_requested;
    const attachments = [];
    if (b) {
      const pdf = await generatePayoutPdf({
        statement_type: isHost ? 'HOST' : 'VENUE',
        title: tmpl.label,
        release_id: doc.release_id,
        statement_date: doc.reviewed_at ?? new Date(),
        pod_title: doc.pod_title,
        beneficiary_name: doc.beneficiary_name,
        beneficiary_email: doc.beneficiary_email,
        business_name: fs.business_name,
        business_address: fs.business_address,
        business_gstin: fs.business_gstin,
        currency_symbol: cur,
        collected_total: b.collected_total,
        venue_bill: b.venue_bill,
        gst_pct: b.gst_pct,
        gst_amount: b.gst_amount,
        duncit_pct: b.duncit_pct,
        duncit_amount: b.duncit_amount,
        payout_pct: b.payout_pct,
        payout_amount: payout,
        invoice_logo_url: fs.invoice_logo_url,
        invoice_support_email: fs.invoice_support_email,
        invoice_support_phone: fs.invoice_support_phone,
        invoice_footer_note: tmpl.footer || fs.invoice_footer_note,
        invoice_terms: tmpl.terms,
      });
      attachments.push({
        filename: `payout-${doc.release_id.replace(/[^A-Za-z0-9_-]+/g, '-')}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      });
    }
    await sendEmail({
      to: doc.beneficiary_email,
      subject: `Payout approved · ${doc.pod_title}`,
      template: 'payout-statement',
      vars: {
        name: doc.beneficiary_name,
        pod_title: doc.pod_title,
        statement_type: isHost ? 'host commission' : 'venue payout',
        venue_bill: money(b?.venue_bill ?? 0),
        gst_amount: money(b?.gst_amount ?? 0),
        duncit_label: isHost ? 'Duncit Taken' : 'Duncit Cut',
        duncit_amount: money(b?.duncit_amount ?? 0),
        payout_label: isHost ? 'Your Commission' : 'Your Payout',
        payout_amount: money(payout),
        approval_type: doc.approval_type ?? 'FULL',
        reason: doc.approval_reason ?? '',
      },
      attachments,
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
    if (doc.status === 'APPROVED') {
      // Finance approval is the moment the pod is officially completed.
      await PodModel.updateOne({ _id: doc.pod_id, completed_at: null }, { $set: { completed_at: new Date() } });
      // The host's commission is credited to their wallet to withdraw later.
      if (doc.kind === 'HOST_PAYMENT' && doc.host_user_id) {
        const { walletService } = await import('@modules/finance/wallet/wallet.service');
        await walletService.creditPodPayout(String(doc.host_user_id), doc.approved_amount ?? doc.amount_requested, {
          pod_id: doc.pod_id,
          release_id: doc.release_id,
          reason: `Payout for ${doc.pod_title}`,
        });
      }
      // Host approval = pod completed: email each product seller their invoice.
      if (doc.kind === 'HOST_PAYMENT') {
        try {
          const pod = await PodModel.findById(doc.pod_id).select('pod_title product_requests');
          if (pod && (pod as any).product_requests?.length) {
            const fs = await getFinanceSettings();
            const { sendProductInvoicesForPod } = await import('./productInvoice.service');
            await sendProductInvoicesForPod(pod, fs);
          }
        } catch (e) {
          console.warn('[paymentRelease] product invoices failed:', (e as Error).message);
        }
      }
    }
    await notifyApproval(doc);
    return toPub(doc);
  },

  /** Host (or admin) completes a pod: enter the venue bill + upload party media,
   * and the reconciled host/venue payout releases are created PENDING for
   * Finance to approve. Returns the computed settlement + the created releases. */
  async completePod(input: any, actor: { id: string; isAdmin: boolean }) {
    const pod = await PodModel.findById(input.pod_id);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const isHost = (pod.pod_hosts_id ?? []).some((id: any) => String(id) === actor.id);
    if (!isHost && !actor.isAdmin) {
      throw new GraphQLError('Only a host of this pod can complete it', { extensions: { code: 'FORBIDDEN' } });
    }

    const already = await PaymentReleaseModel.findOne({
      pod_id: pod._id,
      kind: 'HOST_PAYMENT',
      status: { $in: ['PENDING', 'APPROVED'] },
    });
    if (already) {
      throw new GraphQLError('This pod has already been submitted for completion', {
        extensions: { code: 'CONFLICT' },
      });
    }

    const billUrl = clean(input.bill_url);
    const evidence = (input.evidence_media ?? [])
      .map((media: any) => clean(media?.url || media))
      .filter(Boolean)
      .map((url: string) => ({ url, type: mediaType(url) }));
    if (evidence.length === 0) {
      throw new GraphQLError('Upload party photos or videos to complete this pod', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const settlement = await computePodSettlement(String(pod._id), Number(input.venue_bill_amount) || 0);
    if (settlement.has_venue && !billUrl) {
      throw new GraphQLError('Upload the venue bill to complete this pod', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const releases: IPaymentRelease[] = [];
    const hostBeneficiary = await beneficiaryFor('HOST_PAYMENT', pod, input.host_user_id);
    releases.push(
      await PaymentReleaseModel.create({
        release_id: releaseId(),
        kind: 'HOST_PAYMENT',
        pod_id: pod._id,
        pod_title: pod.pod_title,
        venue_id: null,
        host_user_id: hostBeneficiary.host_user_id,
        beneficiary_name: hostBeneficiary.name,
        beneficiary_email: hostBeneficiary.email,
        amount_requested: settlement.host.payout_amount,
        bill_url: billUrl,
        evidence_media: evidence,
        notes: clean(input.notes),
        requested_by: new Types.ObjectId(actor.id),
        requested_at: new Date(),
        breakdown: partyToBreakdown(settlement.host),
      })
    );

    if (settlement.has_venue && settlement.venue) {
      const venueBeneficiary = await beneficiaryFor('VENUE_BILLING', pod);
      releases.push(
        await PaymentReleaseModel.create({
          release_id: releaseId(),
          kind: 'VENUE_BILLING',
          pod_id: pod._id,
          pod_title: pod.pod_title,
          venue_id: venueBeneficiary.venue_id,
          host_user_id: null,
          beneficiary_name: venueBeneficiary.name,
          beneficiary_email: venueBeneficiary.email,
          amount_requested: settlement.venue.payout_amount,
          bill_url: billUrl,
          evidence_media: [],
          notes: clean(input.notes),
          requested_by: new Types.ObjectId(actor.id),
          requested_at: new Date(),
          breakdown: partyToBreakdown(settlement.venue),
        })
      );
    }

    return { settlement, releases: releases.map(toPub) };
  },

  /** A host's own completion payouts (their "Host Share" history). */
  async listMine(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const docs = await PaymentReleaseModel.find({
      kind: 'HOST_PAYMENT',
      host_user_id: new Types.ObjectId(userId),
    })
      .sort({ created_at: -1 })
      .limit(200);
    return docs.map(toPub);
  },
};