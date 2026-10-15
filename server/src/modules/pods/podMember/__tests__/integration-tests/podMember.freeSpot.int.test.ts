import { Types } from 'mongoose';
import { podMemberService } from '../../podMember.service';
import { podMemberResolvers } from '../../podMember.resolver';
import { cancelFreeSpot, CANCEL_LIMIT_MESSAGE } from '../../podMember.freeSpot';
import { settingsService } from '@modules/platform/settings/settings.service';
import { makeContext } from '@test/harness';
import { PodMemberModel, type IPodMember } from '../../podMember.model';
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
 * scanning, and the member can join again on the same booking row. Cancelling
 * is capped per member per pod by Pod Settings' max_free_spot_cancellations
 * (default 5); joining again never is.
 */

let spotFilledEmail: jest.SpyInstance;
let refundEmail: jest.SpyInstance;

beforeAll(async () => {
  // The one-booking guarantee lives in an index — build it before racing it.
  await PodMemberModel.init();
}, 60_000);

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

/** A booking made while free pods still sold several seats: joined, then
 * widened to `seats` on both the row and the pod's extra-seat counter. */
const joinLegacyMultiSeat = async (pod: { _id: unknown }, userId: string, seats: number) => {
  const joined = await podMemberService.joinFree(String(pod._id), userId);
  await PodMemberModel.updateOne({ _id: joined.id }, { $set: { seats } });
  await PodModel.updateOne({ _id: pod._id }, { $inc: { extra_seats: seats - 1 } });
  return joined;
};

describe('joinFree books one seat', () => {
  it('ignores a larger seat count from an installed build', async () => {
    const pod = await makePod({ no_of_spots: 10 });
    const user = await makeUser();

    const joined = await podMemberResolvers.Mutation.joinFreePod(
      null,
      { pod_doc_id: String(pod._id), seats: 4 },
      makeContext({ id: String(user._id) })
    );

    expect(joined.seats).toBe(1);
    expect(await seatsOf(pod)).toBe(2);
    expect((await PodModel.findById(pod._id).lean())!.extra_seats ?? 0).toBe(0);
  });

  it('offers a seat picker of one, and none once the pod is full', async () => {
    const pod = await makePod({ no_of_spots: 10 });
    const user = await makeUser();
    expect((await podMemberService.getState(String(pod._id), String(user._id))).max_seats_per_booking).toBe(1);

    const full = await makePod({ no_of_spots: 1 });
    expect((await podMemberService.getState(String(full._id), String(user._id))).max_seats_per_booking).toBe(0);
  });

  it('brings an older multi-seat booking back on one seat after a cancel', async () => {
    const pod = await makePod({ no_of_spots: 10 });
    const user = await makeUser();
    const legacy = await joinLegacyMultiSeat(pod, String(user._id), 3);
    expect(await seatsOf(pod)).toBe(4);
    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));

    const back = await podMemberService.joinFree(String(pod._id), String(user._id));

    expect(back).toMatchObject({ id: legacy.id, status: 'JOINED', seats: 1 });
    expect(await seatsOf(pod)).toBe(2);
    expect((await TicketModel.findOne({ membership_id: legacy.id }))!.seats).toBe(1);
  });
});

