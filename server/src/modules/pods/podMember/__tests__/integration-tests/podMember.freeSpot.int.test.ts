import { Types } from 'mongoose';
import { podMemberService } from '../../podMember.service';
import { PodMemberModel } from '../../podMember.model';
import { BackoutRequestModel } from '../../backoutRequest.model';
import { participationForMembership } from '../../membershipTimeline.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { podSeatsTaken } from '@modules/pods/pod/pod.seats';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { ticketService } from '@modules/pods/ticket/ticket.service';
import { signTicketToken } from '@modules/pods/ticket/ticket.token';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import * as emailService from '@services/email/email.service';

/**
 * "Cancel the spot" — a free pod's only way out. No BackoutRequest, no attempt,
 * no refund, no "spot filled" message; the seats go back, the ticket stops
 * scanning, and the member can join again as often as they like on the same
 * booking row.
 */

let spotFilledEmail: jest.SpyInstance;
let refundEmail: jest.SpyInstance;

beforeEach(() => {
  spotFilledEmail = jest.spyOn(emailService, 'sendBackoutSpotFilledEmail').mockResolvedValue(undefined as never);
  refundEmail = jest.spyOn(emailService, 'sendPodRefundEmail').mockResolvedValue(undefined as never);
  jest.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined as never);
  jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const HOST = new Types.ObjectId();

const makePod = (over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `free-${new Types.ObjectId().toString()}`,
    pod_title: 'Free pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_mode: 'PHYSICAL',
    pod_type: 'FREE',
    pod_amount: 0,
    pod_hosts_id: [HOST],
    pod_attendees: [HOST],
    pod_date_time: new Date(Date.now() + 86_400_000),
    no_of_spots: 6,
    is_active: true,
    ...over,
  });

const makeUser = () =>
  UserModel.create({
    auth: { email: `m-${new Types.ObjectId().toString()}@x.com` },
    profile: { first_name: 'Mia', last_name: 'Member' },
  } as never);

const seatsOf = async (pod: { _id: unknown }) => podSeatsTaken((await PodModel.findById(pod._id).lean())!);
const ticketOf = (membershipId: string) => TicketModel.findOne({ membership_id: membershipId });

