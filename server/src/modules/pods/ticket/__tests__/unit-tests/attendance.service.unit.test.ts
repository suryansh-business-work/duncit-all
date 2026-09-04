/**
 * The attendance board and the host's by-hand mark, with every collaborator
 * replaced by a fake.
 *
 * These are the rules a host is paid on, so they are worth pinning down away
 * from a database: who may read the roster and in which capacity, when it
 * closes, whether a by-hand mark needs a one-time code, and that a code proves
 * exactly ONE booking and cannot be replayed against the rest of the list.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));

jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: { findById: jest.fn() } }));
jest.mock('@modules/pods/podMember/podMember.model', () => ({
  PodMemberModel: { find: jest.fn(), findOne: jest.fn() },
}));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { find: jest.fn() } }));
jest.mock('@modules/clubs/club/club.model', () => ({ ClubModel: { findById: jest.fn() } }));
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getPublicAppSettings: jest.fn(), getPodCompletionSettings: jest.fn() },
}));
jest.mock('@modules/platform/otp/otp.service', () => ({
  otpService: { request: jest.fn(), verify: jest.fn(), consume: jest.fn() },
}));
jest.mock('../../ticket.model', () => ({ TicketModel: { find: jest.fn(), findOne: jest.fn() } }));
jest.mock('@modules/clubs/clubAdmin/clubAdmin.service', () => ({
  clubAdminService: { assertClubAdminForPod: jest.fn() },
}));
jest.mock('../../ticket.service', () => ({ notifyAttendanceMarked: jest.fn() }));

import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { otpService } from '@modules/platform/otp/otp.service';
import { clubAdminService } from '@modules/clubs/clubAdmin/clubAdmin.service';
import { notifyAttendanceMarked } from '../../ticket.service';
import { TicketModel } from '../../ticket.model';
import { attendanceLock, attendanceService, markTicketPresent } from '../../attendance.service';

const POD_ID = '65b000000000000000000001';
const HOST_ID = '65b000000000000000000002';
const OTHER_ID = '65b000000000000000000003';
const MEMBER_ID = '65b000000000000000000004';
const USER_ID = '65b000000000000000000005';

const pods = PodModel as unknown as Record<string, jest.Mock>;
const members = PodMemberModel as unknown as Record<string, jest.Mock>;
const users = UserModel as unknown as Record<string, jest.Mock>;
const clubs = ClubModel as unknown as Record<string, jest.Mock>;
const tickets = TicketModel as unknown as Record<string, jest.Mock>;
const settings = settingsService as unknown as Record<string, jest.Mock>;
const otp = otpService as unknown as Record<string, jest.Mock>;
const clubAdmins = clubAdminService as unknown as Record<string, jest.Mock>;

/** `find().sort().lean()` and `findById().select().lean()` as one chain. */
const chain = (value: unknown) => ({
  sort: () => chain(value),
  select: () => chain(value),
  lean: () => Promise.resolve(value),
});

const host = { id: HOST_ID, roles: ['HOST'] };
const admin = { id: OTHER_ID, roles: ['USER'] };

const pod = (over: Record<string, unknown> = {}) => ({
  _id: POD_ID,
  pod_title: 'Sunday Badminton',
  pod_hosts_id: [HOST_ID],
  // A pod that ended an hour ago, RELATIVE to now: attendance is measured
  // against the host's completion window, so a fixture pinned to a fixed date
  // silently ages into EXPIRED and every roster test with it.
  pod_date_time: new Date(Date.now() - 3 * 60 * 60_000),
  pod_end_date_time: new Date(Date.now() - 60 * 60_000),
  club_id: null,
  completed_at: null,
  deleted_at: null,
  ...over,
});

const membership = (over: Record<string, unknown> = {}) => ({
  _id: MEMBER_ID,
  user_id: USER_ID,
  status: 'JOINED',
  seats: 1,
  companions: [],
  ...over,
});

const attendee = () => ({
  _id: USER_ID,
  profile: { first_name: 'Asha', last_name: 'Rao', profile_photo: 'https://cdn/a.jpg' },
  auth: { email: 'asha@duncit.com', phone: { extension: '+91', number: '9000000000' } },
});