describe('cancelFreeSpot', () => {
  it('join → cancel → join → cancel, many times: exact seats, one row, no backout, ticket off then on', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const uid = String(user._id);
    expect(await seatsOf(pod)).toBe(1); // the host

    let firstId: string | null = null;
    for (let round = 1; round <= 5; round += 1) {
      const joined = await podMemberService.joinFree(String(pod._id), uid, null);
      firstId ??= joined.id;
      expect(joined).toMatchObject({ id: firstId, status: 'JOINED', seats: 1, spot_cancelled_at: null });
      expect(await seatsOf(pod)).toBe(2);
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

  it('releases every seat of an older multi-seat booking — there is no partial cancel', async () => {
    const pod = await makePod({ no_of_spots: 10 });
    const user = await makeUser();
    await joinLegacyMultiSeat(pod, String(user._id), 4);
    expect(await seatsOf(pod)).toBe(5);

    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));

    const fresh = (await PodModel.findById(pod._id).lean())!;
    expect(fresh.extra_seats).toBe(0);
    expect(fresh.pod_attendees.map(String)).toEqual([String(HOST)]);
  });

  it('is safe under a double submit: the seats are released once and both calls answer the cancelled booking', async () => {
    const pod = await makePod({ no_of_spots: 10 });
    const other = await makeUser();
    await joinLegacyMultiSeat(pod, String(other._id), 3);
    const user = await makeUser();
    await joinLegacyMultiSeat(pod, String(user._id), 2);
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
    await podMemberService.joinFree(String(pod._id), String(user._id));
    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));

    const [a, b] = await Promise.all([
      podMemberService.joinFree(String(pod._id), String(user._id)),
      podMemberService.joinFree(String(pod._id), String(user._id)),
    ]);

    expect(a.id).toBe(b.id);
    expect(await PodMemberModel.countDocuments({ user_id: user._id, status: 'JOINED' })).toBe(1);
    expect(await seatsOf(pod)).toBe(2);
  });

  it('is safe under a double first join: one booking, one seat, one ticket', async () => {
    const pod = await makePod({ no_of_spots: 10 });
    const user = await makeUser();

    const [a, b] = await Promise.all([
      podMemberService.joinFree(String(pod._id), String(user._id)),
      podMemberService.joinFree(String(pod._id), String(user._id)),
    ]);

    expect(a.id).toBe(b.id);
    expect(await PodMemberModel.countDocuments({ user_id: user._id, status: 'JOINED' })).toBe(1);
    expect(await seatsOf(pod)).toBe(2);
    expect(await TicketModel.countDocuments({ user_id: user._id })).toBe(1);
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
    await joinLegacyMultiSeat(pod, String(user._id), 3);

    const out = await podMemberService.backout(String(pod._id), String(user._id), 1);

    expect(out).toMatchObject({ status: 'BACKED_OUT', seats: 3, backout_count: 0, refund_status: 'NONE' });
    expect(out.spot_cancelled_at).not.toBeNull();
    expect(await seatsOf(pod)).toBe(1);
    expect(await BackoutRequestModel.countDocuments()).toBe(0);
  });

  it('rejoinPod and cancelBackoutPod join the free pod again, on one seat', async () => {
    const pod = await makePod();
    const user = await makeUser();
    await podMemberService.joinFree(String(pod._id), String(user._id));
    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));

    const back = await podMemberService.rejoin(String(pod._id), String(user._id));
    expect(back).toMatchObject({ status: 'JOINED', seats: 1 });
    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));

    const kept = await podMemberService.cancelBackout(String(pod._id), String(user._id));
    expect(kept).toMatchObject({ status: 'JOINED', seats: 1 });
    // Already in: both answer the booking rather than erroring.
    expect((await podMemberService.cancelBackout(String(pod._id), String(user._id))).status).toBe('JOINED');
    expect(await seatsOf(pod)).toBe(2);

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

