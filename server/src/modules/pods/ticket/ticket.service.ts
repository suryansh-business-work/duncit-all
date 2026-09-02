import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import crypto from 'node:crypto';
import { TicketModel, type ITicket } from './ticket.model';
import { markTicketPresent } from './attendance.service';
import { signTicketToken, verifyTicketToken } from './ticket.token';
import { ticketPdfFilename, ticketPdfUrl } from './ticket.download';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { generateTicketWithInvoicePdf } from '@services/ticket/ticket-with-invoice.pdf';
import type { InvoiceData } from '@services/invoice/invoice.pdf';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { invoiceDataForPayment } from '@modules/finance/payment/payment.invoice';
import { otpService } from '@modules/platform/otp/otp.service';
import type { PodCompanionDTO } from './ticket.validator';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import type { StoredMedia } from '@utils/media';
import { sendEmail } from '@services/email/email.service';
import { bookingLinkUrl, getUrlConfigs } from '@config/url-configs';
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

/** `+91 9876543210` from the split extension/number pair, '' when unset. */
const phoneLine = (extension: unknown, number: unknown) => {
  const digits = String(number ?? '').trim();
  if (!digits) return '';
  const ext = String(extension ?? '').trim();
  return ext ? `${ext} ${digits}` : digits;
};

/** Everything on file about the person the host just scanned. Joined here so
 * neither app has to know the user document's shape (or repeat the join).
 * Reads the legacy virtuals, so this needs a HYDRATED user doc, not `.lean()`. */
const toScannedAttendee = (user: any, membership: any) => {
  const address = user?.profile?.address ?? {};
  return {
    user_id: String(user._id),
    full_name: userName(user),
    profile_photo: user.profile_photo ?? '',
    profile_path: `/u/${String(user._id)}`,
    email: user.email ?? '',
    phone: phoneLine(user.phone_extension, user.phone_number),
    whatsapp: phoneLine(user.whatsapp_extension, user.whatsapp_number),
    bio: user.bio ?? '',
    address: [
      address.line1,
      address.line2,
      address.landmark,
      address.city,
      address.state,
      address.pincode,
      address.country,
    ]
      .filter(Boolean)
      .join(', '),
    city: user.city ?? '',
    joined_at: membership?.created_at?.toISOString?.() ?? null,
  };
};

/** A recorded companion, for the scan result and the admin roster. */
const toPubCompanion = (c: any) => ({
  name: c.name ?? '',
  phone_extension: c.phone_extension ?? null,
  phone_number: c.phone_number ?? '',
  added_at: c.added_at?.toISOString?.() ?? new Date(0).toISOString(),
  verified_at: c.verified_at?.toISOString?.() ?? null,
  verified_medium: c.verified_medium ?? '',
});

/**
 * One validated companion as it is stored, with its one-time code spent.
 *
 * Verifying a companion is OPTIONAL — a dead phone or a number abroad must
 * never hold a group at the door — so a row with no challenge is recorded
 * unverified. When the host DID verify one, spending it here is what stops the
 * same proof being replayed against the next person in the queue.
 */
async function toStoredCompanion(membership: any, companion: PodCompanionDTO) {
  const { otp_challenge_id: challengeId, ...rest } = companion;
  const base = { ...rest, added_at: new Date() };
  if (!challengeId) {
    return { ...base, verified_at: null, verified_medium: '', otp_challenge_id: null };
  }
  const challenge = await otpService.consume(challengeId, {
    purpose: 'POD_COMPANION',
    // Bound to the booking AND to the number it was raised for: one proof
    // proves one person, never the rest of the group.
    match: (c) =>
      String((c.context as any)?.membership_id ?? '') === String(membership._id) &&
      c.phone_number === rest.phone_number,
  });
  return {
    ...base,
    verified_at: challenge.verified_at ?? new Date(),
    verified_medium: challenge.mediums.join(','),
    otp_challenge_id: challenge._id,
  };
}