describe('cancelFreeSpot', () => {
  it('join → cancel → join → cancel, many times: exact seats, one row, no backout, ticket off then on', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const uid = String(user._id);
    expect(await seatsOf(pod)).toBe(1); // the host

    let firstId: string | null = null;
    for (let round = 1; round <= 5; round += 1) {
      const joined = await podMemberService.joinFree(String(pod._id), uid, null, 2);
      firstId ??= joined.id;
      expect(joined).toMatchObject({ id: firstId, status: 'JOINED', seats: 2, spot_cancelled_at: null });
      expect(await seatsOf(pod)).toBe(3);
      expect((await ticketOf(firstId))!.status).toBe('VALID');

      const cancelled = await podMemberService.cancelFreeSpot(String(pod._id), uid);
      expect(cancelled.status).toBe('BACKED_OUT');
      expect(cancelled.refund_status).toBe('NONE');
      expect(cancelled.backout_count).toBe(0);
      expect(cancelled.spot_cancelled_at).not.toBeNull();
      expect(await seatsOf(pod)).toBe(1);
      expect((await ticketOf(firstId))!.status).toBe('CANCELLED');
    }

    expect(await PodMemberModel.countDocuments({ pod_id: pod._id, user_id: user._id })).toBe(1);
    expect((await PodMemberModel.findById(firstId))!.spot_cancel_count).toBe(5);
    expect(await BackoutRequestModel.countDocuments()).toBe(0);
    expect(await TicketModel.countDocuments({ membership_id: firstId })).toBe(1);
    expect(spotFilledEmail).not.toHaveBeenCalled();
    expect(refundEmail).not.toHaveBeenCalled();
  });

  it('makes the QR unscannable after a cancel and scannable again after a re-join', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const joined = await podMemberService.joinFree(String(pod._id), String(user._id));
    const ticket = (await ticketOf(joined.id))!;
    const token = ticket.qr_token || signTicketToken({ t: ticket.ticket_code, u: String(user._id), p: String(pod._id), m: joined.id });

    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));
    expect(await ticketService.verify(token)).toMatchObject({ ok: false, message: 'Ticket cancelled' });

    await podMemberService.joinFree(String(pod._id), String(user._id));
    expect(await ticketService.verify(token)).toMatchObject({ ok: true, message: 'Valid ticket' });
  });

  it('releases every seat of a multi-seat booking — there is no partial cancel', async () => {
    const pod = await makePod({ no_of_spots: 10 });
    const user = await makeUser();
    await podMemberService.joinFree(String(pod._id), String(user._id), null, 4);
    expect(await seatsOf(pod)).toBe(5);

    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));

    const fresh = (await PodModel.findById(pod._id).lean())!;
    expect(fresh.extra_seats).toBe(0);
    expect(fresh.pod_attendees.map(String)).toEqual([String(HOST)]);
  });

  it('is safe under a double submit: the seats are released once and both calls answer the cancelled booking', async () => {
    const pod = await makePod({ no_of_spots: 10 });
    const other = await makeUser();
    await podMemberService.joinFree(String(pod._id), String(other._id), null, 3);
    const user = await makeUser();
    await podMemberService.joinFree(String(pod._id), String(user._id), null, 2);
    expect(await seatsOf(pod)).toBe(6);

    const [a, b] = await Promise.all([
      podMemberService.cancelFreeSpot(String(pod._id), String(user._id)),
      podMemberService.cancelFreeSpot(String(pod._id), String(user._id)),
    ]);

    expect(a.status).toBe('BACKED_OUT');
    expect(b.status).toBe('BACKED_OUT');
    expect(a.id).toBe(b.id);
    // The other member's seats are untouched — nothing was released twice.
    expect(await seatsOf(pod)).toBe(4);
    expect((await PodModel.findById(pod._id).lean())!.extra_seats).toBe(2);
    expect((await PodMemberModel.findById(a.id))!.spot_cancel_count).toBe(1);
  });

  it('is safe under a double join after a cancel: one booking, seats claimed once', async () => {
    const pod = await makePod({ no_of_spots: 10 });
    const user = await makeUser();
    await podMemberService.joinFree(String(pod._id), String(user._id), null, 2);
    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));

    const [a, b] = await Promise.all([
      podMemberService.joinFree(String(pod._id), String(user._id), null, 2),
      podMemberService.joinFree(String(pod._id), String(user._id), null, 2),
    ]);

    expect(a.id).toBe(b.id);
    expect(await PodMemberModel.countDocuments({ user_id: user._id, status: 'JOINED' })).toBe(1);
    expect(await seatsOf(pod)).toBe(3);
  });

  it('refuses a member whose ticket was checked in — a cancel must not erase a scan', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const joined = await podMemberService.joinFree(String(pod._id), String(user._id));
    await TicketModel.updateOne({ membership_id: joined.id }, { $set: { status: 'CHECKED_IN', checked_in_at: new Date() } });

    await expect(podMemberService.cancelFreeSpot(String(pod._id), String(user._id))).rejects.toMatchObject({
      message: 'You have already been checked in at this pod, so your spot can no longer be cancelled.',
      extensions: { code: 'ALREADY_CHECKED_IN' },
    });
    expect((await PodMemberModel.findById(joined.id))!.status).toBe('JOINED');
    expect(await seatsOf(pod)).toBe(2);
    const state = await podMemberService.getState(String(pod._id), String(user._id));
    expect(state.can_cancel_spot).toBe(false);
  });

  it('refuses once the pod has started, for a non-member, for a paid pod and for an unknown pod', async () => {
    const started = await makePod({ pod_date_time: new Date(Date.now() - 60_000) });
    const user = await makeUser();
    await expect(podMemberService.cancelFreeSpot(String(started._id), String(user._id))).rejects.toMatchObject({
      extensions: { code: 'BAD_REQUEST' },
    });

    const pod = await makePod();
    await expect(podMemberService.cancelFreeSpot(String(pod._id), String(user._id))).rejects.toMatchObject({
      message: 'You are not a member of this pod',
      extensions: { code: 'NOT_FOUND' },
    });

    const paid = await makePod({ pod_type: 'PAID', pod_amount: 300 });
    await expect(podMemberService.cancelFreeSpot(String(paid._id), String(user._id))).rejects.toMatchObject({
      extensions: { code: 'NOT_FREE_POD' },
    });

    await expect(podMemberService.cancelFreeSpot('nope', String(user._id))).rejects.toThrow('Pod not found');
  });
});

