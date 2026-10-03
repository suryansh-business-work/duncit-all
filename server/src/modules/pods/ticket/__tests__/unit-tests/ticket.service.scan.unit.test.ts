/**
 * The door: a host scanning a ticket at their own pod, and an admin checking a
 * ticket in. Every model and outbound service is faked; the QR token signing,
 * the companion schema and the phone keying are real. What is under test is
 * every answer the scanner can show (window closed, bad code, wrong pod,
 * cancelled, already in), the multi-seat gate that collects the rest of the
 * group before anyone is marked, the one-number-one-person rule, the spending
 * of a companion's one-time code, and the attendee's notification.
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
jest.mock('@modules/pods/pod/pod.service', () => ({ findHostedPod: jest.fn() }));
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getPodCompletionSettings: jest.fn() },
}));
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: jest.fn() },
}));

import { logs } from '@observability/log';
import { TicketModel } from '../../ticket.model';
import { attendanceLock, markTicketPresent } from '../../attendance.service';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { otpService } from '@modules/platform/otp/otp.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { sendEmail } from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { findHostedPod } from '@modules/pods/pod/pod.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { signTicketToken } from '../../ticket.token';
import { notifyAttendanceMarked, ticketService } from '../../ticket.service';

const ticketFindOne = TicketModel.findOne as jest.Mock;
const ticketFindById = TicketModel.findById as jest.Mock;
const lock = attendanceLock as jest.Mock;
const mark = markTicketPresent as jest.Mock;
const memberFindById = PodMemberModel.findById as jest.Mock;
const podFindById = PodModel.findById as jest.Mock;
const userFindById = UserModel.findById as jest.Mock;
const consume = otpService.consume as jest.Mock;
const waSend = whatsappService.send as jest.Mock;
const imageAssets = podImageAssets as jest.Mock;
const email = sendEmail as jest.Mock;
const urls = getUrlConfigs as jest.Mock;
const hostedPod = findHostedPod as jest.Mock;
const completion = settingsService.getPodCompletionSettings as jest.Mock;
const notify = notificationService.create as jest.Mock;
const logError = logs.server.error as jest.Mock;

const oid = (n: number) => new Types.ObjectId(`65f5000000000000000000${String(n).padStart(2, '0')}`);
const POD = oid(1);
const OTHER_POD = oid(2);
const USER = oid(3);
const MEMBERSHIP = oid(4);
const TICKET = oid(5);
const HOST = String(oid(6));
const NOW = new Date('2026-11-01T14:00:00.000Z');
const CHECKED_AT = new Date('2026-11-01T13:30:00.000Z');
const JOINED_AT = new Date('2026-10-20T09:00:00.000Z');

/** A mongoose query stand-in: awaitable, `.select()`-able and `.lean()`-able. */
const q = (value: unknown) => {
  const chain: any = {
    select: jest.fn(() => chain),
    lean: jest.fn(() => Promise.resolve(value)),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(value).then(res, rej),
  };
  return chain;
};

const tokenFor = (code: string) =>
  signTicketToken({ t: code, u: String(USER), p: String(POD), m: String(MEMBERSHIP) });

