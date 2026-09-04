import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { podLiveEnd } from '@modules/pods/pod/pod.lifecycle';
import { settingsService } from '@modules/platform/settings/settings.service';
import { otpService } from '@modules/platform/otp/otp.service';
import type { OtpPurpose } from '@modules/platform/otp/otp.model';
import { TicketModel, type AttendanceMethod, type ITicket } from './ticket.model';

/** Why the roster is read-only, or OPEN when it is not. */
export type AttendanceLock = 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type AttendanceViewer = 'HOST' | 'CLUB_ADMIN';

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const notFound = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'NOT_FOUND' } });

/** `PodAttendanceOtpInput`, which both code-raising paths share. */
interface AttendanceOtpInput {
  pod_doc_id: string;
  membership_id: string;
  name: string;
  phone_extension: string;
  phone_number: string;
  mediums: readonly string[];
}

/**
 * These read the NESTED storage paths, never the flat legacy virtuals.
 *
 * `user.email` / `user.phone_number` are Mongoose virtuals over
 * `auth.email` / `auth.phone.number`, and a virtual does not survive
 * `.lean()` — which is what every read on this page uses. Reading the flat
 * name here returns undefined for every single row.
 */
const userEmail = (u: any) => u?.auth?.email ?? '';
const userPhoto = (u: any) => u?.profile?.profile_photo ?? '';
const userPhone = (u: any) => ({
  extension: u?.auth?.phone?.extension ?? '',
  number: u?.auth?.phone?.number ?? '',
});

const fullName = (u: any) =>
  [u?.profile?.first_name, u?.profile?.last_name].filter(Boolean).join(' ').trim() ||
  userEmail(u) ||
  'Guest';

/**
 * The instant the host's window to complete this pod runs out.
 *
 * Anchored on the pod's END, not its start: the window is time to settle a pod
 * that has finished, and anchoring it on the start would make a long pod's
 * deadline fall while the room is still full. Null when the pod cannot be
 * placed on a clock — no start means no deadline, never an expired one.
 */
export function podCompleteDeadline(pod: any, timeoutHours: number): Date | null {
  const end = podLiveEnd(pod);
  if (!end) return null;
  return new Date(end.getTime() + Math.max(1, timeoutHours) * 60 * 60_000);
}

/**
 * When attendance closes.
 *
 * Completion is one deadline: completing a pod computes the payout from exactly
 * who is marked, creates the payout releases and hands them to Finance, so
 * adding someone afterwards would claim money that was already split. A
 * cancelled pod never happened, so nobody attended it.
 *
 * EXPIRED is the other, and it is the one that closes a roster nobody ever
 * settled. A pod left uncompleted used to stay markable forever, so attendance
 * — the record a host is PAID on — could be written weeks later against
 * whatever the host remembered. `pod_complete_timeout_hours` (Admin > Pods >
 * Pod Settings) ends that: the host gets that many hours after the pod ends to
 * complete it, and past them their side of the roster is shut.
 *
 * This is why the page a host lands on can say "ask your Club Admin" and mean
 * it — the Club Admin's override is the only path left on an EXPIRED pod too,
 * and it is deliberately NOT reopened for the host here.
 */
export function attendanceLock(
  pod: any,
  timeoutHours: number,
  now: Date = new Date()
): AttendanceLock {
  if (pod?.deleted_at) return 'CANCELLED';
  if (pod?.completed_at) return 'COMPLETED';
  const deadline = podCompleteDeadline(pod, timeoutHours);
  if (deadline && now.getTime() > deadline.getTime()) return 'EXPIRED';
  return 'OPEN';
}

/**
 * Whether THIS viewer may still write to the roster.
 *
 * The two locks part company here. COMPLETED and CANCELLED shut the roster for
 * everybody — the money is split, or there was no pod. EXPIRED shuts the
 * HOST's side only: it is the host's window that ran out, and the Club Admin's
 * override exists precisely for the roster the host never finished (rule 41).
 * Taking it away from them too would leave an unmarked attendee with nobody at
 * all who can record that they came.
 */
export const canMarkAttendance = (lock: AttendanceLock, viewer: AttendanceViewer): boolean =>
  lock === 'OPEN' || (lock === 'EXPIRED' && viewer === 'CLUB_ADMIN');

