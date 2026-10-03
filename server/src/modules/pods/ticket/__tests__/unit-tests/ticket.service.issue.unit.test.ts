/**
 * Issuing a ticket and sending it. Every model and outbound service is faked;
 * the QR signing is real. What is under test is the idempotent issue (and that
 * it joins a caller's transaction without ever mailing from inside it), the
 * snapshot a ticket freezes, the ticket email and its WhatsApp twin, the PDF's
 * inputs, and how the invoice on the back of the ticket is found — or quietly
 * left off.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('../../ticket.model', () => ({
  TicketModel: { findOne: jest.fn(), findById: jest.fn(), find: jest.fn(), create: jest.fn() },
}));
jest.mock('../../attendance.service', () => ({
  attendanceLock: jest.fn(),
  consumeAttendanceProof: jest.fn(),
  markTicketPresent: jest.fn(),
}));
jest.mock('../../ticket.download', () => ({
  ticketPdfFilename: (code: string) => `ticket-${code}.pdf`,
  ticketPdfUrl: jest.fn(),
}));
jest.mock('@modules/pods/podMember/podMember.model', () => ({
  PodMemberModel: { findById: jest.fn(), findOne: jest.fn() },
}));
jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: { findById: jest.fn() } }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));
jest.mock('@modules/venues/venue/venue.model', () => ({ VenueModel: { findById: jest.fn() } }));
jest.mock('@modules/finance/finance/finance.model', () => ({ getFinanceSettings: jest.fn() }));
jest.mock('@services/ticket/ticket-with-invoice.pdf', () => ({ generateTicketWithInvoicePdf: jest.fn() }));
jest.mock('@modules/finance/payment/payment.model', () => ({
  PaymentModel: { findById: jest.fn(), findOne: jest.fn() },
}));
jest.mock('@modules/finance/payment/payment.invoice', () => ({ invoiceDataForPayment: jest.fn() }));
jest.mock('@modules/platform/otp/otp.service', () => ({ otpService: { consume: jest.fn() } }));
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({ whatsappService: { send: jest.fn() } }));
jest.mock('@modules/platform/whatsapp/whatsapp.assets', () => ({ podImageAssets: jest.fn(() => ({})) }));
jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn() }));
jest.mock('@config/url-configs', () => ({
  getUrlConfigs: jest.fn(),
  bookingLinkUrl: (app: string, id: string) => `${app}/booking/${id}`,
}));
jest.mock('@utils/table-query', () => ({ runTableQuery: jest.fn() }));

import { logs } from '@observability/log';
import { TicketModel } from '../../ticket.model';
import { ticketPdfUrl } from '../../ticket.download';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { generateTicketWithInvoicePdf } from '@services/ticket/ticket-with-invoice.pdf';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { invoiceDataForPayment } from '@modules/finance/payment/payment.invoice';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { sendEmail } from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { verifyTicketToken } from '../../ticket.token';
import { ticketService } from '../../ticket.service';

const ticketFindOne = TicketModel.findOne as jest.Mock;
const ticketFindById = TicketModel.findById as jest.Mock;
const ticketCreate = TicketModel.create as jest.Mock;
const pdfUrl = ticketPdfUrl as jest.Mock;
const memberFindById = PodMemberModel.findById as jest.Mock;
const podFindById = PodModel.findById as jest.Mock;
const userFindById = UserModel.findById as jest.Mock;
const venueFindById = VenueModel.findById as jest.Mock;
const financeSettings = getFinanceSettings as jest.Mock;
const generatePdf = generateTicketWithInvoicePdf as jest.Mock;
const paymentFindById = PaymentModel.findById as jest.Mock;
const paymentFindOne = PaymentModel.findOne as jest.Mock;
const invoiceData = invoiceDataForPayment as jest.Mock;
const waSend = whatsappService.send as jest.Mock;
const imageAssets = podImageAssets as jest.Mock;
const email = sendEmail as jest.Mock;
const urls = getUrlConfigs as jest.Mock;
const logWarn = logs.server.warn as jest.Mock;
const logError = logs.server.error as jest.Mock;

const oid = (n: number) => new Types.ObjectId(`65f6000000000000000000${String(n).padStart(2, '0')}`);
const POD = oid(1);
const USER = oid(2);
const MEMBERSHIP = oid(3);
const TICKET = oid(4);
const VENUE = oid(5);
const PAYMENT = oid(6);
const HOST = oid(7);
const PDF = Buffer.from('%PDF-fake-ticket');
const SESSION = { id: 'fake-session' } as any;

/** A mongoose query stand-in: awaitable and chainable through every helper used. */
const q = (value: unknown) => {
  const chain: any = {
    session: jest.fn(() => chain),
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    lean: jest.fn(() => Promise.resolve(value)),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(value).then(res, rej),
  };
  return chain;
};

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await new Promise((r) => setImmediate(r));
};

