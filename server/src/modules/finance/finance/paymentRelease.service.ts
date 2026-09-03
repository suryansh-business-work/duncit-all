import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { Types } from 'mongoose';
import { PaymentReleaseModel, type IPaymentRelease, type PaymentReleaseKind } from './paymentRelease.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { getFinanceSettings, partyTemplateOf } from './finance.model';
import {
  computePodSettlement,
  SETTLEMENT_ENGINE_VERSION,
  type PodSettlement,
} from './settlement.service';
import { generatePayoutPdf } from '@services/payout/payout.pdf';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const releaseId = () => `rel_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;

const mediaType = (url: string) => (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) ? 'VIDEO' : 'IMAGE');
const clean = (value: string | number | null | undefined) => String(value ?? '').trim();

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
          version: doc.breakdown.version || 1,
          net_amount: doc.breakdown.net_amount ?? 0,
          platform_fee_pct: doc.breakdown.platform_fee_pct ?? 0,
          platform_fee_amount: doc.breakdown.platform_fee_amount ?? 0,
          pool_amount: doc.breakdown.pool_amount ?? 0,
          club_admin_pct: doc.breakdown.club_admin_pct ?? 0,
          club_admin_amount: doc.breakdown.club_admin_amount ?? 0,
          share_pct: doc.breakdown.share_pct ?? 0,
          share_amount: doc.breakdown.share_amount ?? 0,
          commission_pct: doc.breakdown.commission_pct ?? 0,
          commission_amount: doc.breakdown.commission_amount ?? 0,
          duncit_revenue: doc.breakdown.duncit_revenue ?? 0,
          attended_seats: doc.breakdown.attended_seats ?? 0,
          booked_seats: doc.breakdown.booked_seats ?? 0,
          attended_total: doc.breakdown.attended_total ?? 0,
        }
      : null,
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

/** Allowlists for the shared table engine (paymentReleaseRequestsTable — DUNCIT TABLE CONTRACT v1). */
const RELEASE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['release_id', 'pod_title', 'beneficiary_name', 'beneficiary_email'],
  sortFields: {
    kind: 'kind',
    status: 'status',
    pod_title: 'pod_title',
    beneficiary_name: 'beneficiary_name',
    amount_requested: 'amount_requested',
    requested_at: 'requested_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    kind: { type: 'enum' },
    pod_id: { type: 'string' },
    amount_requested: { type: 'number' },
    requested_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/**
 * The club-admin beneficiary for a pod: pod.club_id → the club's FIRST admin
 * user. Best-effort — a pod whose club has no admin (or an admin without an
 * email) simply has no club-admin payout, it must never block completion.
 */
async function clubAdminBeneficiary(pod: any) {
  if (!pod.club_id) return null;
  const { ClubModel } = await import('@modules/clubs/club/club.model');
  const club = await ClubModel.findById(pod.club_id).select('admin_user_ids club_name');
  const adminId = club?.admin_user_ids?.[0];
  if (!adminId) return null;
  const admin = await UserModel.findById(adminId);
  if (!admin?.email) return null;
  return {
    host_user_id: admin._id,
    name:
      [admin.first_name, admin.last_name].filter(Boolean).join(' ').trim() || String(admin.email),
    email: String(admin.email),
  };
}

/**
 * One ECOMM_PAYMENT release per seller who actually sold something on this pod.
 *
 * The amounts come from {@link computeSellerPayoutsForPod} — the SAME buckets
 * the product invoice bills — so the release can never credit a different
 * number from the one the seller was invoiced for. Sellers with nothing sold
 * (their reserved stock went back to them at completion) get no release at all
 * rather than a ₹0 one, and a seller whose account has no email is skipped for
 * the same reason the other kinds require one: there is nobody to send the
 * statement to. Best-effort — a product hiccup must never fail a completion.
 */
async function ecommReleases(pod: any, actorId: string, notes: string): Promise<IPaymentRelease[]> {
  // Idempotency guard, because there are two ways in: completePod creates
  // these up front (so they ride back to the caller and show in the completion
  // summary), and the legacy manual-release path creates them when the host
  // payment is approved. Whichever runs first wins; the other is a no-op.
  const already = await PaymentReleaseModel.exists({ pod_id: pod._id, kind: 'ECOMM_PAYMENT' });
  if (already) return [];
  // Dynamic, like sendProductInvoices below: productInvoice.service pulls in
  // the inventory + order models, which this module must not load eagerly.
  const { computeSellerPayoutsForPod, sellerTotals } = await import('./productInvoice.service');
  const bySeller = await computeSellerPayoutsForPod(pod, await getFinanceSettings());
  if (bySeller.size === 0) return [];
  const sellerIds = [...bySeller.keys()];
  const sellers = await UserModel.find({ _id: { $in: sellerIds } }).select('auth.email profile.first_name profile.last_name');
  const sellerById = new Map(sellers.map((s: any) => [String(s._id), s]));

  const created: IPaymentRelease[] = [];
  for (const [sellerId, bucket] of bySeller) {
    const { net_total } = sellerTotals(bucket);
    if (net_total <= 0) continue;
    const seller: any = sellerById.get(sellerId);
    const email = seller?.auth?.email;
    if (!email) {
      logs.server.warn('paymentRelease', 'ecommReleases', {
        pod_id: String(pod._id),
        sellerId,
        msg: 'product seller has no email — ECOMM payout skipped',
      });
      continue;
    }
    const name =
      [seller?.profile?.first_name, seller?.profile?.last_name].filter(Boolean).join(' ').trim() ||
      bucket.name;
    created.push(
      await PaymentReleaseModel.create({
        release_id: releaseId(),
        kind: 'ECOMM_PAYMENT',
        pod_id: pod._id,
        pod_title: pod.pod_title,
        venue_id: null,
        host_user_id: seller._id,
        beneficiary_name: name,
        beneficiary_email: email,
        amount_requested: net_total,
        bill_url: '',
        evidence_media: [],
        notes,
        requested_by: new Types.ObjectId(actorId),
        requested_at: new Date(),
      })
    );
  }
  return created;
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

// v2 snapshot: the party's legacy statement lines + the full waterfall, frozen
// at completion time so rate changes never rewrite history. `party` picks which
// side is "this beneficiary's": share_amount = the party's pool money (venue's
// booked slot price / host's remainder / the club-admin cut), share_pct = its %
// of the pool. The club-admin party has no commission of its own — its cut is
// paid out whole.
const settlementToBreakdown = (s: PodSettlement, party: 'HOST' | 'VENUE' | 'CLUB_ADMIN') => {
  const w = s.waterfall;
  if (party === 'CLUB_ADMIN') {
    return {
      collected_total: s.collected_total,
      venue_bill: s.venue_bill,
      gst_pct: 0,
      gst_amount: 0,
      duncit_pct: 0,
      duncit_amount: 0,
      payout_pct: w.club_admin_pct,
      payout_amount: w.club_admin_amount,
      version: SETTLEMENT_ENGINE_VERSION,
      net_amount: w.net_amount,
      platform_fee_pct: w.platform_fee_pct,
      platform_fee_amount: w.platform_fee_amount,
      pool_amount: w.pool_amount,
      club_admin_pct: w.club_admin_pct,
      club_admin_amount: w.club_admin_amount,
      share_pct: w.club_admin_pct,
      share_amount: w.club_admin_amount,
      commission_pct: 0,
      commission_amount: 0,
      duncit_revenue: w.duncit_revenue,
      ...attendanceOf(s),
    };
  }
  const isHost = party === 'HOST';
  const legacy = isHost ? s.host : s.venue!;
  const shareAmount = isHost ? w.host_amount : w.venue_amount;
  const sharePct = w.pool_amount > 0 ? Math.round((shareAmount / w.pool_amount) * 10000) / 100 : 0;
  return {
    collected_total: legacy.collected_total,
    venue_bill: legacy.venue_bill,
    gst_pct: legacy.gst_pct,
    gst_amount: legacy.gst_amount,
    duncit_pct: legacy.duncit_pct,
    duncit_amount: legacy.duncit_amount,
    payout_pct: legacy.payout_pct,
    payout_amount: legacy.payout_amount,
    version: SETTLEMENT_ENGINE_VERSION,
    net_amount: w.net_amount,
    platform_fee_pct: w.platform_fee_pct,
    platform_fee_amount: w.platform_fee_amount,
    pool_amount: w.pool_amount,
    club_admin_pct: w.club_admin_pct,
    club_admin_amount: w.club_admin_amount,
    share_pct: sharePct,
    share_amount: shareAmount,
    commission_pct: isHost ? w.host_commission_pct : w.venue_commission_pct,
    commission_amount: isHost ? w.host_commission_amount : w.venue_commission_amount,
    duncit_revenue: w.duncit_revenue,
    ...attendanceOf(s),
  };
};

/** The attendance the payout was computed from, frozen onto the release. A
 * later scan changes the pod's attendance, so a reviewer could never re-derive
 * what this payout actually stood on — it has to be stamped. */
const attendanceOf = (s: PodSettlement) => ({
  attended_seats: s.attended_seats,
  booked_seats: s.booked_seats,
  attended_total: s.attended_total,
});

function statementTypeLabel(kind: PaymentReleaseKind): string {
  if (kind === 'HOST_PAYMENT') return 'host commission';
  if (kind === 'CLUB_ADMIN') return 'club admin payout';
  if (kind === 'ECOMM_PAYMENT') return 'product sales payout';
  return 'venue payout';
}

// ECOMM_PAYMENT falls through to the default: a seller reads "Your Payout"
// exactly like a venue owner does.
function payoutLabel(kind: PaymentReleaseKind): string {
  if (kind === 'HOST_PAYMENT') return 'Your Commission';
  if (kind === 'CLUB_ADMIN') return 'Club Admin Payout';
  return 'Your Payout';
}

/**
 * The money a release actually moves — ONE definition, because the same number
 * is quoted to the beneficiary by {@link notifyApproval} and credited to their
 * wallet by {@link applyApproval}.
 *
 * They used to compute it separately: the statement fell through
 * `breakdown.payout_amount` and the wallet did not. A release with no
 * `approved_amount` whose breakdown disagreed with the request therefore mailed
 * a statement — and a PDF — for a number that was never credited.
 */
export function releasePayout(doc: Pick<IPaymentRelease, 'approved_amount' | 'amount_requested'>): number {
  return doc.approved_amount ?? doc.amount_requested;
}

/** The WhatsApp scenario each kind of payout announces. */
const WA_PAYOUT_EVENT: Record<PaymentReleaseKind, string> = {
  HOST_PAYMENT: 'HOST_PAYMENT_SENT',
  VENUE_BILLING: 'VENUE_PAYMENT_SENT',
  CLUB_ADMIN: 'CLUB_ADMIN_PAYMENT_SENT',
  // Never actually sent from here — the seller's ECOMM_PAYMENT_SENT WhatsApp
  // rides their product invoice instead (see notifyApproval). Mapped because
  // the Record is exhaustive over the kind union.
  ECOMM_PAYMENT: 'ECOMM_PAYMENT_SENT',
};

/**
 * The beneficiary's account, loaded for the phone number the WhatsApp funnel
 * reads off it — the release itself carries only an email. Venue money is owed
 * to the venue's owner user; host and club-admin money to `host_user_id`.
 */
async function beneficiaryUser(doc: IPaymentRelease) {
  const fields = 'auth.phone communication.whatsapp';
  if (doc.kind === 'VENUE_BILLING') {
    const venue = doc.venue_id ? await VenueModel.findById(doc.venue_id).select('owner_user_id') : null;
    if (!venue?.owner_user_id) return null;
    return UserModel.findById(venue.owner_user_id).select(fields).lean<Record<string, any> | null>();
  }
  if (!doc.host_user_id) return null;
  return UserModel.findById(doc.host_user_id).select(fields).lean<Record<string, any> | null>();
}

/**
 * The template values, in the registry's order for this kind. The club-admin
 * template asks for the club and the payment id where the host and venue ones
 * ask for the pod's time, so the two shapes are built apart.
 */
async function payoutWaParams(doc: IPaymentRelease, payout: number, pod: any): Promise<string[]> {
  const when = pod?.pod_date_time ? new Date(pod.pod_date_time) : null;
  const date = when ? when.toLocaleString('en-IN', { dateStyle: 'medium' }) : '';
  const time = when ? when.toLocaleString('en-IN', { timeStyle: 'short' }) : '';
  // No currency symbol: every payout template prints the rupee sign itself.
  const amount = payout.toFixed(2);
  if (doc.kind === 'CLUB_ADMIN') {
    const { ClubModel } = await import('@modules/clubs/club/club.model');
    const club = pod?.club_id ? await ClubModel.findById(pod.club_id).select('club_name') : null;
    return [
      doc.beneficiary_name,
      doc.pod_title,
      club?.club_name ?? '',
      doc.pod_title,
      doc.release_id,
      date,
      amount,
    ];
  }
  return [doc.beneficiary_name, doc.pod_title, doc.pod_title, date, time, amount];
}

/**
 * The same news as the statement email, on WhatsApp: the payout is out, for the
 * amount {@link releasePayout} says was moved.
 *
 * The pod is read here because the release stores the pod's title but not its
 * schedule, and the templates want the date and the time as separate values.
 */
async function notifyApprovalWhatsapp(doc: IPaymentRelease, payout: number) {
  const pod = await PodModel.findById(doc.pod_id).select('pod_date_time club_id');
  const user = await beneficiaryUser(doc);
  await whatsappService.send({
    event: WA_PAYOUT_EVENT[doc.kind],
    entityId: String(doc._id),
    user,
    name: doc.beneficiary_name,
    params: await payoutWaParams(doc, payout, pod),
  });
}

// On approval, email the beneficiary their payout statement and tell them the
// same on WhatsApp. When the release carries a settlement breakdown (the
// host-completion flow), a payout PDF is generated and attached with the
// reconciled lines. Best-effort.
async function notifyApproval(doc: IPaymentRelease) {
  if (doc.status !== 'APPROVED') return;
  // A seller is told about this money ONCE, by their product invoice —
  // sendProductInvoicesForPod already emails the PDF and fires
  // ECOMM_PAYMENT_SENT for the same net amount this release credits. Sending a
  // payout statement here too would bill one sale twice in the seller's inbox.
  if (doc.kind === 'ECOMM_PAYMENT') return;
  try {
    const fs = await getFinanceSettings();
    const cur = fs.currency_symbol;
    const money = (n: number) => `${cur}${(Number(n) || 0).toFixed(2)}`;
    const isHost = doc.kind === 'HOST_PAYMENT';
    const isClubAdmin = doc.kind === 'CLUB_ADMIN';
    // Through the shared accessor: `label` is this PDF's title, and a row the
    // old partial-save bug stripped would have printed an undefined one.
    const tmpl = partyTemplateOf(fs, isHost ? 'host' : 'venue');
    const b = doc.breakdown;
    const payout = releasePayout(doc);
    const attachments = [];
    // The payout PDF renders HOST/VENUE statements; the club-admin cut ships as
    // a plain statement email (no PDF template for it).
    if (b && !isClubAdmin) {
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
      category: 'billing',
      vars: {
        name: doc.beneficiary_name,
        pod_title: doc.pod_title,
        statement_type: statementTypeLabel(doc.kind),
        venue_bill: money(b?.venue_bill ?? 0),
        gst_amount: money(b?.gst_amount ?? 0),
        duncit_label: isHost ? 'Duncit Taken' : 'Duncit Cut',
        duncit_amount: money(b?.duncit_amount ?? 0),
        payout_label: payoutLabel(doc.kind),
        payout_amount: money(payout),
        approval_type: doc.approval_type ?? 'FULL',
        reason: doc.approval_reason ?? '',
      },
      attachments,
    });
    await notifyApprovalWhatsapp(doc, payout);
  } catch (error) {
    logs.server.warn('paymentRelease', 'notifyApproval', { error, msg: 'approval email failed' });
  }
}

// Validate a review payload against the pending request and return the decided
// fields. Throws the same BAD_USER_INPUT errors as before, in the same order.
function parseReviewInput(doc: IPaymentRelease, input: any) {
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
  return { status, approvalType, amount, reason };
}

// Host approval = pod completed: email each product seller their invoice.
async function sendProductInvoices(doc: IPaymentRelease) {
  try {
    const pod = await PodModel.findById(doc.pod_id).select('pod_title product_requests');
    if (pod && (pod as any).product_requests?.length) {
      const fs = await getFinanceSettings();
      const { sendProductInvoicesForPod } = await import('./productInvoice.service');
      await sendProductInvoicesForPod(pod, fs);
      // The seller's money, not just their invoice. completePod normally makes
      // these already (and the guard inside makes this a no-op), but a pod
      // settled through the legacy manual-release flow reaches an approved host
      // payment without ever passing through it — and used to leave every
      // seller invoiced and unpaid.
      const actorId = doc.reviewed_by ? String(doc.reviewed_by) : String(doc.requested_by ?? '');
      if (actorId) {
        for (const release of await ecommReleases(pod, actorId, doc.notes ?? '')) {
          await autoApprove(release, actorId);
        }
      }
    }
  } catch (e) {
    logs.server.warn('paymentRelease', 'sendProductInvoices', { error: e, msg: 'product invoices failed' });
  }
}

// Approval is the moment the pod is officially completed (first release wins).
// When this approval is the one that stamps it, the unsold stock is released
// and the monitored trail gets its COMPLETE entry.
async function completePodOnApproval(doc: IPaymentRelease) {
  const stamped = await PodModel.updateOne(
    { _id: doc.pod_id, completed_at: null },
    { $set: { completed_at: new Date() } }
  );
  if (stamped.modifiedCount === 0) return;
  // Completion frees the pod's unsold reserved stock back to the brand.
  const { podService } = await import('@modules/pods/pod/pod.service');
  await podService.releaseCompletedPodStock(doc.pod_id).catch((e: Error) => {
    logs.server.warn('paymentRelease', 'applyApproval', { error: e, msg: 'stock release failed' });
  });
  // A pod completed by a finance approval (rather than a host submission)
  // must still leave a COMPLETE entry in the monitored trail.
  const pod = await PodModel.findById(doc.pod_id).setOptions({ includeDeleted: true });
  if (!pod) return;
  const { podAuditService } = await import('@modules/pods/podAudit/podAudit.service');
  await podAuditService.record({
    pod,
    action: 'COMPLETE',
    source: 'SYSTEM',
    actorUserId: doc.reviewed_by ? String(doc.reviewed_by) : null,
    note: `Pod completed by ${doc.kind} payout approval (${doc.release_id})`,
  });
}

// Side effects of an APPROVED release — the wallet leg of every payout. Each
// kind credits ITS beneficiary's wallet: the host, the venue's owner user, or
// the club's admin user. Idempotent per release_id in the wallet service.
async function applyApproval(doc: IPaymentRelease) {
  await completePodOnApproval(doc);
  const payout = releasePayout(doc);
  const { walletService } = await import('@modules/finance/wallet/wallet.service');

  if (doc.kind === 'VENUE_BILLING') {
    // Venue money goes to the venue owner's wallet.
    const venue = doc.venue_id
      ? await VenueModel.findById(doc.venue_id).select('owner_user_id')
      : null;
    const ownerId = venue?.owner_user_id ? String(venue.owner_user_id) : null;
    if (ownerId) {
      await walletService.creditPodPayout(ownerId, payout, {
        pod_id: doc.pod_id,
        release_id: doc.release_id,
        reason: `Venue payout for ${doc.pod_title}`,
      });
    } else {
      // A venue without a linked owner user gets a statement but no wallet —
      // loud in the logs so Finance can fix the venue record, never silent.
      logs.server.warn('paymentRelease', 'applyApproval', {
        release_id: doc.release_id,
        msg: 'venue payout approved but the venue has no owner_user_id — wallet credit skipped',
      });
    }
    return;
  }

  if (doc.kind === 'CLUB_ADMIN') {
    // The club-admin cut goes to the club admin's wallet.
    if (doc.host_user_id) {
      await walletService.creditPodPayout(String(doc.host_user_id), payout, {
        pod_id: doc.pod_id,
        release_id: doc.release_id,
        reason: `Club admin payout for ${doc.pod_title}`,
      });
    }
    return;
  }

  if (doc.kind === 'ECOMM_PAYMENT') {
    // Product-sale money goes to the seller who listed the stock. Duncit
    // collected it from the buyer, so this is the leg that actually hands it
    // over — before this existed the seller only ever got an invoice.
    if (doc.host_user_id) {
      await walletService.creditPodPayout(String(doc.host_user_id), payout, {
        pod_id: doc.pod_id,
        release_id: doc.release_id,
        reason: `Product sales payout for ${doc.pod_title}`,
      });
    }
    return;
  }

  // HOST_PAYMENT: the host's money is credited to their wallet to withdraw later.
  if (doc.host_user_id) {
    await walletService.creditPodPayout(String(doc.host_user_id), payout, {
      pod_id: doc.pod_id,
      release_id: doc.release_id,
      reason: `Payout for ${doc.pod_title}`,
    });
  }
  await sendProductInvoices(doc);
}

/**
 * Approve a release without a manual Finance review — pod completion is the
 * trigger and the money moves automatically. The release keeps the full
 * approval trail (reviewer = the completing actor, reason recorded) so the
 * Finance portal history reads exactly like a manual approval.
 */
async function autoApprove(doc: IPaymentRelease, actorId: string) {
  doc.status = 'APPROVED';
  doc.approval_type = 'FULL';
  doc.approved_amount = doc.amount_requested;
  doc.approval_reason = 'Auto-approved on pod completion';
  doc.reviewed_by = new Types.ObjectId(actorId);
  doc.reviewed_at = new Date();
  await doc.save();
  await applyApproval(doc);
  await notifyApproval(doc);
}

export const paymentReleaseService = {
  async list(filter?: { status?: string | null; kind?: PaymentReleaseKind | null }) {
    const query: any = {};
    if (filter?.status) query.status = filter.status;
    if (filter?.kind) query.kind = filter.kind;
    const docs = await PaymentReleaseModel.find(query).sort({ created_at: -1 }).limit(300);
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the paymentReleaseRequestsTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IPaymentRelease>(
      PaymentReleaseModel,
      {},
      input,
      RELEASE_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
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
      // Completion frees the pod's unsold reserved stock back to the brand.
      const { podService } = await import('@modules/pods/pod/pod.service');
      await podService.releaseCompletedPodStock(pod._id).catch((e: Error) => {
        logs.server.warn('paymentRelease', 'create', { error: e, msg: 'stock release failed' });
      });
      // AI-monitored audit trail: completion is a critical pod action.
      const { podAuditService } = await import('@modules/pods/podAudit/podAudit.service');
      await podAuditService.record({
        pod,
        action: 'COMPLETE',
        source: actorId ? 'HOST' : 'SYSTEM',
        actorUserId: actorId,
        note: 'Pod submitted for completion / settlement',
      });
    }
    return toPub(doc);
  },

  async review(id: string, input: any, reviewerId?: string | null) {
    const doc = await PaymentReleaseModel.findById(id);
    if (!doc) throw new GraphQLError('Payment release request not found', { extensions: { code: 'NOT_FOUND' } });
    if (doc.status !== 'PENDING') {
      throw new GraphQLError('Only pending requests can be reviewed', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const { status, approvalType, amount, reason } = parseReviewInput(doc, input);
    doc.status = status;
    doc.approval_type = status === 'APPROVED' ? approvalType : null;
    doc.approved_amount = status === 'APPROVED' ? amount : 0;
    doc.approval_reason = reason;
    doc.reviewed_by = reviewerId ? new Types.ObjectId(reviewerId) : null;
    doc.reviewed_at = new Date();
    await doc.save();
    if (doc.status === 'APPROVED') {
      await applyApproval(doc);
    }
    await notifyApproval(doc);
    return toPub(doc);
  },

  /** Host (or admin) completes a pod: enter the venue bill amount + upload party
   * media, and the reconciled host/venue payout releases are created PENDING for
   * Finance to approve. Returns the computed settlement + the created releases. */
  async completePod(input: any, actor: { id: string; isAdmin: boolean }) {
    const pod = await PodModel.findById(input.pod_id);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const isHost = (pod.pod_hosts_id ?? []).some((id: any) => String(id) === actor.id);
    if (!isHost && !actor.isAdmin) {
      throw new GraphQLError('Only a host of this pod can complete it', { extensions: { code: 'FORBIDDEN' } });
    }

    // ANY live release on the pod blocks completion — not just the host leg. A
    // manual VENUE_BILLING release (the legacy Finance flow) already paid the
    // venue once; completing on top of it would mint a fresh release_id and pay
    // the venue a second time, past the wallet's per-release idempotency.
    const already = await PaymentReleaseModel.findOne({
      pod_id: pod._id,
      kind: { $in: ['HOST_PAYMENT', 'VENUE_BILLING', 'CLUB_ADMIN', 'ECOMM_PAYMENT'] },
      status: { $in: ['PENDING', 'APPROVED'] },
    });
    if (already) {
      throw new GraphQLError('This pod has already been submitted for completion', {
        extensions: { code: 'CONFLICT' },
      });
    }

    // What a release carries as evidence is the pod's OWN media — what the
    // host uploaded on the Upload Pod Media page and what the guests sent in
    // from the link they were given. The Admin panel completes with a list of
    // its own, and that is what it means there: a reviewer attaching what they
    // were sent out of band. Neither is required — a pod with no photos still
    // owes its host the money it took.
    const passed = (input.evidence_media ?? [])
      .map((media: any) => clean(media?.url || media))
      .filter(Boolean)
      .map((url: string) => ({ url, type: mediaType(url) }));
    const evidence =
      passed.length > 0
        ? passed
        : (pod.pod_party_media ?? []).map((media: any) => ({
            url: media.url,
            type: media.type ?? mediaType(media.url),
          }));

    // The chosen beneficiary's commission override prices the settlement — a
    // co-host with a negotiated rate must not settle at the primary host's %.
    const settlement = await computePodSettlement(
      String(pod._id),
      Number(input.venue_bill_amount) || 0,
      input.host_user_id ?? null
    );

    // A pod settles on the seats a host scanned in, so completing with nothing
    // scanned would pay everyone zero and freeze that as the answer — a
    // one-way mistake, since the release is what Finance later reviews. Refuse
    // it while it is still fixable. Only pods that HAD bookings are gated: a
    // pod nobody booked has nothing to scan and must still be completable.
    if (settlement.booked_seats > 0 && settlement.attended_seats === 0) {
      throw new GraphQLError(
        'No attendance has been recorded for this pod. Scan each guest’s ticket before completing it — the payout is calculated from who attended.',
        { extensions: { code: 'ATTENDANCE_REQUIRED' } }
      );
    }

    // The venue is now paid its full booked price rather than being clamped to
    // the pool, so a pod that took less at the door than the room cost leaves
    // the host side NEGATIVE. That is honest in the statement — the shortfall is
    // shown — but a release is money moving out, and a negative one would credit
    // a wallet backwards. Floor it: the host is owed nothing, never owes.
    // Recovering a shortfall is a separate decision, not a side effect of
    // completing a pod.
    const hostPayout = Math.max(0, settlement.host.payout_amount);

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
        amount_requested: hostPayout,
        bill_url: '',
        evidence_media: evidence,
        notes: clean(input.notes),
        requested_by: new Types.ObjectId(actor.id),
        requested_at: new Date(),
        breakdown: settlementToBreakdown(settlement, 'HOST'),
      })
    );

    if (settlement.has_venue && settlement.venue && settlement.venue.payout_amount > 0) {
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
          bill_url: '',
          evidence_media: [],
          notes: clean(input.notes),
          requested_by: new Types.ObjectId(actor.id),
          requested_at: new Date(),
          breakdown: settlementToBreakdown(settlement, 'VENUE'),
        })
      );
    }

    // The club-admin cut is disbursed to the club's admin user — best-effort:
    // a club without an admin keeps the cut inside Duncit revenue as before.
    if (settlement.waterfall.club_admin_amount > 0) {
      const clubAdmin = await clubAdminBeneficiary(pod);
      if (clubAdmin) {
        releases.push(
          await PaymentReleaseModel.create({
            release_id: releaseId(),
            kind: 'CLUB_ADMIN',
            pod_id: pod._id,
            pod_title: pod.pod_title,
            venue_id: null,
            host_user_id: clubAdmin.host_user_id,
            beneficiary_name: clubAdmin.name,
            beneficiary_email: clubAdmin.email,
            amount_requested: settlement.waterfall.club_admin_amount,
            bill_url: '',
            evidence_media: [],
            notes: clean(input.notes),
            requested_by: new Types.ObjectId(actor.id),
            requested_at: new Date(),
            breakdown: settlementToBreakdown(settlement, 'CLUB_ADMIN'),
          })
        );
      }
    }

    // Product sellers are paid on the same trigger, one release each for what
    // they actually sold on this pod.
    releases.push(...(await ecommReleases(pod, actor.id, clean(input.notes))));

    // Completion is the trigger: every payout is approved and credited to the
    // beneficiary wallets right here — host, venue owner, club admin and each
    // product seller — no manual Finance step in between. The releases stay as
    // the audit trail.
    for (const doc of releases) {
      await autoApprove(doc, actor.id);
    }

    // Leaderboard points for host, venue owner and club admin ride the same
    // trigger. Best-effort and idempotent inside the service — a points hiccup
    // must never fail a completion whose wallets are already credited.
    const { leaderboardService } = await import(
      '@modules/engagement/leaderboard/leaderboard.service'
    );
    await leaderboardService.awardForCompletedPod(pod, String(hostBeneficiary.host_user_id));

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

  /** A venue owner's payouts across every venue they own (Venue Earnings). */
  async listMineVenue(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const venues = await VenueModel.find({ owner_user_id: new Types.ObjectId(userId) }).select('_id');
    if (venues.length === 0) return [];
    const docs = await PaymentReleaseModel.find({
      kind: 'VENUE_BILLING',
      venue_id: { $in: venues.map((v) => v._id) },
    })
      .sort({ created_at: -1 })
      .limit(200);
    return docs.map(toPub);
  },
};