/** How far either side of the pod a link-open still counts as attending. */
const VIRTUAL_JOIN_LEAD_MS = 60 * 60_000;
/** A virtual pod created before its end became required has no end to close
 * the window on; this is the widest a session is assumed to run. */
const VIRTUAL_DEFAULT_DURATION_MS = 4 * 60 * 60_000;

/**
 * Whether opening the meeting link right now counts as attending.
 *
 * A virtual pod has no door, so the window IS the door: from an hour before
 * the start — people join early — to an hour after the end. A link opened the
 * day before is somebody checking it works, not attendance, and must not be
 * paid on.
 */
export function withinVirtualJoinWindow(pod: any, now: Date = new Date()): boolean {
  const start = pod?.pod_date_time ? new Date(pod.pod_date_time).getTime() : null;
  if (!start || Number.isNaN(start)) return false;
  const end = pod?.pod_end_date_time
    ? new Date(pod.pod_end_date_time).getTime()
    : start + VIRTUAL_DEFAULT_DURATION_MS;
  const at = now.getTime();
  return at >= start - VIRTUAL_JOIN_LEAD_MS && at <= end + VIRTUAL_JOIN_LEAD_MS;
}

/**
 * Who is allowed to read this pod's roster, and in which capacity.
 *
 * Host and Club Admin see the SAME board; what differs is what they may do with
 * it, which is why the answer is a role rather than a boolean. A host who is
 * also the club's admin is reported as HOST — the stricter of the two, so the
 * OTP gate is not silently skipped by an accident of club membership.
 */
async function resolveViewer(
  podDocId: string,
  actor: Readonly<{ id: string; roles: string[] }>
): Promise<{ pod: any; viewer: AttendanceViewer }> {
  if (!Types.ObjectId.isValid(podDocId)) throw badInput('Invalid pod id');
  const pod = await PodModel.findById(podDocId);
  if (!pod) throw notFound('Pod not found');

  const isHost = (pod.pod_hosts_id ?? []).some((id: any) => String(id) === actor.id);
  if (isHost) return { pod, viewer: 'HOST' };

  const { clubAdminService } = await import('@modules/clubs/clubAdmin/clubAdmin.service');
  // Throws FORBIDDEN itself when they are neither — the same guard the force
  // mark already uses, so there is one definition of "admin of this club".
  await clubAdminService.assertClubAdminForPod(actor as any, podDocId);
  return { pod, viewer: 'CLUB_ADMIN' };
}

/**
 * The single write that marks a ticket present.
 *
 * Every path — door scan, host's by-hand mark, Club Admin override, admin
 * check-in — lands here, so the method and the proof behind it can never be
 * recorded by one path and forgotten by another.
 */
export async function markTicketPresent(
  ticket: ITicket,
  by: string,
  method: AttendanceMethod,
  verification: ITicket['attendance_verification'] = null
): Promise<void> {
  ticket.status = 'CHECKED_IN';
  ticket.checked_in_at = new Date();
  ticket.checked_in_by = new Types.ObjectId(by);
  ticket.checked_in_method = method;
  ticket.attendance_verification = verification;
  await ticket.save();
}

/**
 * Spend a verified code and hand back the proof a ticket records.
 *
 * Both by-hand doors land here — the host's mark, and the Club Admin's — so the
 * binding is written once. `match` is what stops one code being replayed across
 * a roster: a challenge raised for one booking can only ever be spent on that
 * booking, whichever mutation is spending it.
 */
export async function consumeAttendanceProof(
  challengeId: string,
  membershipId: unknown
): Promise<ITicket['attendance_verification']> {
  const challenge = await otpService.consume(challengeId, {
    purpose: 'ATTENDANCE',
    match: (c) => String((c.context as any)?.membership_id ?? '') === String(membershipId),
  });
  return {
    medium: challenge.mediums.join(','),
    phone_extension: challenge.phone_extension,
    phone_number: challenge.phone_number,
    name: challenge.recipient_name,
    verified_at: challenge.verified_at ?? new Date(),
    challenge_id: String(challenge._id),
  };
}