describe('one JOINED unpaid booking per person per pod (database-enforced)', () => {
  const rivalBooking = async (pod: { _id: unknown }, userId: unknown) => {
    // What a concurrent join that won would have left behind: its row and its seat.
    await PodModel.updateOne({ _id: pod._id }, { $addToSet: { pod_attendees: userId } });
    const [rival] = await PodMemberModel.create([
      { pod_id: pod._id, user_id: userId, status: 'JOINED', source: 'FREE', refund_status: 'NONE' },
    ]);
    return rival;
  };

  it('the database refuses a second JOINED unpaid row, but not a cancelled or a paid one', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const base = { pod_id: pod._id, user_id: user._id, source: 'FREE', refund_status: 'NONE' };
    await PodMemberModel.create({ ...base, status: 'JOINED' });

    await expect(PodMemberModel.create({ ...base, status: 'JOINED' })).rejects.toMatchObject({ code: 11000 });
    await expect(PodMemberModel.create({ ...base, status: 'BACKED_OUT' })).resolves.toBeTruthy();
    await expect(
      PodMemberModel.create({ ...base, status: 'JOINED', source: 'PAID', payment_id: new Types.ObjectId() })
    ).resolves.toBeTruthy();
  });

  it('a first join that loses the insert answers with the winning booking and gives no seat back', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const realCreate = PodMemberModel.create.bind(PodMemberModel) as (...args: unknown[]) => Promise<unknown>;
    let rivalId = '';
    jest.spyOn(PodMemberModel, 'create').mockImplementationOnce((async (...args: unknown[]) => {
      rivalId = String((await rivalBooking(pod, user._id))._id);
      return realCreate(...args);
    }) as never);

    const joined = await podMemberService.joinFree(String(pod._id), String(user._id));

    expect(joined.id).toBe(rivalId);
    expect(await PodMemberModel.countDocuments({ user_id: user._id })).toBe(1);
    // The winner's seat stays: releasing it would leave that booking seatless.
    expect(await seatsOf(pod)).toBe(2);
    expect((await PodModel.findById(pod._id).lean())!.pod_attendees.map(String)).toContain(String(user._id));
  });

  it('a re-join that loses to a concurrent booking leaves the cancelled row as it was', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const first = await podMemberService.joinFree(String(pod._id), String(user._id));
    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));
    const realFlip = PodMemberModel.findOneAndUpdate.bind(PodMemberModel) as (...args: unknown[]) => unknown;
    let rivalId = '';
    jest.spyOn(PodMemberModel, 'findOneAndUpdate').mockImplementationOnce((async (...args: unknown[]) => {
      rivalId = String((await rivalBooking(pod, user._id))._id);
      return realFlip(...args);
    }) as never);

    const joined = await podMemberService.joinFree(String(pod._id), String(user._id));

    expect(joined.id).toBe(rivalId);
    const old = (await PodMemberModel.findById(first.id))!;
    expect(old.status).toBe('BACKED_OUT');
    expect(old.spot_cancelled_at).not.toBeNull();
    expect((await ticketOf(first.id))!.status).toBe('CANCELLED');
    expect(await PodMemberModel.countDocuments({ user_id: user._id, status: 'JOINED' })).toBe(1);
    expect(await seatsOf(pod)).toBe(2);
  });

  it('a non-duplicate failure of the new row still gives the seat back', async () => {
    const pod = await makePod();
    const user = await makeUser();
    jest.spyOn(PodMemberModel, 'create').mockRejectedValueOnce(new Error('disk full') as never);

    await expect(podMemberService.joinFree(String(pod._id), String(user._id))).rejects.toThrow('disk full');

    expect(await seatsOf(pod)).toBe(1);
    expect(await PodMemberModel.countDocuments({ user_id: user._id })).toBe(0);
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
      spot_cancels_used: 0,
      // Nothing saved in Pod Settings: the default allowance.
      spot_cancels_max: 5,
    });

    await podMemberService.cancelFreeSpot(String(pod._id), String(user._id));
    expect(await podMemberService.getState(String(pod._id), String(user._id))).toMatchObject({
      is_member: false,
      can_cancel_spot: false,
      can_join: true,
      my_seats: 0,
      // Read off the cancelled booking a re-join would bring back.
      spot_cancels_used: 1,
      spot_cancels_max: 5,
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
      // A paid pod has no Cancel Spot, so it reports no allowance at all.
      spot_cancels_used: 0,
      spot_cancels_max: 0,
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

describe('the spot cancellation cap (Pod Settings: max_free_spot_cancellations)', () => {
  const limitReached = { message: CANCEL_LIMIT_MESSAGE, extensions: { code: 'CANCEL_LIMIT_REACHED' } };

  it('allows exactly the configured number of cancels, then refuses and the member keeps their spot', async () => {
    await settingsService.updateAppSettings({ max_free_spot_cancellations: 2 });
    const pod = await makePod();
    const user = await makeUser();
    const uid = String(user._id);

    for (let round = 1; round <= 2; round += 1) {
      await podMemberService.joinFree(String(pod._id), uid);
      await podMemberService.cancelFreeSpot(String(pod._id), uid);
    }
    // Re-joining is never refused by the cap.
    const back = await podMemberService.joinFree(String(pod._id), uid);
    expect(back.status).toBe('JOINED');

    await expect(podMemberService.cancelFreeSpot(String(pod._id), uid)).rejects.toMatchObject(limitReached);

    const row = (await PodMemberModel.findById(back.id))!;
    expect(row.status).toBe('JOINED');
    expect(row.spot_cancel_count).toBe(2);
    expect(await seatsOf(pod)).toBe(2);
    expect((await ticketOf(back.id))!.status).toBe('VALID');
    expect(await podMemberService.getState(String(pod._id), uid)).toMatchObject({
      is_member: true,
      can_cancel_spot: false,
      spot_cancels_used: 2,
      spot_cancels_max: 2,
    });
  });

  it('falls back to 5 cancels when Pod Settings saves none', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const uid = String(user._id);
    for (let round = 1; round <= 5; round += 1) {
      await podMemberService.joinFree(String(pod._id), uid);
      await podMemberService.cancelFreeSpot(String(pod._id), uid);
    }
    await podMemberService.joinFree(String(pod._id), uid);

    await expect(podMemberService.cancelFreeSpot(String(pod._id), uid)).rejects.toMatchObject(limitReached);
  });

  it('follows a raised cap: a member at the old limit may cancel again', async () => {
    await settingsService.updateAppSettings({ max_free_spot_cancellations: 1 });
    const pod = await makePod();
    const user = await makeUser();
    const uid = String(user._id);
    await podMemberService.joinFree(String(pod._id), uid);
    await podMemberService.cancelFreeSpot(String(pod._id), uid);
    await podMemberService.joinFree(String(pod._id), uid);
    await expect(podMemberService.cancelFreeSpot(String(pod._id), uid)).rejects.toMatchObject(limitReached);

    await settingsService.updateAppSettings({ max_free_spot_cancellations: 2 });
    expect((await podMemberService.getState(String(pod._id), uid)).can_cancel_spot).toBe(true);

    const out = await podMemberService.cancelFreeSpot(String(pod._id), uid);
    expect(out.status).toBe('BACKED_OUT');
    expect((await PodMemberModel.findById(out.id))!.spot_cancel_count).toBe(2);
  });

  it('counts per pod: using the cancels up on one pod leaves another untouched', async () => {
    await settingsService.updateAppSettings({ max_free_spot_cancellations: 1 });
    const first = await makePod();
    const second = await makePod();
    const user = await makeUser();
    const uid = String(user._id);
    await podMemberService.joinFree(String(first._id), uid);
    await podMemberService.cancelFreeSpot(String(first._id), uid);

    await podMemberService.joinFree(String(second._id), uid);
    expect(await podMemberService.getState(String(second._id), uid)).toMatchObject({
      can_cancel_spot: true,
      spot_cancels_used: 0,
      spot_cancels_max: 1,
    });
    await expect(podMemberService.cancelFreeSpot(String(second._id), uid)).resolves.toMatchObject({
      status: 'BACKED_OUT',
    });
  });

  it('a double submit of the last allowed cancel answers the cancelled booking twice and counts once', async () => {
    await settingsService.updateAppSettings({ max_free_spot_cancellations: 1 });
    const pod = await makePod();
    const user = await makeUser();
    const uid = String(user._id);
    await podMemberService.joinFree(String(pod._id), uid);

    const [a, b] = await Promise.all([
      podMemberService.cancelFreeSpot(String(pod._id), uid),
      podMemberService.cancelFreeSpot(String(pod._id), uid),
    ]);

    expect(a).toMatchObject({ id: b.id, status: 'BACKED_OUT' });
    expect(b.status).toBe('BACKED_OUT');
    expect((await PodMemberModel.findById(a.id))!.spot_cancel_count).toBe(1);
    expect(await seatsOf(pod)).toBe(1);
  });

  it('refuses at the conditional write when the count reached the cap after the read, and gives the ticket back', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const uid = String(user._id);
    const joined = await podMemberService.joinFree(String(pod._id), uid);
    const realFindOne = PodMemberModel.findOne.bind(PodMemberModel) as unknown as (...args: unknown[]) => {
      session: (s: unknown) => Promise<IPodMember | null>;
    };
    // Another cancel+re-join lands between this request's read and its flip:
    // the read still sees 0 used, the row already holds the whole allowance.
    jest.spyOn(PodMemberModel, 'findOne').mockImplementationOnce(((...args: unknown[]) => ({
      session: async (s: unknown) => {
        const doc = await realFindOne(...args).session(s);
        await PodMemberModel.collection.updateOne({ _id: new Types.ObjectId(joined.id) }, { $set: { spot_cancel_count: 3 } });
        return doc;
      },
    })) as never);

    await expect(cancelFreeSpot(pod._id as Types.ObjectId, uid, 3)).rejects.toMatchObject(limitReached);

    const row = (await PodMemberModel.findById(joined.id))!;
    expect(row.status).toBe('JOINED');
    expect(row.spot_cancel_count).toBe(3);
    expect(row.spot_cancelled_at).toBeNull();
    expect(await seatsOf(pod)).toBe(2);
    expect((await ticketOf(joined.id))!.status).toBe('VALID');
  });

  it('enforces the cap it is given: refused at it, allowed below it', async () => {
    const pod = await makePod();
    const user = await makeUser();
    const uid = String(user._id);
    const joined = await podMemberService.joinFree(String(pod._id), uid);
    await PodMemberModel.updateOne({ _id: joined.id }, { $set: { spot_cancel_count: 1 } });

    await expect(cancelFreeSpot(pod._id as Types.ObjectId, uid, 1)).rejects.toMatchObject(limitReached);
    expect((await ticketOf(joined.id))!.status).toBe('VALID');

    const out = await cancelFreeSpot(pod._id as Types.ObjectId, uid, 2);
    expect(out.status).toBe('BACKED_OUT');
    expect(out.spot_cancel_count).toBe(2);
  });

  it('still refuses a checked-in member first — the cap never masks ALREADY_CHECKED_IN below it', async () => {
    await settingsService.updateAppSettings({ max_free_spot_cancellations: 3 });
    const pod = await makePod();
    const user = await makeUser();
    const joined = await podMemberService.joinFree(String(pod._id), String(user._id));
    await TicketModel.updateOne({ membership_id: joined.id }, { $set: { status: 'CHECKED_IN' } });

    await expect(podMemberService.cancelFreeSpot(String(pod._id), String(user._id))).rejects.toMatchObject({
      extensions: { code: 'ALREADY_CHECKED_IN' },
    });
    expect((await PodMemberModel.findById(joined.id))!.spot_cancel_count).toBe(0);
  });
});