const makeTicket = (over: Record<string, unknown> = {}) => ({
  _id: TICKET,
  ticket_code: 'TKT-ISSUE1',
  membership_id: MEMBERSHIP,
  pod_id: POD,
  user_id: USER,
  payment_id: null as Types.ObjectId | null,
  status: 'VALID',
  seats: 2,
  checked_in_at: null,
  qr_token: 'qr',
  snapshot: {
    pod_title: 'Sunday Run',
    pod_date_time: '2026-11-01T12:30:00.000Z',
    pod_mode: 'PHYSICAL',
    venue_name: 'Park Gate',
    venue_address: 'MG Road, Pune',
    meeting_platform: null,
    user_name: 'Asha Rao',
    user_email: 'asha@example.test',
  },
  created_at: new Date('2026-10-20T09:00:00.000Z'),
  updated_at: new Date('2026-10-20T09:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

const paymentDoc = (over: Record<string, unknown> = {}) => ({
  _id: PAYMENT,
  status: 'SUCCESS',
  invoice_no: 'INV-0001',
  gateway: 'Razorpay',
  currency_symbol: '₹',
  ...over,
});

beforeEach(() => {
  financeSettings.mockResolvedValue({ business_name: 'Duncit Test Co' });
  generatePdf.mockResolvedValue(PDF);
  urls.mockResolvedValue({ appUrl: 'https://app.example.test' });
  pdfUrl.mockResolvedValue('https://api.example.test/tickets/signed/ticket.pdf');
  email.mockResolvedValue(undefined);
  waSend.mockResolvedValue({ status: 'SENT' });
  paymentFindOne.mockReturnValue(q(null));
  userFindById.mockImplementation(() => q({ _id: USER, profile: { first_name: 'Hari', last_name: 'Host' } }));
  podFindById.mockImplementation(() => q({ pod_hosts_id: [HOST], pod_images_and_videos: [] }));
});

describe('ticketService.ensureForMembership', () => {
  it('returns the ticket already issued for the booking, inside the caller’s session', async () => {
    const existing = makeTicket();
    const query = q(existing);
    ticketFindOne.mockReturnValue(query);

    await expect(ticketService.ensureForMembership(String(MEMBERSHIP), SESSION)).resolves.toBe(existing);

    expect(ticketFindOne).toHaveBeenCalledWith({ membership_id: MEMBERSHIP });
    expect(query.session).toHaveBeenCalledWith(SESSION);
    expect(memberFindById).not.toHaveBeenCalled();
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it('returns null for a booking that does not exist', async () => {
    ticketFindOne.mockReturnValue(q(null));
    memberFindById.mockReturnValue(q(null));

    await expect(ticketService.ensureForMembership(String(MEMBERSHIP))).resolves.toBeNull();
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it('returns null when the pod or the buyer is gone', async () => {
    ticketFindOne.mockReturnValue(q(null));
    memberFindById.mockReturnValue(q({ _id: MEMBERSHIP, pod_id: POD, user_id: USER }));
    podFindById.mockReturnValueOnce(q(null));
    userFindById.mockReturnValueOnce(q({ _id: USER }));

    await expect(ticketService.ensureForMembership(String(MEMBERSHIP))).resolves.toBeNull();

    podFindById.mockReturnValueOnce(q({ _id: POD }));
    userFindById.mockReturnValueOnce(q(null));
    await expect(ticketService.ensureForMembership(String(MEMBERSHIP))).resolves.toBeNull();
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it('issues a ticket with a frozen snapshot and a signed QR, then mails it (no session)', async () => {
    ticketFindOne.mockReturnValue(q(null));
    memberFindById.mockReturnValue(
      q({ _id: MEMBERSHIP, pod_id: POD, user_id: USER, payment_id: PAYMENT, seats: 3 })
    );
    podFindById.mockReturnValueOnce(
      q({
        _id: POD,
        pod_title: 'Sunday Run',
        pod_date_time: new Date('2026-11-01T12:30:00.000Z'),
        pod_end_date_time: new Date('2026-11-01T14:30:00.000Z'),
        pod_mode: 'PHYSICAL',
        venue_id: VENUE,
        zone_name: 'West',
      })
    );
    userFindById.mockReturnValueOnce(q({ _id: USER, first_name: 'Asha', last_name: 'Rao', email: 'asha@example.test' }));
    venueFindById.mockReturnValue(
      q({ venue_name: 'Park Gate', address_line1: '12 MG Road', locality: 'Camp', city: 'Pune', postal_code: '411001' })
    );
    const created = makeTicket({ qr_token: '' });
    ticketCreate.mockResolvedValue([created]);

    const doc = await ticketService.ensureForMembership(String(MEMBERSHIP));

    expect(doc).toBe(created);
    const [[rows, opts]] = ticketCreate.mock.calls;
    expect(opts).toEqual({ session: undefined });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      membership_id: MEMBERSHIP,
      pod_id: POD,
      user_id: USER,
      payment_id: PAYMENT,
      status: 'VALID',
      seats: 3,
      qr_token: '',
      snapshot: {
        pod_title: 'Sunday Run',
        pod_date_time: '2026-11-01T12:30:00.000Z',
        pod_end_date_time: '2026-11-01T14:30:00.000Z',
        pod_mode: 'PHYSICAL',
        meeting_platform: null,
        venue_name: 'Park Gate',
        venue_address: '12 MG Road, Camp, Pune, 411001',
        zone_name: 'West',
        user_name: 'Asha Rao',
        user_email: 'asha@example.test',
      },
    });
    expect(rows[0].ticket_code).toMatch(/^TKT-[0-9A-Z]{5}[0-9A-F]{4}$/);
    // The QR names this ticket, buyer, pod and booking — and verifies.
    expect(verifyTicketToken(created.qr_token)).toEqual({
      t: rows[0].ticket_code,
      u: String(USER),
      p: String(POD),
      m: String(MEMBERSHIP),
    });
    expect(created.save).toHaveBeenCalledWith({ session: undefined });

    await flush();
    expect(email).toHaveBeenCalledTimes(1);
  });

  it('never mails from inside a caller’s transaction, and fills defaults for a bare virtual pod', async () => {
    ticketFindOne.mockReturnValue(q(null));
    memberFindById.mockReturnValue(q({ _id: MEMBERSHIP, pod_id: POD, user_id: USER }));
    podFindById.mockReturnValueOnce(q({ _id: POD, pod_title: 'Online Chat' }));
    userFindById.mockReturnValueOnce(q({ _id: USER, email: 'only-email@example.test' }));
    const created = makeTicket();
    ticketCreate.mockResolvedValue([created]);

    await ticketService.ensureForMembership(String(MEMBERSHIP), SESSION);
    await flush();

    expect(venueFindById).not.toHaveBeenCalled();
    const [[rows, opts]] = ticketCreate.mock.calls;
    expect(opts).toEqual({ session: SESSION });
    expect(rows[0]).toMatchObject({
      payment_id: null,
      seats: 1,
      snapshot: {
        pod_date_time: null,
        pod_end_date_time: null,
        pod_mode: 'PHYSICAL',
        meeting_platform: null,
        venue_name: null,
        venue_address: null,
        zone_name: null,
        user_name: 'only-email@example.test',
        user_email: 'only-email@example.test',
      },
    });
    expect(created.save).toHaveBeenCalledWith({ session: SESSION });
    expect(email).not.toHaveBeenCalled();
  });

  it('names an account with neither name nor email "Guest"', async () => {
    ticketFindOne.mockReturnValue(q(null));
    memberFindById.mockReturnValue(q({ _id: MEMBERSHIP, pod_id: POD, user_id: USER }));
    podFindById.mockReturnValueOnce(q({ _id: POD, pod_title: 'Chat' }));
    userFindById.mockReturnValueOnce(q({ _id: USER }));
    ticketCreate.mockResolvedValue([makeTicket()]);

    await ticketService.ensureForMembership(String(MEMBERSHIP), SESSION);

    expect(ticketCreate.mock.calls[0][0][0].snapshot).toMatchObject({ user_name: 'Guest', user_email: '' });
  });

  it('logs a failed ticket email without failing the issue', async () => {
    ticketFindOne.mockReturnValue(q(null));
    memberFindById.mockReturnValue(q({ _id: MEMBERSHIP, pod_id: POD, user_id: USER }));
    podFindById.mockReturnValueOnce(q({ _id: POD, pod_title: 'Chat' }));
    userFindById.mockReturnValueOnce(q({ _id: USER, first_name: 'Asha' }));
    const created = makeTicket();
    ticketCreate.mockResolvedValue([created]);
    const boom = new Error('SMTP down');
    email.mockRejectedValue(boom);

    await expect(ticketService.ensureForMembership(String(MEMBERSHIP))).resolves.toBe(created);
    await flush();

    expect(logWarn).toHaveBeenCalledWith('ticket', 'ensureForMembership', {
      error: boom,
      msg: 'Ticket email failed',
      ticket_code: expect.stringMatching(/^TKT-/),
      membership_id: String(MEMBERSHIP),
    });
  });
});

describe('ticketService.email', () => {
  it('mails the ticket PDF with the booking deep link, then sends the WhatsApp twin', async () => {
    imageAssets.mockReturnValue({ IMAGE: { url: 'https://img.example.test/pod.jpg' } });
    const ticket = makeTicket() as any;

    await ticketService.email(ticket);

    const bookingUrl = `https://app.example.test/booking/${String(MEMBERSHIP)}`;
    expect(email).toHaveBeenCalledWith({
      to: 'asha@example.test',
      subject: 'Your ticket — Sunday Run',
      template: 'event-ticket',
      category: 'transactional',
      vars: {
        name: 'Asha Rao',
        event_title: 'Sunday Run',
        date_label: expect.any(String),
        venue_line: 'Park Gate, MG Road, Pune',
        ticket_code: 'TKT-ISSUE1',
        seats_count: '2',
        booking_url: bookingUrl,
        app_url: bookingUrl,
      },
      attachments: [{ filename: 'ticket-TKT-ISSUE1.pdf', content: PDF, contentType: 'application/pdf' }],
    });
    expect(email.mock.calls[0][0].vars.date_label).not.toBe('Date pending');

    expect(pdfUrl).toHaveBeenCalledWith(String(TICKET));
    const [wa] = waSend.mock.calls[0];
    expect(wa).toMatchObject({
      event: 'USER_BOOKING_SUCCESSFUL',
      entityId: String(TICKET),
      name: 'Asha Rao',
      assets: {
        IMAGE: { url: 'https://img.example.test/pod.jpg' },
        DOCUMENT: { url: 'https://api.example.test/tickets/signed/ticket.pdf', filename: 'ticket-TKT-ISSUE1.pdf' },
      },
    });
    expect(wa.params).toHaveLength(7);
    expect(wa.params[0]).toBe('Asha Rao');
    expect(wa.params[1]).toBe('Sunday Run');
    expect(wa.params[5]).toBe(bookingUrl);
    expect(wa.params[6]).toBe('Hari Host');
  });

  it('names the meeting platform (or "Online") as the place for a virtual pod', async () => {
    await ticketService.email(makeTicket({ snapshot: { pod_mode: 'VIRTUAL', meeting_platform: 'Google Meet' } }) as any);
    await ticketService.email(makeTicket({ snapshot: { pod_mode: 'VIRTUAL', meeting_platform: null } }) as any);

    expect(email.mock.calls[0][0].vars.venue_line).toBe('Google Meet');
    expect(email.mock.calls[1][0].vars.venue_line).toBe('Online');
  });

  it('falls back to safe wording when the snapshot is bare', async () => {
    podFindById.mockImplementation(() => q(null));
    userFindById.mockImplementation(() => q(null));

    await ticketService.email(makeTicket({ snapshot: undefined, seats: undefined }) as any);

    expect(email.mock.calls[0][0].vars).toMatchObject({
      name: 'there',
      event_title: 'Event',
      date_label: 'Date pending',
      venue_line: '—',
      seats_count: '1',
    });
    // No pod, no host: the template still gets a name.
    expect(waSend.mock.calls[0][0].params[6]).toBe('A host');
    expect(imageAssets).toHaveBeenCalledWith([]);
  });

  it('logs a failed WhatsApp leg without failing the email', async () => {
    const boom = new Error('signer offline');
    pdfUrl.mockRejectedValue(boom);

    await expect(ticketService.email(makeTicket() as any)).resolves.toBeUndefined();

    expect(email).toHaveBeenCalledTimes(1);
    expect(waSend).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('ticket.service', 'whatsappBookingConfirmed', {
      error: boom,
      msg: 'booking WhatsApp failed',
      ticket_code: 'TKT-ISSUE1',
    });
  });
});

describe('ticketService.emailById', () => {
  it('throws NOT_FOUND for an unknown ticket', async () => {
    ticketFindById.mockResolvedValue(null);
    await expect(ticketService.emailById(String(TICKET))).rejects.toMatchObject({
      message: 'Ticket not found',
      extensions: { code: 'NOT_FOUND' },
    });
    expect(email).not.toHaveBeenCalled();
  });

  it('mails an issued ticket', async () => {
    ticketFindById.mockResolvedValue(makeTicket());
    await ticketService.emailById(String(TICKET));
    expect(ticketFindById).toHaveBeenCalledWith(String(TICKET));
    expect(email.mock.calls[0][0].vars.ticket_code).toBe('TKT-ISSUE1');
  });
});

describe('ticket PDF and its invoice', () => {
  it('renders the ticket with the named payment’s invoice', async () => {
    const invoice = { invoice_no: 'INV-0001' };
    paymentFindById.mockResolvedValue(paymentDoc());
    invoiceData.mockResolvedValue(invoice);
    ticketFindById.mockResolvedValue(makeTicket({ payment_id: PAYMENT }));

    const res = await ticketService.pdfForLink(String(TICKET));

    expect(res).toEqual({ pdf: PDF, filename: 'ticket-TKT-ISSUE1.pdf' });
    expect(paymentFindById).toHaveBeenCalledWith(PAYMENT);
    expect(invoiceData).toHaveBeenCalledWith(paymentDoc(), { paymentMethod: 'Razorpay', currencySymbol: '₹' });
    expect(generatePdf).toHaveBeenCalledWith(
      {
        brand: 'Duncit Test Co',
        ticket_code: 'TKT-ISSUE1',
        status: 'VALID',
        qr_token: 'qr',
        event_title: 'Sunday Run',
        date_label: expect.any(String),
        mode: 'PHYSICAL',
        venue_name: 'Park Gate',
        venue_address: 'MG Road, Pune',
        meeting_platform: null,
        attendee_name: 'Asha Rao',
        attendee_email: 'asha@example.test',
        seats: 2,
      },
      invoice
    );
  });

  it('labels a payment with no gateway as "Gateway"', async () => {
    paymentFindById.mockResolvedValue(paymentDoc({ gateway: '' }));
    invoiceData.mockResolvedValue({});
    ticketFindById.mockResolvedValue(makeTicket({ payment_id: PAYMENT }));

    await ticketService.pdfForLink(String(TICKET));

    expect(invoiceData.mock.calls[0][1]).toEqual({ paymentMethod: 'Gateway', currencySymbol: '₹' });
  });

  it('finds an older ticket’s invoice through the newest successful payment for that pod and buyer', async () => {
    const sorted = q(paymentDoc());
    paymentFindOne.mockReturnValue(sorted);
    invoiceData.mockResolvedValue({ invoice_no: 'INV-0001' });
    ticketFindById.mockResolvedValue(makeTicket());

    await ticketService.pdfForLink(String(TICKET));

    expect(paymentFindOne).toHaveBeenCalledWith({
      pod_id: POD,
      user_id: USER,
      status: 'SUCCESS',
      invoice_no: { $ne: null },
    });
    expect(sorted.sort).toHaveBeenCalledWith({ paid_at: -1, created_at: -1 });
    expect(generatePdf.mock.calls[0][1]).toEqual({ invoice_no: 'INV-0001' });
  });

  it.each([
    ['a named payment that no longer exists', null],
    ['a payment that did not succeed', paymentDoc({ status: 'FAILED' })],
    ['a payment with no invoice number', paymentDoc({ invoice_no: null })],
  ])('prints a one-page ticket for %s', async (_label, payment) => {
    paymentFindById.mockResolvedValue(payment);
    ticketFindById.mockResolvedValue(makeTicket({ payment_id: PAYMENT }));

    await ticketService.pdfForLink(String(TICKET));

    expect(invoiceData).not.toHaveBeenCalled();
    expect(generatePdf.mock.calls[0][1]).toBeNull();
  });

  it('logs and leaves the invoice off when it cannot be built', async () => {
    const boom = new Error('invoice template missing');
    paymentFindById.mockResolvedValue(paymentDoc());
    invoiceData.mockRejectedValue(boom);
    ticketFindById.mockResolvedValue(makeTicket({ payment_id: PAYMENT }));

    await expect(ticketService.pdfForLink(String(TICKET))).resolves.toEqual({
      pdf: PDF,
      filename: 'ticket-TKT-ISSUE1.pdf',
    });
    expect(generatePdf.mock.calls[0][1]).toBeNull();
    expect(logWarn).toHaveBeenCalledWith('ticket', 'invoiceForTicket', {
      error: boom,
      msg: 'Could not attach an invoice to the ticket',
      ticket_code: 'TKT-ISSUE1',
    });
  });

  it('draws a bare ticket with safe defaults', async () => {
    ticketFindById.mockResolvedValue(makeTicket({ snapshot: undefined, seats: undefined }));

    await ticketService.pdfForLink(String(TICKET));

    expect(generatePdf.mock.calls[0][0]).toMatchObject({
      event_title: 'Event',
      date_label: 'Date pending',
      mode: 'PHYSICAL',
      venue_name: null,
      venue_address: null,
      meeting_platform: null,
      attendee_name: '',
      attendee_email: '',
      seats: 1,
    });
  });

  it('answers null (never throws) for a malformed id or a ticket that is gone', async () => {
    await expect(ticketService.pdfForLink('not-an-id')).resolves.toBeNull();
    expect(ticketFindById).not.toHaveBeenCalled();

    ticketFindById.mockResolvedValue(null);
    await expect(ticketService.pdfForLink(String(TICKET))).resolves.toBeNull();
    expect(generatePdf).not.toHaveBeenCalled();
  });

  it('serves the PDF as base64 to its owner or an admin, and refuses anyone else', async () => {
    ticketFindById.mockResolvedValue(makeTicket());

    await expect(ticketService.pdfBase64(String(TICKET), String(USER), false)).resolves.toBe(PDF.toString('base64'));
    await expect(ticketService.pdfBase64(String(TICKET), String(oid(90)), true)).resolves.toBe(PDF.toString('base64'));
    await expect(ticketService.pdfBase64(String(TICKET), String(oid(90)), false)).rejects.toMatchObject({
      message: 'Not your ticket',
      extensions: { code: 'FORBIDDEN' },
    });

    ticketFindById.mockResolvedValue(null);
    await expect(ticketService.pdfBase64(String(TICKET), String(USER), true)).rejects.toMatchObject({
      message: 'Ticket not found',
      extensions: { code: 'NOT_FOUND' },
    });
  });
});