/**
 * Whether this person's own attendance at this pod has been marked.
 *
 * "Was I there" has exactly one answer, and a JOINED membership is not it: a
 * membership says they booked a seat, a CHECKED_IN ticket says somebody at the
 * door said they turned up. Anything that belongs to the people who actually
 * came — the pod's rating link is the first — asks this rather than the roster.
 */
export async function hasMarkedAttendance(podId: string, userId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(podId) || !Types.ObjectId.isValid(userId)) return false;
  const marked = await TicketModel.exists({
    pod_id: new Types.ObjectId(podId),
    user_id: new Types.ObjectId(userId),
    status: 'CHECKED_IN',
  });
  return marked !== null;
}

/** The same rule read the other way round: every pod this person is marked present at. */
export async function markedPodIdsFor(userId: string): Promise<Types.ObjectId[]> {
  if (!Types.ObjectId.isValid(userId)) return [];
  const tickets = await TicketModel.find({
    user_id: new Types.ObjectId(userId),
    status: 'CHECKED_IN',
  })
    .select('pod_id')
    .lean();
  return tickets.map((t) => t.pod_id as Types.ObjectId);
}

/** The club's admins, as the "who can help me" card renders them. */
async function clubAdminsFor(pod: any) {
  if (!pod?.club_id) return [];
  const club = await ClubModel.findById(pod.club_id).select('admin_user_ids').lean();
  const ids = ((club as any)?.admin_user_ids ?? []).filter(Boolean);
  if (ids.length === 0) return [];
  const users = await UserModel.find({ _id: { $in: ids } })
    .select('profile auth.email auth.phone communication.whatsapp')
    .lean();
  return users.map((u: any) => {
    const phone = userPhone(u);
    const wa = u?.communication?.whatsapp ?? {};
    return {
      id: String(u._id),
      name: fullName(u),
      avatar_url: userPhoto(u),
      email: userEmail(u),
      phone: `${phone.extension} ${phone.number}`.trim(),
      whatsapp: `${wa.extension ?? ''} ${wa.number ?? ''}`.trim(),
    };
  });
}

const toCompanion = (c: any) => ({
  name: c?.name ?? '',
  phone_extension: c?.phone_extension ?? '',
  phone_number: c?.phone_number ?? '',
  added_at: c?.added_at?.toISOString?.() ?? '',
});

/** One roster line: the booking, the person, and whether they are marked. */
function toRow(membership: any, user: any, ticket: ITicket | undefined, markedBy: Map<string, string>) {
  const seats = membership.seats ?? 1;
  const companions = (membership.companions ?? []).map(toCompanion);
  const verification = ticket?.attendance_verification ?? null;
  return {
    membership_id: String(membership._id),
    user_id: String(membership.user_id),
    ticket_id: ticket ? String(ticket._id) : null,
    ticket_code: ticket?.ticket_code ?? '',
    name: fullName(user),
    avatar_url: userPhoto(user),
    email: userEmail(user),
    // Pre-fills the OTP form: the host confirms the number rather than
    // retyping it, and a blank one is exactly the case that needs typing.
    phone_extension: userPhone(user).extension,
    phone_number: userPhone(user).number,
    seats,
    attended: ticket?.status === 'CHECKED_IN',
    attended_at: ticket?.checked_in_at?.toISOString?.() ?? null,
    marked_method: ticket?.checked_in_method ?? null,
    marked_by_name: markedBy.get(String(ticket?.checked_in_by ?? '')) ?? '',
    verified_phone: verification
      ? `${verification.phone_extension} ${verification.phone_number}`.trim()
      : '',
    companions,
    // What the door still owes this booking: a multi-seat ticket cannot be
    // marked until every extra person has a name and a number.
    companions_required: Math.max(seats - 1 - companions.length, 0),
  };
}

/** The names behind `checked_in_by`, so a row can say who marked it. */
async function markerNames(tickets: readonly ITicket[]): Promise<Map<string, string>> {
  const ids = [...new Set(tickets.map((t) => String(t.checked_in_by ?? '')).filter(Boolean))];
  if (ids.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: ids } })
    .select('profile auth.email')
    .lean();
  return new Map(users.map((u: any) => [String(u._id), fullName(u)]));
}

