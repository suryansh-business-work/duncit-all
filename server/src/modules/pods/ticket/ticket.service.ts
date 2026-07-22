import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import crypto from 'node:crypto';
import { TicketModel, type ITicket } from './ticket.model';
import { signTicketToken, verifyTicketToken } from './ticket.token';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { generateTicketPdf } from '@services/ticket/ticket.pdf';
import { sendEmail } from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';

const newTicketCode = () =>
  `TKT-${Date.now().toString(36).toUpperCase().slice(-5)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

const userName = (u: any) =>
  [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() || u?.email || 'Guest';

const venueAddress = (v: any) =>
  [v.address_line1, v.address_line2, v.locality, v.city, v.state, v.postal_code, v.country]
    .filter(Boolean)
    .join(', ');

const toPub = (t: ITicket) => ({
  id: String(t._id),
  ticket_code: t.ticket_code,
  membership_id: String(t.membership_id),
  pod_id: String(t.pod_id),
  user_id: String(t.user_id),
  payment_id: t.payment_id ? String(t.payment_id) : null,
  status: t.status,
  checked_in_at: t.checked_in_at ? t.checked_in_at.toISOString() : null,
  qr_token: t.qr_token,
  pod_title: t.snapshot?.pod_title ?? '',
  pod_date_time: t.snapshot?.pod_date_time ?? null,
  pod_end_date_time: t.snapshot?.pod_end_date_time ?? null,
  pod_mode: t.snapshot?.pod_mode ?? 'PHYSICAL',
  meeting_platform: t.snapshot?.meeting_platform ?? null,
  venue_name: t.snapshot?.venue_name ?? null,
  venue_address: t.snapshot?.venue_address ?? null,
  zone_name: t.snapshot?.zone_name ?? null,
  user_name: t.snapshot?.user_name ?? '',
  user_email: t.snapshot?.user_email ?? '',
  created_at: t.created_at.toISOString(),
  updated_at: t.updated_at.toISOString(),
});

/** Allowlists for the shared table engine (eventTicketsTable — DUNCIT TABLE
 * CONTRACT v1). Search spans the same code/attendee/event fields as listAdmin.
 * snapshot.pod_date_time is stored as an ISO string, so it sorts fine but is
 * deliberately NOT a date filter. */
const EVENT_TICKET_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['ticket_code', 'snapshot.user_name', 'snapshot.user_email', 'snapshot.pod_title'],
  sortFields: {
    ticket_code: 'ticket_code',
    status: 'status',
    pod_title: 'snapshot.pod_title',
    pod_date_time: 'snapshot.pod_date_time',
    user_name: 'snapshot.user_name',
    user_email: 'snapshot.user_email',
    checked_in_at: 'checked_in_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    pod_id: { type: 'string' },
    user_id: { type: 'string' },
    status: { type: 'enum' },
    checked_in_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const dateLabel = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }) : 'Date pending';

async function pdfFor(t: ITicket): Promise<Buffer> {
  const fs = await getFinanceSettings();
  return generateTicketPdf({
    brand: fs.business_name,
    ticket_code: t.ticket_code,
    status: t.status,
    qr_token: t.qr_token,
    event_title: t.snapshot?.pod_title ?? 'Event',
    date_label: dateLabel(t.snapshot?.pod_date_time),
    mode: t.snapshot?.pod_mode ?? 'PHYSICAL',
    venue_name: t.snapshot?.venue_name ?? null,
    venue_address: t.snapshot?.venue_address ?? null,
    meeting_platform: t.snapshot?.meeting_platform ?? null,
    attendee_name: t.snapshot?.user_name ?? '',
    attendee_email: t.snapshot?.user_email ?? '',
  });
}

export const ticketService = {
  toPub,

  /** Issue (idempotently) a ticket for a confirmed membership + email it. Safe to
   * call from every join path — returns the existing ticket if already issued. */
  async ensureForMembership(membershipId: string): Promise<ITicket | null> {
    const existing = await TicketModel.findOne({ membership_id: new Types.ObjectId(membershipId) });
    if (existing) return existing;

    const membership = await PodMemberModel.findById(membershipId);
    if (!membership) return null;
    const [pod, user] = await Promise.all([
      PodModel.findById(membership.pod_id),
      UserModel.findById(membership.user_id),
    ]);
    if (!pod || !user) return null;
    const venue = (pod as any).venue_id ? await VenueModel.findById((pod as any).venue_id) : null;

    const ticket_code = newTicketCode();
    const doc = await TicketModel.create({
      ticket_code,
      membership_id: membership._id,
      pod_id: pod._id,
      user_id: user._id,
      payment_id: (membership as any).payment_id ?? null,
      status: 'VALID',
      qr_token: '',
      snapshot: {
        pod_title: (pod as any).pod_title,
        pod_date_time: (pod as any).pod_date_time?.toISOString?.() ?? null,
        pod_end_date_time: (pod as any).pod_end_date_time?.toISOString?.() ?? null,
        pod_mode: (pod as any).pod_mode ?? 'PHYSICAL',
        meeting_platform: (pod as any).meeting_platform ?? null,
        venue_name: venue ? (venue as any).venue_name : null,
        venue_address: venue ? venueAddress(venue) : null,
        zone_name: (pod as any).zone_name ?? null,
        user_name: userName(user),
        user_email: (user as any).email ?? '',
      },
    });

    doc.qr_token = signTicketToken({
      t: ticket_code,
      u: String(user._id),
      p: String(pod._id),
      m: String(membership._id),
    });
    await doc.save();

    this.email(doc).catch((e) =>
      logs.server.warn('ticket', 'ensureForMembership', {
        error: e,
        msg: 'Ticket email failed',
        ticket_code,
        membership_id: String(membership._id),
      })
    );
    return doc;
  },

  async email(t: ITicket) {
    const pdf = await pdfFor(t);
    const urls = await getUrlConfigs();
    const venueLine =
      t.snapshot?.pod_mode === 'VIRTUAL'
        ? t.snapshot?.meeting_platform || 'Online'
        : [t.snapshot?.venue_name, t.snapshot?.venue_address].filter(Boolean).join(', ') || '—';
    await sendEmail({
      to: t.snapshot?.user_email,
      subject: `Your ticket — ${t.snapshot?.pod_title}`,
      template: 'event-ticket',
      vars: {
        name: t.snapshot?.user_name ?? 'there',
        event_title: t.snapshot?.pod_title ?? 'Event',
        date_label: dateLabel(t.snapshot?.pod_date_time),
        venue_line: venueLine,
        ticket_code: t.ticket_code,
        app_url: urls.appUrl,
      },
      attachments: [
        {
          filename: `ticket-${t.ticket_code}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });
  },

  async pdfBase64(ticketDocId: string, requesterId: string, isAdmin: boolean) {
    const t = await TicketModel.findById(ticketDocId);
    if (!t) throw new GraphQLError('Ticket not found', { extensions: { code: 'NOT_FOUND' } });
    if (!isAdmin && String(t.user_id) !== String(requesterId))
      throw new GraphQLError('Not your ticket', { extensions: { code: 'FORBIDDEN' } });
    return (await pdfFor(t)).toString('base64');
  },

  async listForUser(userId: string) {
    const docs = await TicketModel.find({ user_id: new Types.ObjectId(userId) }).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  async forPodAndUser(podDocId: string, userId: string) {
    let t: ITicket | null = await TicketModel.findOne({
      pod_id: new Types.ObjectId(podDocId),
      user_id: new Types.ObjectId(userId),
    });
    // Issue-on-demand: a JOINED member always has a ticket. This covers the case
    // where the membership pre-existed the paid join (so recordPaidJoin skipped
    // issuance) and any post-payment race before the email side-effect runs.
    if (!t) {
      const membership = await PodMemberModel.findOne({
        pod_id: new Types.ObjectId(podDocId),
        user_id: new Types.ObjectId(userId),
        status: 'JOINED',
      });
      if (membership) t = await this.ensureForMembership(String(membership._id));
    }
    return t ? toPub(t) : null;
  },

  async getById(id: string) {
    const t = await TicketModel.findById(id);
    return t ? toPub(t) : null;
  },

  async listAdmin(filter?: { pod_id?: string; status?: string; search?: string }) {
    const q: any = {};
    if (filter?.pod_id) q.pod_id = new Types.ObjectId(filter.pod_id);
    if (filter?.status) q.status = filter.status;
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      q.$or = [{ ticket_code: r }, { 'snapshot.user_name': r }, { 'snapshot.user_email': r }, { 'snapshot.pod_title': r }];
    }
    const docs = await TicketModel.find(q).sort({ created_at: -1 }).limit(500);
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the
   * eventTicketsTable query — same rows as listAdmin, without its 500 cap. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ITicket>(
      TicketModel,
      {},
      input,
      EVENT_TICKET_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /** Decode + verify a scanned QR token without mutating. */
  async verify(token: string) {
    const payload = verifyTicketToken(token);
    if (!payload) return { ok: false, message: 'Invalid or tampered QR code', ticket: null };
    const t = await TicketModel.findOne({ ticket_code: payload.t });
    if (!t) return { ok: false, message: 'Ticket not found', ticket: null };
    if (t.status === 'CANCELLED') return { ok: false, message: 'Ticket cancelled', ticket: toPub(t) };
    if (t.status === 'CHECKED_IN') {
      const at = t.checked_in_at ? ` at ${t.checked_in_at.toLocaleString('en-IN')}` : '';
      return { ok: true, message: `Already checked in${at}`, ticket: toPub(t) };
    }
    return { ok: true, message: 'Valid ticket', ticket: toPub(t) };
  },

  /** Mark a ticket checked-in (by scanned token or by id). Idempotent. */
  async checkIn(input: { token?: string | null; ticket_doc_id?: string | null }, adminId: string) {
    let t: ITicket | null = null;
    if (input.token) {
      const payload = verifyTicketToken(input.token);
      if (!payload) throw new GraphQLError('Invalid or tampered QR code', { extensions: { code: 'BAD_USER_INPUT' } });
      t = await TicketModel.findOne({ ticket_code: payload.t });
    } else if (input.ticket_doc_id) {
      t = await TicketModel.findById(input.ticket_doc_id);
    }
    if (!t) throw new GraphQLError('Ticket not found', { extensions: { code: 'NOT_FOUND' } });
    if (t.status === 'CANCELLED')
      throw new GraphQLError('Ticket is cancelled', { extensions: { code: 'BAD_REQUEST' } });
    if (t.status !== 'CHECKED_IN') {
      t.status = 'CHECKED_IN';
      t.checked_in_at = new Date();
      t.checked_in_by = new Types.ObjectId(adminId);
      await t.save();
    }
    return toPub(t);
  },
};
