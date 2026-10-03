/**
 * Reading tickets back, and the Club Admin's override mark. Every model and
 * outbound service is faked; QR signing and the companion schema are real.
 * What is under test is the public shape of a ticket, the admin list's filter
 * (including a search string that must be matched literally), issue-on-demand
 * for a joined member, the verify answers, and the Club Admin's by-code /
 * by-name mark with its refusals.
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
jest.mock('@modules/clubs/clubAdmin/clubAdmin.service', () => ({
  clubAdminService: { assertClubAdminForPod: jest.fn() },
}));
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: jest.fn() },
}));

import { logs } from '@observability/log';
import { TicketModel } from '../../ticket.model';
import { consumeAttendanceProof, markTicketPresent } from '../../attendance.service';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { getUrlConfigs } from '@config/url-configs';
import { runTableQuery } from '@utils/table-query';
import { clubAdminService } from '@modules/clubs/clubAdmin/clubAdmin.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { signTicketToken } from '../../ticket.token';
import { ticketService } from '../../ticket.service';

const ticketFindOne = TicketModel.findOne as jest.Mock;
const ticketFindById = TicketModel.findById as jest.Mock;
const ticketFind = TicketModel.find as jest.Mock;
const proof = consumeAttendanceProof as jest.Mock;
const mark = markTicketPresent as jest.Mock;
const memberFindOne = PodMemberModel.findOne as jest.Mock;
const podFindById = PodModel.findById as jest.Mock;
const userFindById = UserModel.findById as jest.Mock;
const urls = getUrlConfigs as jest.Mock;
const tableQuery = runTableQuery as jest.Mock;
const assertClubAdmin = clubAdminService.assertClubAdminForPod as jest.Mock;
const notify = notificationService.create as jest.Mock;
const logInfo = logs.server.info as jest.Mock;

const oid = (n: number) => new Types.ObjectId(`65f7000000000000000000${String(n).padStart(2, '0')}`);
const POD = oid(1);
const USER = oid(2);
const MEMBERSHIP = oid(3);
const TICKET = oid(4);
const PAYMENT = oid(5);
const ACTOR = { id: String(oid(6)), roles: ['CLUB_ADMIN'] };
const NOW = new Date('2026-11-01T14:00:00.000Z');
const CHECKED_AT = new Date('2026-11-01T13:30:00.000Z');

const q = (value: unknown) => {
  const chain: any = {
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    lean: jest.fn(() => Promise.resolve(value)),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(value).then(res, rej),
  };
  return chain;
};

const makeTicket = (over: Record<string, unknown> = {}) => ({
  _id: TICKET,
  ticket_code: 'TKT-READ1',
  membership_id: MEMBERSHIP,
  pod_id: POD,
  user_id: USER,
  payment_id: null as Types.ObjectId | null,
  status: 'VALID',
  seats: 1,
  checked_in_at: null as Date | null,
  qr_token: signTicketToken({ t: 'TKT-READ1', u: String(USER), p: String(POD), m: String(MEMBERSHIP) }),
  snapshot: {
    pod_title: 'Sunday Run',
    pod_date_time: '2026-11-01T12:30:00.000Z',
    pod_end_date_time: '2026-11-01T14:30:00.000Z',
    pod_mode: 'VIRTUAL',
    meeting_platform: 'Zoom',
    venue_name: null,
    venue_address: null,
    zone_name: 'West',
    user_name: 'Asha Rao',
    user_email: 'asha@example.test',
  },
  created_at: new Date('2026-10-20T09:00:00.000Z'),
  updated_at: new Date('2026-10-21T09:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
  urls.mockResolvedValue({ appUrl: 'https://app.example.test' });
  userFindById.mockImplementation(() => q(null));
  podFindById.mockImplementation(() => q({ pod_title: 'Sunday Run' }));
  assertClubAdmin.mockResolvedValue(undefined);
  mark.mockImplementation(async (t: any) => {
    t.status = 'CHECKED_IN';
    t.checked_in_at = CHECKED_AT;
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ticketService.toPub', () => {
  it('shapes every field of a ticket for GraphQL', () => {
    const t = makeTicket({ payment_id: PAYMENT, status: 'CHECKED_IN', checked_in_at: CHECKED_AT, seats: 3 });
    expect(ticketService.toPub(t as any)).toEqual({
      id: String(TICKET),
      ticket_code: 'TKT-READ1',
      membership_id: String(MEMBERSHIP),
      pod_id: String(POD),
      user_id: String(USER),
      payment_id: String(PAYMENT),
      status: 'CHECKED_IN',
      seats: 3,
      checked_in_at: CHECKED_AT.toISOString(),
      qr_token: t.qr_token,
      pod_title: 'Sunday Run',
      pod_date_time: '2026-11-01T12:30:00.000Z',
      pod_end_date_time: '2026-11-01T14:30:00.000Z',
      pod_mode: 'VIRTUAL',
      meeting_platform: 'Zoom',
      venue_name: null,
      venue_address: null,
      zone_name: 'West',
      user_name: 'Asha Rao',
      user_email: 'asha@example.test',
      created_at: '2026-10-20T09:00:00.000Z',
      updated_at: '2026-10-21T09:00:00.000Z',
    });
  });

  it('fills defaults for a legacy ticket with no snapshot, seats or payment', () => {
    expect(ticketService.toPub(makeTicket({ snapshot: undefined, seats: undefined }) as any)).toMatchObject({
      payment_id: null,
      seats: 1,
      checked_in_at: null,
      pod_title: '',
      pod_date_time: null,
      pod_end_date_time: null,
      pod_mode: 'PHYSICAL',
      meeting_platform: null,
      venue_name: null,
      venue_address: null,
      zone_name: null,
      user_name: '',
      user_email: '',
    });
  });
});

describe('ticket reads', () => {
  it('lists a user’s tickets newest first', async () => {
    const query = q([makeTicket()]);
    ticketFind.mockReturnValue(query);

    const rows = await ticketService.listForUser(String(USER));

    expect(ticketFind).toHaveBeenCalledWith({ user_id: USER });
    expect(query.sort).toHaveBeenCalledWith({ created_at: -1 });
    expect(rows.map((r) => r.ticket_code)).toEqual(['TKT-READ1']);
  });

  it('gets one ticket by id, or null', async () => {
    ticketFindById.mockResolvedValueOnce(makeTicket()).mockResolvedValueOnce(null);
    await expect(ticketService.getById(String(TICKET))).resolves.toMatchObject({ id: String(TICKET) });
    await expect(ticketService.getById(String(TICKET))).resolves.toBeNull();
  });

  it('builds the admin filter, matching the search literally', async () => {
    const query = q([makeTicket()]);
    ticketFind.mockReturnValue(query);

    await ticketService.listAdmin({ pod_id: String(POD), status: 'VALID', search: 'a.b(c)*' });

    const filter = ticketFind.mock.calls[0][0];
    expect(filter.pod_id).toEqual(POD);
    expect(filter.status).toBe('VALID');
    expect(filter.$or).toHaveLength(4);
    const regex: RegExp = filter.$or[0].ticket_code;
    expect(regex.flags).toBe('i');
    expect(regex.test('xx A.B(C)* yy')).toBe(true);
    // The dot is escaped: it must not match any character.
    expect(regex.test('aXb(c)*')).toBe(false);
    expect(filter.$or.map((o: Record<string, unknown>) => Object.keys(o)[0])).toEqual([
      'ticket_code',
      'snapshot.user_name',
      'snapshot.user_email',
      'snapshot.pod_title',
    ]);
    expect(query.sort).toHaveBeenCalledWith({ created_at: -1 });
    expect(query.limit).toHaveBeenCalledWith(500);
  });

  it('lists every ticket when no filter is given', async () => {
    ticketFind.mockReturnValue(q([]));
    await expect(ticketService.listAdmin()).resolves.toEqual([]);
    expect(ticketFind).toHaveBeenCalledWith({});
  });

  it('pages the tickets table through the shared engine', async () => {
    tableQuery.mockResolvedValue({ docs: [makeTicket()], total: 41, page: 2, page_size: 20 });

    const page = await ticketService.table({ page: 2, page_size: 20 } as any);

    expect(tableQuery).toHaveBeenCalledWith(
      TicketModel,
      {},
      { page: 2, page_size: 20 },
      expect.objectContaining({ defaultSort: { created_at: -1 } })
    );
    expect(page).toMatchObject({ total: 41, page: 2, page_size: 20 });
    expect(page.rows.map((r) => r.ticket_code)).toEqual(['TKT-READ1']);
  });
});

describe('ticketService.forPodAndUser', () => {
  it('returns the ticket the member already holds', async () => {
    ticketFindOne.mockResolvedValue(makeTicket());

    await expect(ticketService.forPodAndUser(String(POD), String(USER))).resolves.toMatchObject({
      ticket_code: 'TKT-READ1',
    });
    expect(ticketFindOne).toHaveBeenCalledWith({ pod_id: POD, user_id: USER });
    expect(memberFindOne).not.toHaveBeenCalled();
  });

  it('issues on demand for a JOINED member with no ticket yet', async () => {
    ticketFindOne.mockResolvedValue(null);
    memberFindOne.mockResolvedValue({ _id: MEMBERSHIP });
    const issued = makeTicket({ ticket_code: 'TKT-NEW01' });
    const ensure = jest.spyOn(ticketService, 'ensureForMembership').mockResolvedValue(issued as any);

    const res = await ticketService.forPodAndUser(String(POD), String(USER));

    expect(memberFindOne).toHaveBeenCalledWith({ pod_id: POD, user_id: USER, status: 'JOINED' });
    expect(ensure).toHaveBeenCalledWith(String(MEMBERSHIP));
    expect(res?.ticket_code).toBe('TKT-NEW01');
    ensure.mockRestore();
  });

  it('returns null for someone who is not a member', async () => {
    ticketFindOne.mockResolvedValue(null);
    memberFindOne.mockResolvedValue(null);
    await expect(ticketService.forPodAndUser(String(POD), String(USER))).resolves.toBeNull();
  });
});

describe('ticketService.verify', () => {
  it('answers each state of a scanned ticket without changing it', async () => {
    const token = makeTicket().qr_token;
    await expect(ticketService.verify('broken')).resolves.toEqual({
      ok: false,
      message: 'Invalid or tampered QR code',
      ticket: null,
    });

    ticketFindOne.mockResolvedValueOnce(null);
    await expect(ticketService.verify(token)).resolves.toEqual({ ok: false, message: 'Ticket not found', ticket: null });

    ticketFindOne.mockResolvedValueOnce(makeTicket({ status: 'CHECKED_IN', checked_in_at: null }));
    await expect(ticketService.verify(token)).resolves.toMatchObject({ ok: true, message: 'Already checked in' });

    ticketFindOne.mockResolvedValueOnce(makeTicket({ status: 'CHECKED_IN', checked_in_at: CHECKED_AT }));
    const at = await ticketService.verify(token);
    expect(at.message).toMatch(/^Already checked in at .+/);

    ticketFindOne.mockResolvedValueOnce(makeTicket());
    await expect(ticketService.verify(token)).resolves.toMatchObject({ ok: true, message: 'Valid ticket' });
  });
});

describe('ticketService.clubAdminForceAttendance', () => {
  const membershipDoc = (over: Record<string, unknown> = {}) => ({
    _id: MEMBERSHIP,
    user_id: USER,
    seats: 1,
    companions: [] as any[],
    save: jest.fn().mockResolvedValue(undefined),
    ...over,
  });

  const arrange = (ticketOver: Record<string, unknown> = {}, memberOver: Record<string, unknown> = {}) => {
    const ticket = makeTicket(ticketOver);
    const membership = membershipDoc(memberOver);
    memberFindOne.mockResolvedValue(membership);
    ticketFindOne.mockResolvedValue(ticket);
    return { ticket, membership };
  };

  it('checks the caller administers the pod before anything else', async () => {
    const denied = new Error('Access Denied');
    assertClubAdmin.mockRejectedValue(denied);

    await expect(
      ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR)
    ).rejects.toBe(denied);
    expect(assertClubAdmin).toHaveBeenCalledWith(ACTOR, String(POD));
    expect(memberFindOne).not.toHaveBeenCalled();
  });

  it('rejects a malformed member id', async () => {
    await expect(ticketService.clubAdminForceAttendance(String(POD), 'nope', ACTOR)).rejects.toMatchObject({
      message: 'Invalid member',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('refuses someone who is not a joined member of this pod', async () => {
    memberFindOne.mockResolvedValue(null);
    await expect(
      ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR)
    ).rejects.toMatchObject({ message: 'This member is not on the pod', extensions: { code: 'NOT_FOUND' } });
    expect(memberFindOne).toHaveBeenCalledWith({ _id: MEMBERSHIP, pod_id: POD, status: 'JOINED' });
  });

  it('refuses a member with no ticket, and a cancelled ticket', async () => {
    memberFindOne.mockResolvedValue(membershipDoc());
    ticketFindOne.mockResolvedValueOnce(null);
    await expect(
      ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR)
    ).rejects.toMatchObject({ message: 'Ticket not found', extensions: { code: 'NOT_FOUND' } });

    ticketFindOne.mockResolvedValueOnce(makeTicket({ status: 'CANCELLED' }));
    await expect(
      ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR)
    ).rejects.toMatchObject({ message: 'Ticket is cancelled', extensions: { code: 'BAD_REQUEST' } });
    expect(mark).not.toHaveBeenCalled();
  });

  it('returns an already-marked ticket unchanged', async () => {
    arrange({ status: 'CHECKED_IN', checked_in_at: CHECKED_AT });

    const res = await ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR, {
      companions: [{ name: 'Ravi Kumar' }],
    });

    expect(res.status).toBe('CHECKED_IN');
    expect(mark).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('marks by name with no code, recording the names it was read and dropping extras', async () => {
    const { ticket, membership } = arrange({ seats: 3 }, { seats: 3 });

    const res = await ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR, {
      companions: [
        { name: ' Ravi Kumar ' },
        { name: 'Meera Shah', phone_extension: '+91', phone_number: '9000000012' },
        { name: 'One Too Many' },
      ],
    });

    expect(membership.save).toHaveBeenCalledTimes(1);
    expect(membership.companions).toEqual([
      {
        name: 'Ravi Kumar',
        phone_extension: null,
        phone_number: '',
        added_at: NOW,
        verified_at: null,
        verified_medium: '',
        otp_challenge_id: null,
      },
      {
        name: 'Meera Shah',
        phone_extension: '+91',
        phone_number: '9000000012',
        added_at: NOW,
        verified_at: null,
        verified_medium: '',
        otp_challenge_id: null,
      },
    ]);
    expect(proof).not.toHaveBeenCalled();
    expect(mark).toHaveBeenCalledWith(ticket, ACTOR.id, 'CLUB_ADMIN_FORCE', null);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(logInfo).toHaveBeenCalledWith('ticket.service', 'clubAdminForceAttendance', {
      msg: 'attendance marked by the club admin without a scan',
      pod_doc_id: String(POD),
      membership_id: String(MEMBERSHIP),
      actor_id: ACTOR.id,
      otp_verified: false,
    });
    expect(res.status).toBe('CHECKED_IN');
  });

  it('spends the attendee’s one-time code and stores it on the mark', async () => {
    const { ticket, membership } = arrange();
    const verification = { challenge_id: 'otp-9', mediums: ['SMS'] };
    proof.mockResolvedValue(verification);

    await ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR, {
      otpChallengeId: 'otp-9',
    });

    expect(proof).toHaveBeenCalledWith('otp-9', MEMBERSHIP);
    expect(mark).toHaveBeenCalledWith(ticket, ACTOR.id, 'CLUB_ADMIN_FORCE', verification);
    expect(membership.save).not.toHaveBeenCalled();
    expect(logInfo.mock.calls[0][2].otp_verified).toBe(true);
  });

  it('records nothing for a single-seat booking, or once every seat is named', async () => {
    const { membership } = arrange({}, { seats: 1 });
    await ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR, {
      companions: [{ name: 'Ravi Kumar' }],
    });
    expect(membership.save).not.toHaveBeenCalled();

    const full = arrange({ seats: 2 }, { seats: 2, companions: [{ name: 'Already Here' }] }).membership;
    await ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR, {
      companions: [{ name: 'Ravi Kumar' }],
    });
    expect(full.save).not.toHaveBeenCalled();
    expect(full.companions).toEqual([{ name: 'Already Here' }]);
  });

  it('uses the ticket’s seat count when the booking carries none', async () => {
    const { membership } = arrange({ seats: 2 }, { seats: undefined, companions: undefined });

    await ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR, {
      companions: [{ name: 'Ravi Kumar' }, { name: 'Extra Person' }],
    });

    expect(membership.companions).toHaveLength(1);
    expect(membership.companions[0]).toMatchObject({ name: 'Ravi Kumar' });
  });

  it('treats a booking and ticket with no seat counts as one seat', async () => {
    const { membership } = arrange({ seats: undefined }, { seats: undefined });
    await ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR, {
      companions: [{ name: 'Ravi Kumar' }],
    });
    expect(membership.save).not.toHaveBeenCalled();
    expect(mark).toHaveBeenCalledTimes(1);
  });

  it('rejects a name the schema refuses, before marking anyone', async () => {
    arrange({ seats: 2 }, { seats: 2 });
    await expect(
      ticketService.clubAdminForceAttendance(String(POD), String(MEMBERSHIP), ACTOR, {
        companions: [{ name: 'R' }],
      })
    ).rejects.toMatchObject({ message: 'Validation failed', extensions: { code: 'BAD_USER_INPUT' } });
    expect(mark).not.toHaveBeenCalled();
  });
});