export const attendanceService = {
  /**
   * A joined member opens a virtual pod's meeting — and is marked present.
   *
   * The link is already readable on the Pod for a joined member, so this is
   * not about access; it is about the RECORD. Settlement pays the host from
   * CHECKED_IN bookings, and a virtual pod has no door to scan at, so before
   * this a paid virtual pod settled its host at zero unless every attendee was
   * marked by hand, one-time code and all. Opening the link inside the pod
   * window is the honest online equivalent of the scan, and it goes through
   * the same write as every other path, stamped VIRTUAL_JOIN.
   *
   * A multi-seat booking is marked whole: the people it admits are on the same
   * call, and there is no door to name them at. The host is handed the link
   * and marks nothing — hosts are never attendees of their own pod.
   */
  async joinMeeting(podDocId: string, actor: Readonly<{ id: string; roles: string[] }>) {
    if (!Types.ObjectId.isValid(podDocId)) throw badInput('Invalid pod id');
    const pod = await PodModel.findById(podDocId);
    if (!pod) throw notFound('Pod not found');
    if ((pod.pod_mode ?? 'PHYSICAL') !== 'VIRTUAL') throw badInput('This pod is not virtual');
    const meetingUrl = String(pod.meeting_url ?? '').trim();
    if (!meetingUrl) throw badInput('This pod has no meeting link yet');

    const access = {
      meeting_url: meetingUrl,
      meeting_notes: pod.meeting_notes ?? null,
      attendance_marked: false,
    };
    const isHost = (pod.pod_hosts_id ?? []).some((id: any) => String(id) === actor.id);
    if (isHost) return access;

    const membership = await PodMemberModel.findOne({
      pod_id: pod._id,
      user_id: new Types.ObjectId(actor.id),
      status: 'JOINED',
    });
    if (!membership) {
      throw new GraphQLError('Join this pod to get the meeting link', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const ticket = await TicketModel.findOne({ membership_id: membership._id });
    if (!ticket || ticket.status === 'CANCELLED') return access;
    if (ticket.status === 'CHECKED_IN') return { ...access, attendance_marked: true };
    // Outside the window the link still opens — checking it works the day
    // before is reasonable — but nothing is recorded, because nothing was
    // attended. Completion closes it for good, as it does every other path.
    const { timeout_hours } = await settingsService.getPodCompletionSettings();
    if (attendanceLock(pod, timeout_hours) !== 'OPEN' || !withinVirtualJoinWindow(pod)) {
      return access;
    }

    await markTicketPresent(ticket, actor.id, 'VIRTUAL_JOIN');
    const { notifyAttendanceMarked } = await import('./ticket.service');
    await notifyAttendanceMarked(ticket);
    logs.server.info('attendance.service', 'virtualJoin', {
      msg: 'attendance marked by opening the meeting link',
      pod_doc_id: podDocId,
      membership_id: String(membership._id),
    });
    return { ...access, attendance_marked: true };
  },

  /**
   * Everything the attendance page renders, in one read.
   *
   * One query for both surfaces on purpose: the host's page and the Club
   * Admin's section show the same roster, and two queries would be two places
   * for "is this person marked" to disagree.
   */
  async board(podDocId: string, actor: Readonly<{ id: string; roles: string[] }>) {
    const { pod, viewer } = await resolveViewer(podDocId, actor);
    const memberships = await PodMemberModel.find({
      pod_id: pod._id,
      status: { $in: ['JOINED', 'BACKOUT_IN_PROCESS'] },
    })
      .sort({ joined_at: 1 })
      .lean();

    const [users, tickets, settings, completion, club_admins] = await Promise.all([
      UserModel.find({ _id: { $in: memberships.map((m: any) => m.user_id) } })
        .select('profile auth.email auth.phone')
        .lean(),
      TicketModel.find({ pod_id: pod._id }),
      settingsService.getPublicAppSettings(),
      settingsService.getPodCompletionSettings(),
      clubAdminsFor(pod),
    ]);

    const userById = new Map(users.map((u: any) => [String(u._id), u]));
    const ticketByMembership = new Map(tickets.map((t) => [String(t.membership_id), t]));
    const markedBy = await markerNames(tickets);

    const rows = memberships.map((m: any) =>
      toRow(m, userById.get(String(m.user_id)), ticketByMembership.get(String(m._id)), markedBy)
    );
    const attended = rows.filter((r) => r.attended);
    const lock = attendanceLock(pod, completion.timeout_hours);
    const deadline = podCompleteDeadline(pod, completion.timeout_hours);

    return {
      pod_id: String(pod._id),
      pod_title: pod.pod_title ?? '',
      pod_date_time: pod.pod_date_time?.toISOString?.() ?? null,
      pod_end_date_time: pod.pod_end_date_time?.toISOString?.() ?? null,
      pod_mode: pod.pod_mode ?? 'PHYSICAL',
      viewer,
      lock,
      // Per VIEWER, not per lock: an expired roster is shut to the host and
      // still open to the Club Admin who is being asked to fix it.
      can_mark: canMarkAttendance(lock, viewer),
      // What the host is racing, so the page can say the date rather than
      // "soon" — and, once it has passed, why the buttons are gone.
      complete_deadline: deadline?.toISOString() ?? null,
      complete_timeout_hours: completion.timeout_hours,
      // The Club Admin's mark is the override for when proof cannot be
      // produced, so asking it for proof would defeat its only purpose.
      otp_required: viewer === 'HOST' && settings.attendance_otp_required,
      marked_count: attended.length,
      total_count: rows.length,
      marked_seats: attended.reduce((sum, r) => sum + r.seats, 0),
      total_seats: rows.reduce((sum, r) => sum + r.seats, 0),
      rows,
      club_admins,
    };
  },

  /**
   * Send a one-time code to somebody this booking admits.
   *
   * Authorised as the pod's host OR as an admin of its club, then delegated to
   * the shared otpService — the medium (SMS, WhatsApp, or both) is passed
   * straight through as a parameter, and so is the PURPOSE: the buyer's own
   * attendance code and a companion's are the same request to the same service,
   * addressed to a different person. They stay separate purposes because they
   * are raised against the same booking, so a shared one would let a
   * companion's proof mark the buyer.
   *
   * Which viewers may raise one is per PURPOSE, not per service. The attendee's
   * own code is open to the Club Admin, because a code is an OPTION on their
   * board — their override still marks without one, so this widens what they
   * can prove, never what they can reach: the booking has to be live on a pod
   * of a club they administer. A COMPANION's code stays host-only. That one is
   * addressed to somebody who is on no roster at all, so it is only tied to a
   * person by the host standing at a door with them, and opening it wider is
   * the generic "text any number" entry point rule 41 refuses to build.
   */
  async issueOtp(
    purpose: OtpPurpose,
    input: Readonly<AttendanceOtpInput>,
    actor: Readonly<{ id: string; roles: string[] }>,
    hostOnly = false
  ) {
    // resolveViewer throws FORBIDDEN for anyone who is neither, so reaching
    // this line already means the caller may mark this roster.
    const { pod, viewer } = await resolveViewer(input.pod_doc_id, actor);
    if (hostOnly && viewer !== 'HOST') {
      throw new GraphQLError('Only the pod host verifies an attendee here', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    const { timeout_hours } = await settingsService.getPodCompletionSettings();
    if (!canMarkAttendance(attendanceLock(pod, timeout_hours), viewer)) {
      throw badInput('Attendance is closed for this pod');
    }
    const membership = await this.membershipOnPod(input.pod_doc_id, input.membership_id);
    const name = String(input.name ?? '').trim();
    if (!name) throw badInput("Enter the attendee's name");

    return otpService.request({
      purpose,
      mediums: input.mediums,
      phone_extension: input.phone_extension,
      phone_number: input.phone_number,
      recipient_name: name,
      context: {
        pod_id: String(pod._id),
        membership_id: String(membership._id),
      },
      requested_by: actor.id,
    });
  },

  /** The attendee's own number, proved before a by-hand mark. Host or Club
   * Admin: both boards offer the code, and only the host's requires it. */
  requestOtp(
    input: Readonly<AttendanceOtpInput>,
    actor: Readonly<{ id: string; roles: string[] }>
  ) {
    return this.issueOtp('ATTENDANCE', input, actor);
  },

  /**
   * One of the extra people a multi-seat booking admits, proved at the door.
   *
   * Spent when the group is recorded rather than here, which is why the host
   * works through them one at a time: a code proves the person standing in
   * front of them, not the booking.
   */
  requestCompanionOtp(
    input: Readonly<AttendanceOtpInput>,
    actor: Readonly<{ id: string; roles: string[] }>
  ) {
    return this.issueOtp('POD_COMPANION', input, actor, true);
  },

  /** Check the code the attendee read out. Spending it is a separate step. */
  async verifyOtp(challengeId: string, otp: string) {
    await otpService.verify(challengeId, otp);
    return true;
  },

  /** The booking this mark is about, or a clear reason it is not markable. */
  async membershipOnPod(podDocId: string, membershipId: string) {
    if (!Types.ObjectId.isValid(membershipId)) throw badInput('Invalid attendee');
    const membership = await PodMemberModel.findOne({
      _id: new Types.ObjectId(membershipId),
      pod_id: new Types.ObjectId(podDocId),
    });
    if (!membership) throw notFound('This person is not on the pod');
    if (membership.status !== 'JOINED') {
      throw badInput('This booking is no longer active');
    }
    return membership;
  },

  /**
   * The host marks one attendee present without a scan.
   *
   * The scan stays the preferred proof — it is evidence the person was at the
   * door — but a dead phone or a lost ticket used to leave the host with no
   * path at all, and an unmarked attendee is one the host is not paid for. So
   * this exists, and it is gated: while Admin > Pods > Pod Settings requires
   * OTP, the attendee's own number has to answer a code first, and that proof
   * is spent on exactly this one booking.
   */
  async hostMark(
    podDocId: string,
    membershipId: string,
    otpChallengeId: string | null | undefined,
    actor: Readonly<{ id: string; roles: string[] }>
  ) {
    const { pod, viewer } = await resolveViewer(podDocId, actor);
    if (viewer !== 'HOST') {
      throw new GraphQLError('Only the pod host can mark attendance here', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    const completion = await settingsService.getPodCompletionSettings();
    const lock = attendanceLock(pod, completion.timeout_hours);
    if (lock === 'EXPIRED') {
      throw badInput(
        `The ${completion.timeout_hours}-hour window to complete this pod has passed, so attendance can no longer be marked here — ask your Club Admin to mark it`
      );
    }
    if (lock !== 'OPEN') {
      throw badInput('Attendance is closed for this pod — ask your Club Admin to mark it');
    }
    const membership = await this.membershipOnPod(podDocId, membershipId);

    const settings = await settingsService.getPublicAppSettings();
    let verification: ITicket['attendance_verification'] = null;
    if (settings.attendance_otp_required) {
      if (!otpChallengeId) throw badInput('Verify the attendee’s phone number first');
      verification = await consumeAttendanceProof(otpChallengeId, membership._id);
    }

    const ticket = await TicketModel.findOne({ membership_id: membership._id });
    if (!ticket) throw notFound('Ticket not found');
    if (ticket.status === 'CANCELLED') throw badInput('Ticket is cancelled');

    // A multi-seat booking is a number until the extra people are named, and
    // the same gate the scanner applies has to apply here.
    const seats = membership.seats ?? 1;
    const missing = Math.max(seats - 1 - (membership.companions ?? []).length, 0);
    if (missing > 0) {
      throw new GraphQLError(
        `This booking admits ${seats} — add the other ${missing} ${missing === 1 ? 'person' : 'people'} first`,
        { extensions: { code: 'COMPANIONS_REQUIRED', companions_required: missing } }
      );
    }

    if (ticket.status !== 'CHECKED_IN') {
      await markTicketPresent(ticket, actor.id, 'HOST_MANUAL', verification);
      const { notifyAttendanceMarked } = await import('./ticket.service');
      await notifyAttendanceMarked(ticket);
      logs.server.info('attendance.service', 'hostMark', {
        msg: 'attendance marked by hand',
        pod_doc_id: podDocId,
        membership_id: membershipId,
        actor_id: actor.id,
        otp_verified: !!verification,
      });
    }
    return this.board(podDocId, actor);
  },
};