const ticket = (over: Record<string, unknown> = {}) => ({
  _id: '65b000000000000000000006',
  membership_id: MEMBER_ID,
  ticket_code: 'DUN-TKT-001',
  status: 'ISSUED',
  checked_in_at: null,
  checked_in_by: null,
  checked_in_method: null,
  attendance_verification: null,
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

const arrangeBoard = (over: { pod?: unknown; memberships?: unknown[]; tickets?: unknown[]; otpRequired?: boolean } = {}) => {
  pods.findById.mockResolvedValue(over.pod ?? pod());
  members.find.mockReturnValue(chain(over.memberships ?? [membership()]));
  users.find.mockReturnValue(chain([attendee()]));
  tickets.find.mockResolvedValue(over.tickets ?? [ticket()]);
  settings.getPublicAppSettings.mockResolvedValue({
    attendance_otp_required: over.otpRequired ?? true,
  });
  settings.getPodCompletionSettings.mockResolvedValue({
    timeout_hours: over.completeTimeoutHours ?? 24,
    reminder_hours: 12,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('attendanceLock', () => {
  it('is OPEN for a live pod', () => {
    expect(attendanceLock(pod(), 24)).toBe('OPEN');
  });

  it('closes on completion, because the payout is already split by then', () => {
    expect(attendanceLock(pod({ completed_at: new Date() }), 24)).toBe('COMPLETED');
  });

  it('closes for a cancelled pod, which never happened', () => {
    expect(attendanceLock(pod({ deleted_at: new Date() }), 24)).toBe('CANCELLED');
  });

  it('reports a cancelled-and-completed pod as CANCELLED', () => {
    expect(attendanceLock(pod({ completed_at: new Date(), deleted_at: new Date() }), 24)).toBe('CANCELLED');
  });

  it('survives being handed nothing', () => {
    expect(attendanceLock(null, 24)).toBe('OPEN');
  });
});

describe('markTicketPresent', () => {
  it('is the one write that flips a ticket, and records the method behind it', async () => {
    const t = ticket();

    await markTicketPresent(t as never, HOST_ID, 'HOST_SCAN');

    expect(t.status).toBe('CHECKED_IN');
    expect(t.checked_in_method).toBe('HOST_SCAN');
    expect(String(t.checked_in_by)).toBe(HOST_ID);
    expect(t.checked_in_at).toBeInstanceOf(Date);
    expect(t.save).toHaveBeenCalled();
  });

  it('stores the proof when a path produced one, and null when it did not', async () => {
    const verified = ticket();
    const verification = {
      medium: 'WHATSAPP',
      phone_extension: '+91',
      phone_number: '9000000000',
      name: 'Asha Rao',
      verified_at: new Date(),
      challenge_id: 'c-1',
    };

    await markTicketPresent(verified as never, HOST_ID, 'HOST_MANUAL', verification as never);
    expect(verified.attendance_verification).toEqual(verification);

    const scanned = ticket();
    await markTicketPresent(scanned as never, HOST_ID, 'HOST_SCAN');
    expect(scanned.attendance_verification).toBeNull();
  });
});

describe('attendanceService.board', () => {
  it('refuses an id that is not a pod id at all', async () => {
    await expect(attendanceService.board('nonsense', host)).rejects.toThrow('Invalid pod id');
  });

  it('refuses a pod that does not exist', async () => {
    pods.findById.mockResolvedValue(null);

    await expect(attendanceService.board(POD_ID, host)).rejects.toThrow('Pod not found');
  });

  it('reads the roster for the pod’s host', async () => {
    arrangeBoard();

    const board = await attendanceService.board(POD_ID, host);

    expect(board.viewer).toBe('HOST');
    expect(board.pod_title).toBe('Sunday Badminton');
    expect(board.rows).toHaveLength(1);
    expect(board.rows[0]?.name).toBe('Asha Rao');
  });

  it('falls back to the club-admin guard for anyone else, and reports them as CLUB_ADMIN', async () => {
    arrangeBoard();
    clubAdmins.assertClubAdminForPod.mockResolvedValue(undefined);

    const board = await attendanceService.board(POD_ID, admin);

    expect(clubAdmins.assertClubAdminForPod).toHaveBeenCalled();
    expect(board.viewer).toBe('CLUB_ADMIN');
  });

  it('reports a host who is also the club’s admin as HOST — the stricter of the two', async () => {
    arrangeBoard();

    const board = await attendanceService.board(POD_ID, host);

    expect(board.viewer).toBe('HOST');
    expect(clubAdmins.assertClubAdminForPod).not.toHaveBeenCalled();
  });

  it('never asks a Club Admin for a code — the override exists for when proof cannot be produced', async () => {
    arrangeBoard({ otpRequired: true });
    clubAdmins.assertClubAdminForPod.mockResolvedValue(undefined);

    const board = await attendanceService.board(POD_ID, admin);

    expect(board.otp_required).toBe(false);
  });

  it('asks the host for a code only while the admin setting requires one', async () => {
    arrangeBoard({ otpRequired: true });
    expect((await attendanceService.board(POD_ID, host)).otp_required).toBe(true);

    arrangeBoard({ otpRequired: false });
    expect((await attendanceService.board(POD_ID, host)).otp_required).toBe(false);
  });

  it('counts marked people AND marked seats, which is what the payout is computed on', async () => {
    arrangeBoard({
      memberships: [membership(), membership({ _id: 'm-2', user_id: 'u-2', seats: 3, companions: [{}, {}] })],
      tickets: [ticket({ status: 'CHECKED_IN', checked_in_at: new Date() })],
    });

    const board = await attendanceService.board(POD_ID, host);

    expect(board.total_count).toBe(2);
    expect(board.marked_count).toBe(1);
    expect(board.total_seats).toBe(4);
    expect(board.marked_seats).toBe(1);
  });

  it('says how many more people a multi-seat booking still owes the door', async () => {
    arrangeBoard({ memberships: [membership({ seats: 3, companions: [{ name: 'Vikram' }] })] });

    const board = await attendanceService.board(POD_ID, host);

    expect(board.rows[0]?.companions_required).toBe(1);
    expect(board.rows[0]?.companions).toHaveLength(1);
  });

  it('closes the board once the pod is completed', async () => {
    arrangeBoard({ pod: pod({ completed_at: new Date() }) });

    const board = await attendanceService.board(POD_ID, host);

    expect(board.lock).toBe('COMPLETED');
    expect(board.can_mark).toBe(false);
  });

  it('reads the phone off the NESTED path, because a virtual does not survive .lean()', async () => {
    arrangeBoard();

    const board = await attendanceService.board(POD_ID, host);

    expect(board.rows[0]?.phone_extension).toBe('+91');
    expect(board.rows[0]?.phone_number).toBe('9000000000');
    expect(board.rows[0]?.email).toBe('asha@duncit.com');
  });

  it('names an attendee with no name at all rather than rendering a blank row', async () => {
    arrangeBoard();
    users.find.mockReturnValue(chain([{ _id: USER_ID, profile: {}, auth: {} }]));

    const board = await attendanceService.board(POD_ID, host);

    expect(board.rows[0]?.name).toBe('Guest');
  });

  it('lists no club admins for a pod with no club', async () => {
    arrangeBoard();

    expect((await attendanceService.board(POD_ID, host)).club_admins).toEqual([]);
    expect(clubs.findById).not.toHaveBeenCalled();
  });

  it('renders the club-admin contact card for a pod that has one', async () => {
    arrangeBoard({ pod: pod({ club_id: 'club-1' }) });
    clubs.findById.mockReturnValue(chain({ admin_user_ids: [OTHER_ID] }));
    users.find
      .mockReturnValueOnce(chain([attendee()]))
      .mockReturnValueOnce(
        chain([
          {
            _id: OTHER_ID,
            profile: { first_name: 'Meera', last_name: 'N' },
            auth: { email: 'meera@duncit.com', phone: { extension: '+91', number: '9000000001' } },
            communication: { whatsapp: { extension: '+91', number: '9000000001' } },
          },
        ])
      )
      .mockReturnValue(chain([]));

    const board = await attendanceService.board(POD_ID, host);

    expect(board.club_admins).toHaveLength(1);
    expect(board.club_admins[0]?.name).toBe('Meera N');
  });

  it('lists no admins for a club that has none', async () => {
    arrangeBoard({ pod: pod({ club_id: 'club-1' }) });
    clubs.findById.mockReturnValue(chain({ admin_user_ids: [] }));

    expect((await attendanceService.board(POD_ID, host)).club_admins).toEqual([]);
  });
});

describe('attendanceService.membershipOnPod', () => {
  it('refuses an attendee id that is not one', async () => {
    await expect(attendanceService.membershipOnPod(POD_ID, 'nope')).rejects.toThrow('Invalid attendee');
  });

  it('refuses somebody who is not on this pod', async () => {
    members.findOne.mockResolvedValue(null);

    await expect(attendanceService.membershipOnPod(POD_ID, MEMBER_ID)).rejects.toThrow(
      'This person is not on the pod'
    );
  });

  it('refuses a booking that is no longer active', async () => {
    members.findOne.mockResolvedValue(membership({ status: 'BACKOUT_IN_PROCESS' }));

    await expect(attendanceService.membershipOnPod(POD_ID, MEMBER_ID)).rejects.toThrow(
      'This booking is no longer active'
    );
  });

  it('returns the booking when it is markable', async () => {
    members.findOne.mockResolvedValue(membership());

    await expect(attendanceService.membershipOnPod(POD_ID, MEMBER_ID)).resolves.toMatchObject({
      _id: MEMBER_ID,
    });
  });
});

describe('attendanceService.requestOtp', () => {
  const input = {
    pod_doc_id: POD_ID,
    membership_id: MEMBER_ID,
    name: 'Asha Rao',
    phone_extension: '+91',
    phone_number: '9000000000',
    mediums: ['WHATSAPP', 'SMS'],
  };

  it('raises a code for the attendee, through the one shared service', async () => {
    arrangeBoard();
    members.findOne.mockResolvedValue(membership());
    otp.request.mockResolvedValue({ challenge_id: 'c-1' });

    await attendanceService.requestOtp(input, host);

    expect(otp.request).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'ATTENDANCE',
        mediums: input.mediums,
        context: expect.objectContaining({ membership_id: MEMBER_ID }),
      })
    );
  });

  it('refuses a Club Admin — a screen with no reason to text a member must not be able to', async () => {
    arrangeBoard();
    clubAdmins.assertClubAdminForPod.mockResolvedValue(undefined);

    await expect(attendanceService.requestOtp(input, admin)).rejects.toThrow(
      'Only the pod host verifies an attendee here'
    );
    expect(otp.request).not.toHaveBeenCalled();
  });

  it('refuses once attendance has closed', async () => {
    arrangeBoard({ pod: pod({ completed_at: new Date() }) });

    await expect(attendanceService.requestOtp(input, host)).rejects.toThrow('Attendance is closed for this pod');
  });

  it('needs a name to address the message to', async () => {
    arrangeBoard();
    members.findOne.mockResolvedValue(membership());

    await expect(attendanceService.requestOtp({ ...input, name: '   ' }, host)).rejects.toThrow(
      "Enter the attendee's name"
    );
  });
});

describe('attendanceService.verifyOtp', () => {
  it('checks the code without spending it — that is a separate step', async () => {
    otp.verify.mockResolvedValue(undefined);

    await expect(attendanceService.verifyOtp('c-1', '123456')).resolves.toBe(true);
    expect(otp.verify).toHaveBeenCalledWith('c-1', '123456');
    expect(otp.consume).not.toHaveBeenCalled();
  });
});

describe('attendanceService.hostMark', () => {
  const arrangeMark = (over: { otpRequired?: boolean; ticket?: unknown; membership?: unknown } = {}) => {
    arrangeBoard({ otpRequired: over.otpRequired ?? false });
    members.findOne.mockResolvedValue(over.membership ?? membership());
    // `in` rather than `??`: a deliberate null ticket is the no-ticket case.
    tickets.findOne.mockResolvedValue('ticket' in over ? over.ticket : ticket());
  };

  it('refuses a Club Admin, whose override is a different door', async () => {
    arrangeBoard();
    clubAdmins.assertClubAdminForPod.mockResolvedValue(undefined);

    await expect(attendanceService.hostMark(POD_ID, MEMBER_ID, null, admin)).rejects.toThrow(
      'Only the pod host can mark attendance here'
    );
  });

  it('refuses once the pod is completed, and says who to ask', async () => {
    arrangeBoard({ pod: pod({ completed_at: new Date() }) });

    await expect(attendanceService.hostMark(POD_ID, MEMBER_ID, null, host)).rejects.toThrow(
      'ask your Club Admin'
    );
  });

  it('marks the ticket when the admin setting asks for no code', async () => {
    const t = ticket();
    arrangeMark({ ticket: t });

    await attendanceService.hostMark(POD_ID, MEMBER_ID, null, host);

    expect(t.status).toBe('CHECKED_IN');
    expect(t.checked_in_method).toBe('HOST_MANUAL');
    expect(notifyAttendanceMarked).toHaveBeenCalledWith(t);
  });

  it('will not mark without a code while the setting requires one', async () => {
    arrangeMark({ otpRequired: true });

    await expect(attendanceService.hostMark(POD_ID, MEMBER_ID, null, host)).rejects.toThrow(
      'Verify the attendee’s phone number first'
    );
  });

  it('spends the code on exactly this booking, so it cannot be replayed on the roster', async () => {
    const t = ticket();
    arrangeMark({ otpRequired: true, ticket: t });
    otp.consume.mockResolvedValue({
      _id: 'c-1',
      mediums: ['WHATSAPP'],
      phone_extension: '+91',
      phone_number: '9000000000',
      recipient_name: 'Asha Rao',
      verified_at: new Date('2026-08-30T12:35:00.000Z'),
    });

    await attendanceService.hostMark(POD_ID, MEMBER_ID, 'c-1', host);

    const [challengeId, options] = otp.consume.mock.calls[0] as [string, { purpose: string; match: (c: unknown) => boolean }];
    expect(challengeId).toBe('c-1');
    expect(options.purpose).toBe('ATTENDANCE');
    expect(options.match({ context: { membership_id: MEMBER_ID } })).toBe(true);
    expect(options.match({ context: { membership_id: 'someone-else' } })).toBe(false);
    expect(t.attendance_verification).toMatchObject({ phone_number: '9000000000', challenge_id: 'c-1' });
  });

  it('refuses a booking whose extra people have not been named', async () => {
    arrangeMark({ membership: membership({ seats: 3, companions: [] }) });

    await expect(attendanceService.hostMark(POD_ID, MEMBER_ID, null, host)).rejects.toThrow(
      'add the other 2 people first'
    );
  });

  it('says "person" for a booking that owes exactly one', async () => {
    arrangeMark({ membership: membership({ seats: 2, companions: [] }) });

    await expect(attendanceService.hostMark(POD_ID, MEMBER_ID, null, host)).rejects.toThrow(
      'add the other 1 person first'
    );
  });

  it('refuses a cancelled ticket, and a booking with no ticket at all', async () => {
    arrangeMark({ ticket: ticket({ status: 'CANCELLED' }) });
    await expect(attendanceService.hostMark(POD_ID, MEMBER_ID, null, host)).rejects.toThrow('Ticket is cancelled');

    arrangeMark({ ticket: null });
    await expect(attendanceService.hostMark(POD_ID, MEMBER_ID, null, host)).rejects.toThrow('Ticket not found');
  });

  it('is idempotent — marking an already-marked ticket does not mail the attendee twice', async () => {
    const already = ticket({ status: 'CHECKED_IN', checked_in_at: new Date() });
    arrangeMark({ ticket: already });

    await attendanceService.hostMark(POD_ID, MEMBER_ID, null, host);

    expect(already.save).not.toHaveBeenCalled();
    expect(notifyAttendanceMarked).not.toHaveBeenCalled();
  });

  it('answers with the board, so the caller renders the roster it just changed', async () => {
    arrangeMark();

    const board = await attendanceService.hostMark(POD_ID, MEMBER_ID, null, host);

    expect(board.pod_id).toBe(String(new Types.ObjectId(POD_ID)));
    expect(board.rows).toHaveLength(1);
  });
});