describe('the old backout calls on a free pod (installed app builds)', () => {
  it('backoutPod cancels the spot: whole booking, no request, no attempt, seats ignored', async () => {
    const pod = await makePod();
    const user = await makeUser();
    await podMemberService.joinFree(String(pod._id), String(user._id), null, 3);

    const out = await podMemberService.backout(String(pod._id), String(user._id), 1);

    expect(out).toMatchObject({ status: 'BACKED_OUT', seats: 3, backout_count: 0, refund_status: 'NONE' });
    expect(out.spot_cancelled_at).not.toBeNull();
    expect(await seatsOf(pod)).toBe(1);
    expect(await BackoutRequestModel.countDocuments()).toBe(0);
  });

  it('rejoinPod and cancelBackoutPod join the free pod again with the earlier seats', async () => {
    const pod = await makePod();
    const user = await makeUser();
    await podMemberService.joinFree(String(pod._id), String(user._id), null, 2);
    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));

    const back = await podMemberService.rejoin(String(pod._id), String(user._id));
    expect(back).toMatchObject({ status: 'JOINED', seats: 2 });
    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));

    const kept = await podMemberService.cancelBackout(String(pod._id), String(user._id));
    expect(kept).toMatchObject({ status: 'JOINED', seats: 2 });
    // Already in: both answer the booking rather than erroring.
    expect((await podMemberService.cancelBackout(String(pod._id), String(user._id))).status).toBe('JOINED');
    expect(await seatsOf(pod)).toBe(3);

    const stranger = await makeUser();
    await expect(podMemberService.rejoin(String(pod._id), String(stranger._id))).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('lets a member stuck BACKOUT_IN_PROCESS from before join again, closing the old request', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const legacy = await PodMemberModel.create({
      pod_id: pod._id,
      user_id: user._id,
      status: 'BACKOUT_IN_PROCESS',
      source: 'FREE',
      refund_status: 'NOT_ELIGIBLE',
      backout_count: 1,
      backed_out_at: new Date(),
    });
    const request = await BackoutRequestModel.create({
      backout_no: 'DUN-BKO-900001',
      pod_id: pod._id,
      user_id: user._id,
      member_id: legacy._id,
      attempt_no: 1,
      status: 'IN_PROCESS',
      events: [{ status: 'IN_PROCESS', backout_count: 1, at: new Date() }],
    });

    const before = await podMemberService.getState(String(pod._id), String(user._id));
    expect(before).toMatchObject({ can_join: true, backout_in_process: false, can_cancel_backout: false });

    const joined = await podMemberService.joinFree(String(pod._id), String(user._id));
    expect(joined).toMatchObject({ id: String(legacy._id), status: 'JOINED', refund_status: 'NONE' });
    expect((await BackoutRequestModel.findById(request._id))!.status).toBe('CANCELLED');
    expect(await seatsOf(pod)).toBe(2);
  });

  it('a referral link on a free pod joins through the free join', async () => {
    const pod = await makePod();
    const referrer = await makeUser();
    await podMemberService.joinFree(String(pod._id), String(referrer._id));
    await PodMemberModel.updateOne({ user_id: referrer._id }, { $set: { referral_token: 'ref-free' } });
    const friend = await makeUser();

    const out = await podMemberService.redeemReferral('ref-free', String(friend._id));

    expect(out).toMatchObject({ status: 'JOINED', source: 'REFERRAL', referred_by: String(referrer._id) });
    expect(await seatsOf(pod)).toBe(3);
  });
});

describe('membership state and timeline', () => {
  it('a free pod offers cancel-the-spot and no backout, refund or attempts', async () => {
    const pod = await makePod();
    const user = await makeUser();
    await podMemberService.joinFree(String(pod._id), String(user._id));

    expect(await podMemberService.getState(String(pod._id), String(user._id))).toMatchObject({
      is_member: true,
      can_cancel_spot: true,
      can_backout: false,
      can_cancel_backout: false,
      backout_in_process: false,
      backout_attempts_used: 0,
      backout_refund_amount: null,
      backout_refund_per_seat: null,
      backout_refund_coins: 0,
      can_join: false,
      my_seats: 1,
    });

    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));
    expect(await podMemberService.getState(String(pod._id), String(user._id))).toMatchObject({
      is_member: false,
      can_cancel_spot: false,
      can_join: true,
      my_seats: 0,
    });
  });

  it('a paid pod never offers cancel-the-spot', async () => {
    const pod = await makePod({ pod_type: 'PAID', pod_amount: 500 });
    const user = await makeUser();
    const payment = await PaymentModel.create({
      payment_id: `pay-${new Types.ObjectId().toString()}`,
      user_id: user._id,
      user_name: 'Mia',
      user_email: 'm@x.com',
      subtotal: 500,
      total: 500,
      currency_symbol: '₹',
      status: 'SUCCESS',
    } as never);
    await PodMemberModel.create({
      pod_id: pod._id,
      user_id: user._id,
      status: 'JOINED',
      source: 'PAID',
      payment_id: payment._id,
      refund_status: 'NONE',
    });
    expect(await podMemberService.getState(String(pod._id), String(user._id))).toMatchObject({
      is_member: true,
      can_backout: true,
      can_cancel_spot: false,
    });
  });

  it('the timeline reads a cancelled spot, not a backout — and forgets it on a re-join', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const joined = await podMemberService.joinFree(String(pod._id), String(user._id));
    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));

    const story = await participationForMembership({ memberId: joined.id, podId: String(pod._id), joinedAt: null });
    expect(story!.backouts).toEqual([]);
    expect(story!.spot_cancelled_at).toEqual(expect.any(String));

    await podMemberService.joinFree(String(pod._id), String(user._id));
    const again = await participationForMembership({ memberId: joined.id, podId: String(pod._id), joinedAt: null });
    expect(again!.spot_cancelled_at).toBeNull();
  });
});