const makeTicket = (over: Record<string, unknown> = {}) => ({
  _id: TICKET,
  ticket_code: 'TKT-DOOR1',
  membership_id: MEMBERSHIP,
  pod_id: POD,
  user_id: USER,
  payment_id: null,
  status: 'VALID',
  seats: 1,
  checked_in_at: null as Date | null,
  qr_token: tokenFor('TKT-DOOR1'),
  snapshot: {
    pod_title: 'Sunday Run',
    pod_date_time: '2026-11-01T12:30:00.000Z',
    pod_mode: 'PHYSICAL',
    venue_name: 'Park Gate',
    user_name: 'Asha Rao',
    user_email: 'asha@example.test',
  },
  created_at: new Date('2026-10-20T09:00:00.000Z'),
  updated_at: new Date('2026-10-20T09:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

const makeMembership = (over: Record<string, unknown> = {}) => ({
  _id: MEMBERSHIP,
  user_id: USER,
  seats: 1,
  companions: [] as any[],
  created_at: JOINED_AT,
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

/** A hydrated user: the legacy flat virtuals the scan reads AND the nested
 * storage paths the duplicate-number check reads. */
const scannedUser = () => ({
  _id: USER,
  first_name: 'Asha',
  last_name: 'Rao',
  email: 'asha@example.test',
  profile_photo: 'https://img.example.test/asha.jpg',
  phone_extension: '+91',
  phone_number: '9000000001',
  whatsapp_extension: '',
  whatsapp_number: '9000000002',
  bio: 'Runner',
  city: 'Pune',
  profile: { address: { line1: '1 Lane', city: 'Pune', pincode: '411001' } },
  auth: { phone: { extension: '+91', number: '9000000001' } },
  communication: { whatsapp: { extension: '+91', number: '9000000002' } },
});

const EXPECTED_ATTENDEE = {
  user_id: String(USER),
  full_name: 'Asha Rao',
  profile_photo: 'https://img.example.test/asha.jpg',
  profile_path: `/u/${String(USER)}`,
  email: 'asha@example.test',
  phone: '+91 9000000001',
  whatsapp: '9000000002',
  bio: 'Runner',
  address: '1 Lane, Pune, 411001',
  city: 'Pune',
  joined_at: JOINED_AT.toISOString(),
};

const REFUSAL = {
  ok: false,
  already_checked_in: false,
  requires_companions: false,
  companions_required: 0,
  companions: [],
  attendee: null,
};

const fails = (code: string, message: string) =>
  expect.objectContaining({ message, extensions: expect.objectContaining({ code }) });

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
  hostedPod.mockResolvedValue({ _id: POD });
  completion.mockResolvedValue({ timeout_hours: 12 });
  lock.mockReturnValue('OPEN');
  userFindById.mockImplementation(() => q(scannedUser()));
  podFindById.mockImplementation(() => q({ pod_title: 'Sunday Run', pod_images_and_videos: [] }));
  urls.mockResolvedValue({ appUrl: 'https://app.example.test' });
  mark.mockImplementation(async (t: any) => {
    t.status = 'CHECKED_IN';
    t.checked_in_at = CHECKED_AT;
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ticketService.hostScan — refusals', () => {
  it('refuses once the completion window has expired, naming the hours', async () => {
    lock.mockReturnValue('EXPIRED');

    const res = await ticketService.hostScan(String(POD), tokenFor('TKT-DOOR1'), HOST);

    expect(hostedPod).toHaveBeenCalledWith(String(POD), HOST);
    expect(lock).toHaveBeenCalledWith({ _id: POD }, 12);
    expect(res).toEqual({
      ...REFUSAL,
      message: 'The 12-hour window to complete this pod has passed — ask your Club Admin to mark attendance',
      ticket: null,
    });
    expect(ticketFindOne).not.toHaveBeenCalled();
  });

  it('refuses when attendance is closed for any other reason', async () => {
    lock.mockReturnValue('COMPLETED');
    await expect(ticketService.hostScan(String(POD), 'x', HOST)).resolves.toEqual({
      ...REFUSAL,
      message: 'Attendance is closed for this pod',
      ticket: null,
    });
  });

  it('answers an unreadable code as a result, not an error', async () => {
    await expect(ticketService.hostScan(String(POD), 'not.a-token', HOST)).resolves.toEqual({
      ...REFUSAL,
      message: 'Invalid or tampered QR code',
      ticket: null,
    });
  });

  it('answers a validly signed code with no ticket behind it', async () => {
    ticketFindOne.mockResolvedValue(null);
    await expect(ticketService.hostScan(String(POD), tokenFor('TKT-GONE'), HOST)).resolves.toEqual({
      ...REFUSAL,
      message: 'Ticket not found',
      ticket: null,
    });
    expect(ticketFindOne).toHaveBeenCalledWith({ ticket_code: 'TKT-GONE' });
  });

  it('names the other pod when the ticket is for a different door', async () => {
    ticketFindOne.mockResolvedValue(makeTicket({ pod_id: OTHER_POD }));
    const res = await ticketService.hostScan(String(POD), tokenFor('TKT-DOOR1'), HOST);
    expect(res).toMatchObject({ ...REFUSAL, message: 'This ticket is for another pod — Sunday Run' });
    expect(res.ticket).toMatchObject({ pod_id: String(OTHER_POD), ticket_code: 'TKT-DOOR1' });
    expect(mark).not.toHaveBeenCalled();
  });

  it('says only "another pod" when the ticket snapshot has no title', async () => {
    ticketFindOne.mockResolvedValue(makeTicket({ pod_id: OTHER_POD, snapshot: undefined }));
    const res = await ticketService.hostScan(String(POD), tokenFor('TKT-DOOR1'), HOST);
    expect(res.message).toBe('This ticket is for another pod');
    expect(res.ticket).toMatchObject({ pod_title: '', pod_mode: 'PHYSICAL', user_name: '', seats: 1 });
  });

  it('refuses a cancelled ticket', async () => {
    ticketFindOne.mockResolvedValue(makeTicket({ status: 'CANCELLED' }));
    const res = await ticketService.hostScan(String(POD), tokenFor('TKT-DOOR1'), HOST);
    expect(res).toMatchObject({ ...REFUSAL, message: 'Ticket cancelled' });
    expect(res.ticket?.status).toBe('CANCELLED');
  });
});

describe('ticketService.hostScan — admission', () => {
  it('marks a single-seat ticket present, returns the attendee and notifies them', async () => {
    const ticket = makeTicket();
    ticketFindOne.mockResolvedValue(ticket);
    memberFindById.mockResolvedValue(makeMembership());

    const res = await ticketService.hostScan(String(POD), ticket.qr_token, HOST);

    expect(mark).toHaveBeenCalledWith(ticket, HOST, 'HOST_SCAN');
    expect(res).toMatchObject({
      ok: true,
      message: 'Attendance marked',
      already_checked_in: false,
      requires_companions: false,
      companions_required: 0,
      attendee: EXPECTED_ATTENDEE,
      companions: [],
    });
    expect(res.ticket).toMatchObject({ status: 'CHECKED_IN', checked_in_at: CHECKED_AT.toISOString() });
    // Seat count already agrees with the booking: no write.
    expect(ticket.save).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('re-syncs the seat count from the booking before anything else', async () => {
    const ticket = makeTicket({ seats: undefined });
    ticketFindOne.mockResolvedValue(ticket);
    memberFindById.mockResolvedValue(makeMembership({ seats: 1 }));

    await ticketService.hostScan(String(POD), ticket.qr_token, HOST);

    expect(ticket.seats).toBe(1);
    expect(ticket.save).toHaveBeenCalledTimes(1);
  });

  it('falls back to the ticket’s own seats with no booking or account on file', async () => {
    const ticket = makeTicket();
    ticketFindOne.mockResolvedValue(ticket);
    memberFindById.mockResolvedValue(null);
    userFindById.mockImplementation(() => q(null));

    const res = await ticketService.hostScan(String(POD), ticket.qr_token, HOST);

    expect(res).toMatchObject({ ok: true, message: 'Attendance marked', attendee: null, companions: [] });
  });

  it('reads an already-marked ticket back with the time and party size, without marking again', async () => {
    const ticket = makeTicket({ status: 'CHECKED_IN', checked_in_at: CHECKED_AT, seats: 3 });
    ticketFindOne.mockResolvedValue(ticket);
    memberFindById.mockResolvedValue(makeMembership({ seats: 3 }));

    const res = await ticketService.hostScan(String(POD), ticket.qr_token, HOST);

    expect(res.ok).toBe(true);
    expect(res.already_checked_in).toBe(true);
    expect(res.message).toMatch(/^Already marked present at .+ · admits 3$/);
    expect(mark).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('says "Already marked present" with no time when none was stamped', async () => {
    const ticket = makeTicket({ status: 'CHECKED_IN', checked_in_at: null });
    ticketFindOne.mockResolvedValue(ticket);
    memberFindById.mockResolvedValue(makeMembership());

    const res = await ticketService.hostScan(String(POD), ticket.qr_token, HOST);
    expect(res.message).toBe('Already marked present');
  });
});

describe('ticketService.hostScan — the multi-seat gate', () => {
  const arrange = (seats: number, membershipOver: Record<string, unknown> = {}) => {
    const ticket = makeTicket({ seats });
    const membership = makeMembership({ seats, ...membershipOver });
    ticketFindOne.mockResolvedValue(ticket);
    memberFindById.mockResolvedValue(membership);
    return { ticket, membership };
  };

  it('asks for the rest of the group before marking anyone', async () => {
    const { ticket } = arrange(3);

    const res = await ticketService.hostScan(String(POD), ticket.qr_token, HOST);

    expect(res).toMatchObject({
      ok: false,
      message: 'This ticket admits 3 — add the other 2 people to mark attendance',
      requires_companions: true,
      companions_required: 2,
      attendee: EXPECTED_ATTENDEE,
      companions: [],
    });
    expect(mark).not.toHaveBeenCalled();
  });

  it('asks only for the people not already on file, singular for one', async () => {
    const { ticket } = arrange(3, {
      companions: [{ name: 'Ravi', phone_number: '9000000010', added_at: JOINED_AT }],
    });

    const res = await ticketService.hostScan(String(POD), ticket.qr_token, HOST, 'not-a-list');

    expect(res.message).toBe('This ticket admits 3 — add the other 1 person to mark attendance');
    expect(res.companions_required).toBe(1);
    expect(res.companions).toEqual([
      {
        name: 'Ravi',
        phone_extension: null,
        phone_number: '9000000010',
        added_at: JOINED_AT.toISOString(),
        verified_at: null,
        verified_medium: '',
      },
    ]);
  });

  it('admits straight away when the group is already fully on file', async () => {
    const { ticket } = arrange(2, { companions: [{}] });

    const res = await ticketService.hostScan(String(POD), ticket.qr_token, HOST);

    expect(res).toMatchObject({ ok: true, message: 'Attendance marked · admits 2' });
    // A stored row with nothing in it still renders with safe defaults.
    expect(res.companions).toEqual([
      {
        name: '',
        phone_extension: null,
        phone_number: '',
        added_at: new Date(0).toISOString(),
        verified_at: null,
        verified_medium: '',
      },
    ]);
  });

  it('records the group (spending a supplied one-time code) and then marks the ticket', async () => {
    const { ticket, membership } = arrange(3);
    const verifiedAt = new Date('2026-11-01T13:55:00.000Z');
    consume.mockResolvedValue({ _id: 'otp-ravi', verified_at: verifiedAt, mediums: ['WHATSAPP', 'SMS'] });

    const res = await ticketService.hostScan(String(POD), ticket.qr_token, HOST, [
      { name: '  Ravi Kumar ', phone_extension: '+91', phone_number: '9000000011', otp_challenge_id: 'otp-ravi' },
      { name: 'Meera Shah', phone_number: '9000000012' },
    ]);

    expect(consume).toHaveBeenCalledTimes(1);
    const [challengeId, opts] = consume.mock.calls[0];
    expect(challengeId).toBe('otp-ravi');
    expect(opts.purpose).toBe('POD_COMPANION');
    // The proof is bound to this booking AND to this number.
    expect(opts.match({ context: { membership_id: String(MEMBERSHIP) }, phone_number: '9000000011' })).toBe(true);
    expect(opts.match({ context: { membership_id: String(oid(99)) }, phone_number: '9000000011' })).toBe(false);
    expect(opts.match({ context: { membership_id: String(MEMBERSHIP) }, phone_number: '9000000012' })).toBe(false);
    expect(opts.match({ context: null, phone_number: '9000000011' })).toBe(false);

    expect(membership.save).toHaveBeenCalledTimes(1);
    expect(membership.companions).toEqual([
      {
        name: 'Ravi Kumar',
        phone_extension: '+91',
        phone_number: '9000000011',
        added_at: NOW,
        verified_at: verifiedAt,
        verified_medium: 'WHATSAPP,SMS',
        otp_challenge_id: 'otp-ravi',
      },
      {
        name: 'Meera Shah',
        phone_extension: null,
        phone_number: '9000000012',
        added_at: NOW,
        verified_at: null,
        verified_medium: '',
        otp_challenge_id: null,
      },
    ]);
    expect(mark).toHaveBeenCalledWith(ticket, HOST, 'HOST_SCAN');
    expect(res).toMatchObject({ ok: true, message: 'Attendance marked · admits 3' });
    expect(res.companions.map((c: any) => [c.name, c.verified_at, c.verified_medium])).toEqual([
      ['Ravi Kumar', verifiedAt.toISOString(), 'WHATSAPP,SMS'],
      ['Meera Shah', null, ''],
    ]);
  });

  it('stamps the spend time when the challenge carries no verified_at', async () => {
    const { ticket, membership } = arrange(2);
    consume.mockResolvedValue({ _id: 'otp-1', verified_at: null, mediums: ['SMS'] });

    await ticketService.hostScan(String(POD), ticket.qr_token, HOST, [
      { name: 'Ravi Kumar', phone_number: '9000000011', otp_challenge_id: 'otp-1' },
    ]);

    expect(membership.companions[0]).toMatchObject({ verified_at: NOW, verified_medium: 'SMS' });
  });

  it('refuses a companion who reuses the buyer’s own number', async () => {
    const { ticket, membership } = arrange(2);

    await expect(
      ticketService.hostScan(String(POD), ticket.qr_token, HOST, [
        { name: 'Ravi Kumar', phone_extension: '+91', phone_number: '9000000001' },
      ])
    ).rejects.toEqual(
      fails('BAD_USER_INPUT', '9000000001 is already on this ticket — every person needs their own number')
    );
    expect(membership.save).not.toHaveBeenCalled();
    expect(mark).not.toHaveBeenCalled();
  });

  it('refuses a companion who reuses the buyer’s WhatsApp number', async () => {
    const { ticket } = arrange(2);
    await expect(
      ticketService.hostScan(String(POD), ticket.qr_token, HOST, [{ name: 'Ravi Kumar', phone_number: '9000000002' }])
    ).rejects.toEqual(fails('BAD_USER_INPUT', expect.stringContaining('9000000002 is already on this ticket')));
  });

  it('refuses one number named twice in the same batch', async () => {
    const { ticket } = arrange(3);
    await expect(
      ticketService.hostScan(String(POD), ticket.qr_token, HOST, [
        { name: 'Ravi Kumar', phone_number: '9000000020' },
        { name: 'Meera Shah', phone_extension: '+91', phone_number: '9000000020' },
      ])
    ).rejects.toEqual(fails('BAD_USER_INPUT', expect.stringContaining('9000000020 is already on this ticket')));
  });

  it('refuses a number already written onto the ticket for an earlier companion', async () => {
    const { ticket } = arrange(3, {
      companions: [{ name: 'Old', phone_extension: '+91', phone_number: '9000000030' }],
    });
    await expect(
      ticketService.hostScan(String(POD), ticket.qr_token, HOST, [{ name: 'Ravi Kumar', phone_number: '9000000030' }])
    ).rejects.toEqual(fails('BAD_USER_INPUT', expect.stringContaining('9000000030')));
  });

  it('ignores a buyer with no numbers on file and a numeric stored number', async () => {
    const { ticket, membership } = arrange(3, {
      companions: [],
    });
    // The duplicate check reads the buyer; this one has a numeric WhatsApp and no phone.
    userFindById.mockImplementation(() =>
      q({ ...scannedUser(), auth: { phone: { extension: '+91', number: '' } }, communication: { whatsapp: { number: 9000000040 } } })
    );

    await expect(
      ticketService.hostScan(String(POD), ticket.qr_token, HOST, [
        { name: 'Ravi Kumar', phone_number: '9000000001' },
        { name: 'Meera Shah', phone_number: '9000000040' },
      ])
    ).rejects.toEqual(fails('BAD_USER_INPUT', expect.stringContaining('9000000040')));
    expect(membership.save).not.toHaveBeenCalled();
  });

  it('demands exactly the missing count — too few is refused', async () => {
    const { ticket } = arrange(3);
    await expect(
      ticketService.hostScan(String(POD), ticket.qr_token, HOST, [{ name: 'Ravi Kumar', phone_number: '9000000011' }])
    ).rejects.toEqual(fails('BAD_USER_INPUT', 'This ticket admits 3 — enter details for the other 2 people'));
  });

  it('demands exactly the missing count — too many is refused, singular wording', async () => {
    const { ticket } = arrange(2);
    await expect(
      ticketService.hostScan(String(POD), ticket.qr_token, HOST, [
        { name: 'Ravi Kumar', phone_number: '9000000011' },
        { name: 'Meera Shah', phone_number: '9000000012' },
      ])
    ).rejects.toEqual(fails('BAD_USER_INPUT', 'This ticket admits 2 — enter details for the other 1 person'));
  });

  it('rejects a companion that fails the schema', async () => {
    const { ticket } = arrange(2);
    await expect(
      ticketService.hostScan(String(POD), ticket.qr_token, HOST, [{ name: 'R', phone_number: 'abc' }])
    ).rejects.toEqual(fails('BAD_USER_INPUT', 'Validation failed'));
    expect(consume).not.toHaveBeenCalled();
  });
});

describe('ticketService.checkIn', () => {
  it('rejects a tampered token', async () => {
    await expect(ticketService.checkIn({ token: 'bad.token' }, HOST)).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Invalid or tampered QR code')
    );
  });

  it('reports not found when neither a token nor an id is given', async () => {
    await expect(ticketService.checkIn({}, HOST)).rejects.toEqual(fails('NOT_FOUND', 'Ticket not found'));
    expect(ticketFindOne).not.toHaveBeenCalled();
    expect(ticketFindById).not.toHaveBeenCalled();
  });

  it('holds a multi-seat ticket until the group is accounted for', async () => {
    ticketFindById.mockResolvedValue(makeTicket({ seats: 3 }));
    memberFindById.mockResolvedValue(makeMembership({ seats: 3 }));

    await expect(ticketService.checkIn({ ticket_doc_id: String(TICKET) }, HOST)).rejects.toMatchObject({
      message: 'This ticket admits 3 — add the other 2 people to mark attendance',
      extensions: { code: 'COMPANIONS_REQUIRED', companions_required: 2 },
    });
    expect(mark).not.toHaveBeenCalled();
  });

  it('uses singular wording when one person is missing, falling back to the ticket’s seats', async () => {
    ticketFindById.mockResolvedValue(makeTicket({ seats: 2 }));
    memberFindById.mockResolvedValue(makeMembership({ seats: undefined }));

    await expect(ticketService.checkIn({ ticket_doc_id: String(TICKET) }, HOST)).rejects.toMatchObject({
      message: 'This ticket admits 2 — add the other 1 person to mark attendance',
    });
  });

  it('marks the ticket as ADMIN once the companions are supplied', async () => {
    const ticket = makeTicket({ seats: 2 });
    ticketFindById.mockResolvedValue(ticket);
    memberFindById.mockResolvedValue(makeMembership({ seats: 2 }));

    const res = await ticketService.checkIn(
      { ticket_doc_id: String(TICKET), companions: [{ name: 'Ravi Kumar', phone_number: '9000000011' }] },
      'admin-1'
    );

    expect(mark).toHaveBeenCalledWith(ticket, 'admin-1', 'ADMIN');
    expect(res.status).toBe('CHECKED_IN');
  });

  it('treats a ticket with no booking and no seat count as single-seat', async () => {
    const ticket = makeTicket({ seats: undefined });
    ticketFindById.mockResolvedValue(ticket);
    memberFindById.mockResolvedValue(null);

    await expect(ticketService.checkIn({ ticket_doc_id: String(TICKET) }, 'admin-1')).resolves.toMatchObject({
      status: 'CHECKED_IN',
    });
  });
});

describe('notifyAttendanceMarked', () => {
  const marked = (over: Record<string, unknown> = {}) =>
    makeTicket({ status: 'CHECKED_IN', checked_in_at: CHECKED_AT, seats: 2, ...over }) as any;

  it('notifies in-app, by email and on WhatsApp for a physical pod', async () => {
    imageAssets.mockReturnValue({ IMAGE: { url: 'https://img.example.test/pod.jpg' } });
    podFindById.mockImplementation(() =>
      q({ pod_title: 'Sunday Run', pod_images_and_videos: [{ url: 'https://img.example.test/pod.jpg', type: 'IMAGE' }] })
    );
    const ticket = marked();

    await notifyAttendanceMarked(ticket);

    expect(notify).toHaveBeenCalledWith({
      title: 'Attendance marked',
      body: 'Your attendance is marked for Sunday Run.',
      link_url: `/pod/${String(POD)}`,
      scope: 'USER',
      target_user_ids: [String(USER)],
    });
    const [mail] = email.mock.calls[0];
    expect(mail).toMatchObject({
      to: 'asha@example.test',
      subject: 'Attendance marked — Sunday Run',
      template: 'attendance-marked',
      category: 'notification',
    });
    expect(mail.vars).toMatchObject({
      name: 'Asha Rao',
      pod_title: 'Sunday Run',
      place_line: 'Park Gate',
      ticket_code: 'TKT-DOOR1',
      seats_count: '2',
      booking_url: `https://app.example.test/booking/${String(MEMBERSHIP)}`,
    });
    expect(mail.vars.marked_at).not.toBe('Date pending');
    const [wa] = waSend.mock.calls[0];
    expect(wa).toMatchObject({
      event: 'USER_POD_ATTENDANCE',
      entityId: String(TICKET),
      name: 'Asha Rao',
      assets: { IMAGE: { url: 'https://img.example.test/pod.jpg' } },
    });
    expect(wa.params[0]).toBe('Asha Rao');
    expect(wa.params[5]).toBe('Park Gate');
    expect(wa.params[6]).toBe('https://app.example.test');
    expect(logError).not.toHaveBeenCalled();
  });

  it('names the meeting platform (or "Online") for a virtual pod', async () => {
    await notifyAttendanceMarked(marked({ snapshot: { pod_mode: 'VIRTUAL', meeting_platform: 'Zoom' } }));
    expect(waSend.mock.calls[0][0].params[5]).toBe('Zoom');

    await notifyAttendanceMarked(marked({ snapshot: { pod_mode: 'VIRTUAL', meeting_platform: '' } }));
    expect(email.mock.calls[1][0].vars.place_line).toBe('Online');
  });

  it('falls back to generic words when the pod and the snapshot are bare', async () => {
    podFindById.mockImplementation(() => q(null));

    await notifyAttendanceMarked(marked({ snapshot: undefined, checked_in_at: null, seats: undefined }));

    expect(notify.mock.calls[0][0].body).toBe('Your attendance is marked for this pod.');
    const [mail] = email.mock.calls[0];
    expect(mail.subject).toBe('Attendance marked — your pod');
    expect(mail.vars).toMatchObject({
      name: 'there',
      pod_title: 'Your pod',
      marked_at: 'Date pending',
      place_line: '—',
      seats_count: '1',
    });
  });

  it('logs and swallows a failure — the door must never look like it refused the guest', async () => {
    const boom = new Error('notifications down');
    notify.mockRejectedValueOnce(boom);

    await expect(notifyAttendanceMarked(marked())).resolves.toBeUndefined();

    expect(email).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('ticket.service', 'notifyAttendanceMarked', {
      error: boom,
      msg: 'attendance notification failed',
      ticket_id: String(TICKET),
    });
  });

  it('logs an empty ticket id when the failing ticket has none', async () => {
    notify.mockRejectedValueOnce(new Error('down'));
    await notifyAttendanceMarked(marked({ _id: undefined }));
    expect(logError.mock.calls[0][2].ticket_id).toBe('');
  });
});