/**
 * The door's rule for a ticket that admits more than one person.
 *
 * A multi-seat booking is a number until someone writes down who it covers, and
 * the only moment those people are all standing there is the scan. So the scan
 * is two steps: the first returns the buyer and asks for the rest, the second
 * carries their names and phone numbers and only then marks attendance. The
 * ticket is NOT flipped in between — a half-checked-in group is worse than an
 * un-checked-in one.
 *
 * Single-seat tickets and legacy tickets (`seats` 1) never reach the gate, so
 * the ordinary scan is unchanged.
 *
 * @returns the number still needed, or 0 when the ticket may be checked in.
 */
async function recordCompanions(
  membership: any,
  seats: number,
  supplied: unknown
): Promise<number> {
  const needed = Math.max(seats - 1, 0);
  if (needed === 0 || !membership) return 0;
  const onFile: any[] = membership.companions ?? [];
  // The count asked for is what is still MISSING, not the ticket's total —
  // a booking whose seat count grew after some companions were recorded only
  // owes the door the difference.
  const remaining = needed - onFile.length;
  if (remaining <= 0) return 0;

  const list = Array.isArray(supplied) ? supplied : [];
  if (list.length === 0) return remaining;

  const { validate } = await import('@utils/validate');
  const { podCompanionsSchema } = await import('./ticket.validator');
  const { companions } = await validate(podCompanionsSchema, { companions: list });
  // Exactly, not "at least": a short list leaves people unaccounted for and a
  // long one admits more than the booking paid for.
  if (companions.length !== remaining) {
    throw new GraphQLError(
      `This ticket admits ${seats} — enter details for the other ${remaining} ${remaining === 1 ? 'person' : 'people'}`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
  membership.companions = [
    ...onFile,
    ...(await Promise.all(companions.map((c) => toStoredCompanion(membership, c)))),
  ];
  await membership.save();
  return 0;
}

const toPub = (t: ITicket) => ({
  id: String(t._id),
  ticket_code: t.ticket_code,
  membership_id: String(t.membership_id),
  pod_id: String(t.pod_id),
  user_id: String(t.user_id),
  payment_id: t.payment_id ? String(t.payment_id) : null,
  status: t.status,
  seats: t.seats ?? 1,
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

/** WhatsApp templates print the day and the clock time as two placeholders. */
const dateOnly = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium' }) : '';
const timeOnly = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { timeStyle: 'short' }) : '';

/** Where the pod happens, as a name. A virtual pod has no venue and names its
 * meeting platform instead — same substitution the ticket email makes, and the
 * value cannot be blank or the message is recorded FAILED and never sent. */
const placeLabel = (t: ITicket) =>
  t.snapshot?.pod_mode === 'VIRTUAL'
    ? t.snapshot?.meeting_platform || 'Online'
    : t.snapshot?.venue_name ?? '';

/** The ticket holder's account — the snapshot carries no phone number, and
 * without these two paths every send silently skips. */
const ticketRecipient = (t: ITicket) =>
  UserModel.findById(t.user_id).select(
    'profile.first_name profile.last_name auth.phone communication.whatsapp'
  );

/** The pod's host named, and the pod's own picture — one read, because the WhatsApp
 * leg needs both and they come off the same document. Host name is never blank,
 * for the same reason as placeLabel. */
async function podHostAndImage(
  podId: Types.ObjectId
): Promise<{ hostName: string; media: StoredMedia[] }> {
  const pod = await PodModel.findById(podId)
    .select('pod_hosts_id pod_images_and_videos')
    .lean();
  const host = await UserModel.findById((pod as any)?.pod_hosts_id?.[0])
    .select('profile.first_name profile.last_name')
    .lean();
  const profile = (host as any)?.profile;
  return {
    hostName: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'A host',
    media: ((pod as any)?.pod_images_and_videos ?? []) as StoredMedia[],
  };
}

/**
 * The booking confirmation on WhatsApp, beside the ticket email.
 *
 * Best-effort like everything else hanging off a paid-for booking: the funnel
 * itself never throws, but the account and host reads behind it can, and a
 * seat that is already paid for must not be lost to a message we could not
 * address.
 */
async function whatsappBookingConfirmed(t: ITicket, bookingUrl: string): Promise<void> {
  try {
    const [user, pod, pdfUrl] = await Promise.all([
      ticketRecipient(t),
      podHostAndImage(t.pod_id),
      ticketPdfUrl(String(t._id)),
    ]);
    await whatsappService.send({
      event: 'USER_BOOKING_SUCCESSFUL',
      entityId: String(t._id),
      user,
      name: t.snapshot?.user_name,
      // This message IS the ticket, so it carries the ticket — and the picture
      // of the pod it admits you to, for the day the template's header turns
      // out to be an image rather than a file. A send that names neither falls
      // all the way back to the platform default, which is the shared
      // placeholder that arrived beside real bookings as a file nobody could
      // open. The PDF is the same one the email attaches, behind a signed link
      // AiSensy can fetch.
      assets: {
        ...podImageAssets(pod.media),
        DOCUMENT: { url: pdfUrl, filename: ticketPdfFilename(t.ticket_code) },
      },
      params: [
        t.snapshot?.user_name,
        t.snapshot?.pod_title,
        t.snapshot?.pod_title,
        dateOnly(t.snapshot?.pod_date_time),
        timeOnly(t.snapshot?.pod_date_time),
        bookingUrl,
        pod.hostName,
      ],
    });
  } catch (err) {
    logs.server.error('ticket.service', 'whatsappBookingConfirmed', {
      error: err,
      msg: 'booking WhatsApp failed',
      ticket_code: t.ticket_code,
    });
  }
}

/**
 * The invoice that belongs on the back of this ticket, if there is one.
 *
 * Matched on pod + buyer rather than on a stored link, because a payment has
 * never carried the membership it created — and the newest successful payment
 * for that pair IS the one that bought this seat. A free join has no payment at
 * all, which is not a failure: that ticket is simply a one-page document.
 *
 * Best-effort on purpose. A ticket that cannot find its invoice must still
 * reach the door.
 */
async function invoiceForTicket(t: ITicket): Promise<InvoiceData | null> {
  try {
    // The ticket names its payment when it has one. Older tickets do not, and
    // for those the newest successful payment by that buyer for that pod IS the
    // one that bought the seat.
    const payment = t.payment_id
      ? await PaymentModel.findById(t.payment_id)
      : await PaymentModel.findOne({
          pod_id: t.pod_id,
          user_id: t.user_id,
          status: 'SUCCESS',
          invoice_no: { $ne: null },
        }).sort({ paid_at: -1, created_at: -1 });
    if (payment?.status !== 'SUCCESS' || !payment.invoice_no) return null;
    return await invoiceDataForPayment(payment, {
      paymentMethod: payment.gateway || 'Gateway',
      currencySymbol: payment.currency_symbol,
    });
  } catch (e) {
    logs.server.warn('ticket', 'invoiceForTicket', {
      error: e,
      msg: 'Could not attach an invoice to the ticket',
      ticket_code: t.ticket_code,
    });
    return null;
  }
}

async function pdfFor(t: ITicket): Promise<Buffer> {
  const fs = await getFinanceSettings();
  const invoice = await invoiceForTicket(t);
  return generateTicketWithInvoicePdf(
    {
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
      seats: t.seats ?? 1,
    },
    invoice
  );
}

/**
 * Tell the attendee their attendance was recorded.
 *
 * Attendance now decides what a completed pod pays out, so it is no longer a
 * private note the host keeps — the person it is about is told, and can say
 * something if it is wrong before completion freezes it. Best-effort: the scan
 * at the door is what counts, and a notification failure must never make a host
 * think the guest was not let in.
 */
export async function notifyAttendanceMarked(ticket: ITicket): Promise<void> {
  try {
    const [{ notificationService }, { PodModel }] = await Promise.all([
      import('@modules/engagement/notification/notification.service'),
      import('@modules/pods/pod/pod.model'),
    ]);
    const pod = await PodModel.findById(ticket.pod_id)
      .select('pod_title pod_images_and_videos')
      .lean();
    await notificationService.create({
      title: 'Attendance marked',
      body: `Your attendance is marked for ${(pod as any)?.pod_title ?? 'this pod'}.`,
      link_url: `/pod/${String(ticket.pod_id)}`,
      scope: 'USER',
      target_user_ids: [String(ticket.user_id)],
    });
    const [user, { appUrl }] = await Promise.all([ticketRecipient(ticket), getUrlConfigs()]);
    // The written record. The in-app note is read once and scrolls away, and
    // WhatsApp only reaches an opted-in number — but the pod's payout is split
    // on exactly who is marked, so the person it is about needs something they
    // can go back to while there is still time to say it is wrong.
    await sendEmail({
      to: ticket.snapshot?.user_email,
      subject: `Attendance marked — ${ticket.snapshot?.pod_title ?? 'your pod'}`,
      template: 'attendance-marked',
      category: 'notification',
      vars: {
        name: ticket.snapshot?.user_name ?? 'there',
        pod_title: ticket.snapshot?.pod_title ?? 'Your pod',
        marked_at: dateLabel(ticket.checked_in_at?.toISOString()),
        place_line: placeLabel(ticket) || '—',
        ticket_code: ticket.ticket_code,
        seats_count: String(ticket.seats ?? 1),
        booking_url: bookingLinkUrl(appUrl, String(ticket.membership_id)),
      },
    });
    await whatsappService.send({
      event: 'USER_POD_ATTENDANCE',
      entityId: String(ticket._id),
      user,
      name: ticket.snapshot?.user_name,
      // The pod this attendance is for, pictured — the same asset every other
      // pod-shaped message carries, rather than the platform placeholder.
      assets: podImageAssets((pod as any)?.pod_images_and_videos),
      params: [
        ticket.snapshot?.user_name,
        ticket.snapshot?.pod_title,
        ticket.snapshot?.pod_title,
        dateOnly(ticket.snapshot?.pod_date_time),
        timeOnly(ticket.snapshot?.pod_date_time),
        placeLabel(ticket),
        appUrl,
      ],
    });
  } catch (err) {
    logs.server.error('ticket.service', 'notifyAttendanceMarked', {
      error: err,
      msg: 'attendance notification failed',
      ticket_id: String((ticket as any)?._id ?? ''),
    });
  }
}

/**
 * The second half of a host's scan, once the ticket is known to be tonight's
 * and not cancelled: sync the seat count from the booking, collect the rest of
 * the group if the ticket admits more than one, then mark attendance (or, for
 * a ticket already marked, just say so). Hoisted out of `hostScan` so the
 * door's rejections and the admission each read as one step.
 */
async function completeHostScan(t: ITicket, hostUserId: string, companions: unknown) {
  const [user, membership] = await Promise.all([
    UserModel.findById(t.user_id),
    PodMemberModel.findById(t.membership_id),
  ]);
  const alreadyCheckedIn = t.status === 'CHECKED_IN';
  // The booking is the source of truth for how many it covers; the ticket is a
  // snapshot. Re-sync so a ticket can never tell the door "admits 3" while the
  // membership says 2.
  const seats = membership?.seats ?? t.seats ?? 1;
  if (t.seats !== seats) {
    t.seats = seats;
    await t.save();
  }
  const attendee = user ? toScannedAttendee(user, membership) : null;

  // Ask for the rest of the group BEFORE marking anyone present. The attendee
  // still comes back so the host can see who they are talking to while they
  // collect the names.
  if (!alreadyCheckedIn) {
    const stillNeeded = await recordCompanions(membership, seats, companions);
    if (stillNeeded > 0) {
      return {
        ok: false,
        message: `This ticket admits ${seats} — add the other ${stillNeeded} ${stillNeeded === 1 ? 'person' : 'people'} to mark attendance`,
        already_checked_in: false,
        requires_companions: true,
        companions_required: stillNeeded,
        ticket: toPub(t),
        attendee,
        companions: (membership?.companions ?? []).map(toPubCompanion),
      };
    }
    // The scan IS the proof, so it carries no OTP verification — but it is
    // still stamped with its method, so the roster can say how each person
    // came to be marked.
    await markTicketPresent(t, hostUserId, 'HOST_SCAN');
    await notifyAttendanceMarked(t);
  }

  const at = t.checked_in_at ? ` at ${t.checked_in_at.toLocaleString('en-IN')}` : '';
  // A multi-seat ticket admits a group, so the host is told the number —
  // one scan, several people through the door.
  const party = seats > 1 ? ` · admits ${seats}` : '';
  return {
    ok: true,
    message: alreadyCheckedIn
      ? `Already marked present${at}${party}`
      : `Attendance marked${party}`,
    already_checked_in: alreadyCheckedIn,
    requires_companions: false,
    companions_required: 0,
    ticket: toPub(t),
    attendee,
    companions: (membership?.companions ?? []).map(toPubCompanion),
  };
}

export const ticketService = {
  toPub,

  /** Issue (idempotently) a ticket for a confirmed membership + email it. Safe to
   * call from every join path — returns the existing ticket if already issued.
   *
   * A `session` joins the payment finalizer's transaction, so the ticket and the
   * membership it admits are written together: a booking can no longer commit
   * with no ticket behind it. Every read here carries the session too, or it
   * would look outside the snapshot and miss the membership just created. */
  async ensureForMembership(membershipId: string, session?: ClientSession): Promise<ITicket | null> {
    const existing = await TicketModel.findOne({ membership_id: new Types.ObjectId(membershipId) })
      .session(session ?? null);
    if (existing) return existing;

    const membership = await PodMemberModel.findById(membershipId).session(session ?? null);
    if (!membership) return null;
    const [pod, user] = await Promise.all([
      PodModel.findById(membership.pod_id).session(session ?? null),
      UserModel.findById(membership.user_id).session(session ?? null),
    ]);
    if (!pod || !user) return null;
    const venue = (pod as any).venue_id
      ? await VenueModel.findById((pod as any).venue_id).session(session ?? null)
      : null;

    const ticket_code = newTicketCode();
    // The array form is required with a session (and returns an array).
    const [doc] = await TicketModel.create(
      [
        {
          ticket_code,
          membership_id: membership._id,
          pod_id: pod._id,
          user_id: user._id,
          payment_id: (membership as any).payment_id ?? null,
          status: 'VALID',
          // One ticket per booking, admitting however many seats it holds.
          seats: (membership as any).seats ?? 1,
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
        },
      ],
      { session }
    );

    doc.qr_token = signTicketToken({
      t: ticket_code,
      u: String(user._id),
      p: String(pod._id),
      m: String(membership._id),
    });
    await doc.save({ session });

    // NEVER inside a caller's transaction. A PDF + SMTP send is not rollback-able:
    // `withTransaction` retries its callback on a write conflict, so an in-transaction
    // send mails one ticket per attempt (each with a different code), and an abort
    // later in the sequence ships a live-looking ticket for a booking that does not
    // exist. The payment finalizer owns the send as a deferred, retried step; the
    // session-less join paths still mail it here.
    if (!session) {
      this.email(doc).catch((e) =>
        logs.server.warn('ticket', 'ensureForMembership', {
          error: e,
          msg: 'Ticket email failed',
          ticket_code,
          membership_id: String(membership._id),
        })
      );
    }
    return doc;
  },

  /** Mail an already-issued ticket by id. The deferred half of the rule above:
   * the payment finalizer calls this after the booking core has committed. */
  async emailById(ticketDocId: string): Promise<void> {
    const t = await TicketModel.findById(ticketDocId);
    if (!t) throw new GraphQLError('Ticket not found', { extensions: { code: 'NOT_FOUND' } });
    await this.email(t);
  },

  async email(t: ITicket) {
    const pdf = await pdfFor(t);
    const urls = await getUrlConfigs();
    // A free join never reaches the payment finalizer, so this is the ONLY booking
    // email such a member gets — without the deep link the whole feature is
    // invisible on free pods.
    const bookingUrl = bookingLinkUrl(urls.appUrl, String(t.membership_id));
    const venueLine =
      t.snapshot?.pod_mode === 'VIRTUAL'
        ? t.snapshot?.meeting_platform || 'Online'
        : [t.snapshot?.venue_name, t.snapshot?.venue_address].filter(Boolean).join(', ') || '—';
    await sendEmail({
      to: t.snapshot?.user_email,
      subject: `Your ticket — ${t.snapshot?.pod_title}`,
      template: 'event-ticket',
      category: 'transactional',
      vars: {
        name: t.snapshot?.user_name ?? 'there',
        event_title: t.snapshot?.pod_title ?? 'Event',
        date_label: dateLabel(t.snapshot?.pod_date_time),
        venue_line: venueLine,
        ticket_code: t.ticket_code,
        // How many people this one ticket lets in. For a free multi-seat join
        // this email is the ONLY record the buyer gets — no payment, so no
        // invoice — which is why the count has to be in the body, not just the
        // attached PDF.
        seats_count: String(t.seats ?? 1),
        booking_url: bookingUrl,
        // Templates already cached in the DB still carry the old `{{app_url}}`
        // CTA, so it has to resolve to the same deep link (the disk template is
        // only imported once, never re-synced). Same alias as payment-receipt.
        app_url: bookingUrl,
      },
      attachments: [
        {
          filename: ticketPdfFilename(t.ticket_code),
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });
    await whatsappBookingConfirmed(t, bookingUrl);
  },

  /**
   * The ticket PDF behind a public, signed link.
   *
   * It takes no requester because there is none: by the time this is called the
   * link has already been proved ours and unexpired, which is the whole
   * authorisation (see ticket.download.ts). A ticket that is gone answers null
   * rather than throwing — the route turns every failure into the same 404.
   */
  async pdfForLink(ticketDocId: string): Promise<{ pdf: Buffer; filename: string } | null> {
    if (!Types.ObjectId.isValid(ticketDocId)) return null;
    const t = await TicketModel.findById(ticketDocId);
    if (!t) return null;
    return { pdf: await pdfFor(t), filename: ticketPdfFilename(t.ticket_code) };
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
    // where the membership pre-existed the paid join (so the finalizer's pod leg
    // reused it) and any post-payment race before the email side-effect runs.
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

  /**
   * A host scanning a ticket at the door of their own pod. Same effect as the
   * admin check-in, but authorised by pod ownership rather than an admin role —
   * and it answers with the attendee, because the point of the scan is to know
   * who just walked in, not only that the code was valid.
   *
   * Never throws for a bad code: a scanner points at whatever is in front of it,
   * so an unreadable/foreign/cancelled ticket is a result to show, not an error
   * that tears down the camera screen.
   */
  async hostScan(podDocId: string, token: string, hostUserId: string, companions?: unknown) {
    const { findHostedPod } = await import('@modules/pods/pod/pod.service');
    await findHostedPod(podDocId, hostUserId);

    const payload = verifyTicketToken(token);
    if (!payload) {
      return { ok: false, message: 'Invalid or tampered QR code', already_checked_in: false, requires_companions: false, companions_required: 0, companions: [], ticket: null, attendee: null };
    }
    const t = await TicketModel.findOne({ ticket_code: payload.t });
    if (!t) {
      return { ok: false, message: 'Ticket not found', already_checked_in: false, requires_companions: false, companions_required: 0, companions: [], ticket: null, attendee: null };
    }
    // Scanning at the wrong pod's door is the mistake this catches — the token
    // is perfectly valid, just not for tonight.
    if (String(t.pod_id) !== String(podDocId)) {
      const otherPod = t.snapshot?.pod_title ? ` — ${t.snapshot.pod_title}` : '';
      return {
        ok: false,
        message: `This ticket is for another pod${otherPod}`,
        already_checked_in: false,
        // Every field the schema marks non-null, or this branch nulls one and
        // the whole result errors instead of showing the message.
        requires_companions: false,
        companions_required: 0,
        companions: [],
        ticket: toPub(t),
        attendee: null,
      };
    }
    if (t.status === 'CANCELLED') {
      return { ok: false, message: 'Ticket cancelled', already_checked_in: false, requires_companions: false, companions_required: 0, companions: [], ticket: toPub(t), attendee: null };
    }
    return completeHostScan(t, hostUserId, companions);
  },

  /** Mark a ticket checked-in (by scanned token or by id). Idempotent. */
  async checkIn(
    input: { token?: string | null; ticket_doc_id?: string | null; companions?: unknown },
    adminId: string
  ) {
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
      // The same gate as the host's scanner — an admin marking a group present
      // must account for the group too, or the roster stays a bare number.
      const membership = await PodMemberModel.findById(t.membership_id);
      const seats = membership?.seats ?? t.seats ?? 1;
      const stillNeeded = await recordCompanions(membership, seats, input.companions);
      if (stillNeeded > 0) {
        throw new GraphQLError(
          `This ticket admits ${seats} — add the other ${stillNeeded} ${stillNeeded === 1 ? 'person' : 'people'} to mark attendance`,
          { extensions: { code: 'COMPANIONS_REQUIRED', companions_required: stillNeeded } }
        );
      }
      await markTicketPresent(t, adminId, 'ADMIN');
      await notifyAttendanceMarked(t);
    }
    return toPub(t);
  },

  /**
   * Club Admin marks a member present WITHOUT a scan.
   *
   * The host's path is deliberately QR-only: a scan is proof the person was at
   * the door. This is the override for when that proof cannot be produced — a
   * dead phone, a lost ticket — and it is limited to the club's admin, who is
   * accountable for the club rather than for this pod's payout. The host, who
   * IS paid on the result, can never mark someone present by hand.
   *
   * Every forced mark is stamped with who forced it (`checked_in_by`) and the
   * member is notified, so it is contestable rather than silent.
   */
  async clubAdminForceAttendance(
    podDocId: string,
    membershipId: string,
    actor: { id: string; roles: string[] }
  ) {
    const { clubAdminService } = await import('@modules/clubs/clubAdmin/clubAdmin.service');
    await clubAdminService.assertClubAdminForPod(actor as any, podDocId);

    if (!Types.ObjectId.isValid(membershipId)) {
      throw new GraphQLError('Invalid member', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const membership = await PodMemberModel.findOne({
      _id: new Types.ObjectId(membershipId),
      pod_id: new Types.ObjectId(podDocId),
      status: 'JOINED',
    });
    if (!membership) {
      throw new GraphQLError('This member is not on the pod', { extensions: { code: 'NOT_FOUND' } });
    }

    const t = await TicketModel.findOne({ membership_id: membership._id });
    if (!t) throw new GraphQLError('Ticket not found', { extensions: { code: 'NOT_FOUND' } });
    if (t.status === 'CANCELLED') {
      throw new GraphQLError('Ticket is cancelled', { extensions: { code: 'BAD_REQUEST' } });
    }
    if (t.status === 'CHECKED_IN') return toPub(t);

    await markTicketPresent(t, actor.id, 'CLUB_ADMIN_FORCE');
    await notifyAttendanceMarked(t);
    logs.server.info('ticket.service', 'clubAdminForceAttendance', {
      msg: 'attendance forced without a scan',
      pod_doc_id: podDocId,
      membership_id: membershipId,
      actor_id: actor.id,
    });
    return toPub(t);
  },
};
