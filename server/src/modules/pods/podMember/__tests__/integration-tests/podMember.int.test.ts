import { Types } from 'mongoose';
import { podMemberService } from '../../podMember.service';
import { PodMemberModel } from '../../podMember.model';
import { BackoutRequestModel } from '../../backoutRequest.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { UserModel } from '@modules/access/user/user.model';
import { AppSettingsModel } from '@modules/platform/settings/settings.model';
import { FinanceSettingsModel } from '@modules/finance/finance/finance.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import * as emailService from '@services/email/email.service';

const userId = new Types.ObjectId().toString();
const podId = new Types.ObjectId().toString();

let spotFilledEmail: jest.SpyInstance;
let refundEmail: jest.SpyInstance;
let notifyCreate: jest.SpyInstance;

beforeEach(() => {
  spotFilledEmail = jest
    .spyOn(emailService, 'sendBackoutSpotFilledEmail')
    .mockResolvedValue(undefined as never);
  refundEmail = jest.spyOn(emailService, 'sendPodRefundEmail').mockResolvedValue(undefined as never);
  notifyCreate = jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const makePodDoc = (over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `p-${Math.random().toString(36).slice(2)}`,
    pod_title: 'Backout pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'NATIVE_FREE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    no_of_spots: 5,
    is_active: true,
    ...over,
  });

const makeUser = (over: Record<string, unknown> = {}) =>
  UserModel.create({
    auth: { email: 'buyer@x.com' },
    profile: { first_name: 'Asha', last_name: 'Rao' },
    ...over,
  } as never);

const makePayment = (buyerId: unknown, over: Record<string, unknown> = {}) =>
  PaymentModel.create({
    payment_id: `pay-${Math.random().toString(36).slice(2)}`,
    user_id: buyerId,
    user_name: 'Asha Rao',
    user_email: 'buyer@x.com',
    subtotal: 500,
    total: 500,
    currency_symbol: '₹',
    status: 'SUCCESS',
    ...over,
  } as never);

/** Create a JOINED membership and take the seat on the pod. */
async function joinMember(pod: any, memberUserId: unknown, over: Record<string, unknown> = {}) {
  const doc = await PodMemberModel.create({
    pod_id: pod._id,
    user_id: memberUserId,
    status: 'JOINED',
    source: 'FREE',
    refund_status: 'NONE',
    ...over,
  });
  await PodModel.updateOne({ _id: pod._id }, { $addToSet: { pod_attendees: memberUserId } });
  return doc;
}

const setMaxAttempts = (n: number) =>
  AppSettingsModel.updateOne({ singleton_key: 'app' }, { $set: { max_backout_attempts: n } }, { upsert: true });

const setDeductionPct = (pct: number) =>
  FinanceSettingsModel.updateOne(
    { singleton_key: 'finance' },
    { $set: { default_backout_deduction_pct: pct } },
    { upsert: true },
  );

const backedOut = (pod: unknown, uid: unknown, over: Record<string, unknown> = {}) =>
  PodMemberModel.create({
    pod_id: pod,
    user_id: uid,
    status: 'BACKED_OUT',
    backed_out_at: new Date(),
    source: 'PAID',
    refund_status: 'PENDING',
    ...over,
  });

describe('podMemberService integration', () => {
  it('throws NOT_FOUND for state/join on a missing pod', async () => {
    await expect(podMemberService.getState(podId, userId)).rejects.toThrow(/pod not found/i);
    await expect(podMemberService.joinFree(podId, userId)).rejects.toThrow(/pod not found/i);
  });

  it('lists a user’s memberships and a pod’s members', async () => {
    expect(await podMemberService.listMine(userId)).toEqual([]);

    await PodMemberModel.create({ pod_id: podId, user_id: userId, status: 'JOINED', source: 'FREE', refund_status: 'NONE' });

    expect(await podMemberService.listMine(userId)).toHaveLength(1);
    expect(await podMemberService.listForPod(podId)).toHaveLength(1);
    expect(await podMemberService.listForPod(podId, 'BACKED_OUT')).toHaveLength(0);
  });

  it('looks up a referral token', async () => {
    expect(await podMemberService.lookupReferral('nope')).toBeNull();

    await PodMemberModel.create({
      pod_id: podId,
      user_id: userId,
      status: 'JOINED',
      source: 'FREE',
      refund_status: 'NONE',
      referral_token: 'ref-abc',
    });
    const found = await podMemberService.lookupReferral('ref-abc');
    expect(found).not.toBeNull();
  });
});

describe('expired pod booking guard', () => {
  it('rejects joinFree once the pod date has passed', async () => {
    const past = await makePodDoc({ pod_date_time: new Date(Date.now() - 3_600_000) });
    await expect(
      podMemberService.joinFree(String(past._id), new Types.ObjectId().toString())
    ).rejects.toThrow(/already taken place/i);
  });

  it('rejects joinFree for a paid pod and is idempotent for a joined member', async () => {
    const paid = await makePodDoc({ pod_type: 'NATIVE_PAID' });
    const user = new Types.ObjectId().toString();
    await expect(podMemberService.joinFree(String(paid._id), user)).rejects.toThrow(/paid/i);

    const free = await makePodDoc();
    await joinMember(free, new Types.ObjectId(user));
    const again = await podMemberService.joinFree(String(free._id), user);
    expect(again.status).toBe('JOINED');
  });

  it('still allows joining an upcoming free pod (with referral attribution)', async () => {
    const upcoming = await makePodDoc();
    const referrer = await joinMember(upcoming, new Types.ObjectId(), { referral_token: 'ref-join' });
    const member = await podMemberService.joinFree(
      String(upcoming._id),
      new Types.ObjectId().toString(),
      'ref-join'
    );
    expect(member.status).toBe('JOINED');
    expect(member.source).toBe('REFERRAL');
    expect(member.referred_by).toBe(String(referrer.user_id));
  });

  it('ignores a referral token that belongs to a different pod', async () => {
    const other = await makePodDoc();
    await joinMember(other, new Types.ObjectId(), { referral_token: 'ref-elsewhere' });
    const pod = await makePodDoc();
    const member = await podMemberService.joinFree(
      String(pod._id),
      new Types.ObjectId().toString(),
      'ref-elsewhere'
    );
    expect(member.source).toBe('FREE');
    expect(member.referred_by).toBeNull();
  });

  it('rejects joinFree when the pod is full', async () => {
    const pod = await makePodDoc({ no_of_spots: 1, pod_attendees: [new Types.ObjectId()] });
    await expect(
      podMemberService.joinFree(String(pod._id), new Types.ObjectId().toString())
    ).rejects.toThrow(/full/i);
  });
});

describe('backout → Backout in process (Item 1)', () => {
  it('moves a paid booking to BACKOUT_IN_PROCESS, releases the seat and records a request', async () => {
    await setDeductionPct(10);
    const pod = await makePodDoc();
    const buyer = await makeUser();
    const payment = await makePayment(buyer._id);
    await joinMember(pod, buyer._id, { source: 'PAID', payment_id: payment._id });

    const res = await podMemberService.backout(String(pod._id), String(buyer._id));
    expect(res.status).toBe('BACKOUT_IN_PROCESS');
    expect(res.backed_out_at).not.toBeNull();
    expect(res.backout_count).toBe(1);
    expect(res.refund_status).toBe('PENDING');
    expect(res.referral_token).toMatch(/^ref_/);

    // Seat released for public booking immediately.
    const refreshed = await PodModel.findById(pod._id);
    expect((refreshed!.pod_attendees ?? []).map(String)).not.toContain(String(buyer._id));

    // Immutable request with a fresh permanent Backout ID + refund snapshot.
    const request = await BackoutRequestModel.findOne({ user_id: buyer._id });
    expect(request).toMatchObject({
      status: 'IN_PROCESS',
      attempt_no: 1,
      payment_amount: 500,
      deduction_pct: 10,
      refund_amount: 450,
    });
    expect(request!.backout_no).toMatch(/^DUN-BKO-\d{6}$/);
    expect(request!.events).toHaveLength(1);
    expect(request!.events[0]).toMatchObject({ status: 'IN_PROCESS', backout_count: 1 });
  });

  it('keeps an existing referral token and marks free bookings NOT_ELIGIBLE', async () => {
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await joinMember(pod, user, { referral_token: 'ref-keep' });

    const res = await podMemberService.backout(String(pod._id), String(user));
    expect(res.refund_status).toBe('NOT_ELIGIBLE');
    expect(res.referral_token).toBe('ref-keep');

    const request = await BackoutRequestModel.findOne({ user_id: user });
    expect(request!.payment_amount).toBeNull();
    expect(request!.refund_amount).toBeNull();
  });

  it('snapshots a null amount when the linked payment doc is missing', async () => {
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await joinMember(pod, user, { source: 'PAID', payment_id: new Types.ObjectId() });

    const res = await podMemberService.backout(String(pod._id), String(user));
    expect(res.refund_status).toBe('PENDING');
    const request = await BackoutRequestModel.findOne({ user_id: user });
    expect(request!.payment_amount).toBeNull();
    expect(request!.refund_amount).toBeNull();
  });

  it('rejects a second backout while one is already in process', async () => {
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));
    await expect(podMemberService.backout(String(pod._id), String(user))).rejects.toThrow(
      /already in process/i
    );
  });

  it('rejects non-members and missing pods', async () => {
    const pod = await makePodDoc();
    await expect(podMemberService.backout(String(pod._id), userId)).rejects.toThrow(/not a member/i);
    await expect(podMemberService.backout(new Types.ObjectId().toString(), userId)).rejects.toThrow(
      /pod not found/i
    );
  });

  it('enforces the per-pod attempt limit with unique sequential Backout IDs (Item 6)', async () => {
    await setMaxAttempts(2);
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await joinMember(pod, user);

    await podMemberService.backout(String(pod._id), String(user));
    await podMemberService.cancelBackout(String(pod._id), String(user));
    await podMemberService.backout(String(pod._id), String(user));
    await podMemberService.cancelBackout(String(pod._id), String(user));

    await expect(podMemberService.backout(String(pod._id), String(user))).rejects.toThrow(
      /maximum number of Backout attempts/i
    );

    const requests = await BackoutRequestModel.find({ user_id: user }).sort({ created_at: 1 });
    expect(requests).toHaveLength(2);
    expect(requests.map((r) => r.attempt_no)).toEqual([1, 2]);
    expect(new Set(requests.map((r) => r.backout_no)).size).toBe(2);
  });
});

describe('Keep My Spot — cancel an in-process backout (Item 2)', () => {
  it('restores the booking and closes the request as CANCELLED', async () => {
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));

    const res = await podMemberService.cancelBackout(String(pod._id), String(user));
    expect(res.status).toBe('JOINED');
    expect(res.backed_out_at).toBeNull();
    expect(res.refund_status).toBe('NONE');
    expect(res.backout_count).toBe(1); // attempts stay consumed

    const refreshed = await PodModel.findById(pod._id);
    expect((refreshed!.pod_attendees ?? []).map(String)).toContain(String(user));

    const request = await BackoutRequestModel.findOne({ user_id: user });
    expect(request!.status).toBe('CANCELLED');
    expect(request!.events.map((e) => e.status)).toEqual(['IN_PROCESS', 'CANCELLED']);
  });

  it('throws NOT_FOUND with no in-process backout and for a missing pod', async () => {
    const pod = await makePodDoc();
    await expect(podMemberService.cancelBackout(String(pod._id), userId)).rejects.toThrow(
      /no backout in process/i
    );
    await expect(
      podMemberService.cancelBackout(new Types.ObjectId().toString(), userId)
    ).rejects.toThrow(/pod not found/i);
  });

  it('refuses once the replacement is confirmed (request already SPOT_FILLED)', async () => {
    const pod = await makePodDoc({ no_of_spots: 1 });
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));
    // A replacement books the released (only) seat → spot filled.
    await podMemberService.joinFree(String(pod._id), new Types.ObjectId().toString());

    await expect(podMemberService.cancelBackout(String(pod._id), String(user))).rejects.toThrow(
      /replacement has been confirmed/i
    );
  });

  it('refuses when the pod is already full again (seat race)', async () => {
    const pod = await makePodDoc({ no_of_spots: 1 });
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));
    // Simulate a raced booking that took the seat without the fill hook.
    await PodModel.updateOne({ _id: pod._id }, { $set: { pod_attendees: [new Types.ObjectId()] } });

    await expect(podMemberService.cancelBackout(String(pod._id), String(user))).rejects.toThrow(
      /replacement has been confirmed/i
    );
  });

  it('restores a legacy in-process membership without an active request', async () => {
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await PodMemberModel.create({
      pod_id: pod._id,
      user_id: user,
      status: 'BACKOUT_IN_PROCESS',
      backed_out_at: new Date(),
      source: 'FREE',
      refund_status: 'NOT_ELIGIBLE',
    });

    const res = await podMemberService.cancelBackout(String(pod._id), String(user));
    expect(res.status).toBe('JOINED');
  });

  it('leaves a non-in-process active request untouched (defensive branch)', async () => {
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    const member = await PodMemberModel.create({
      pod_id: pod._id,
      user_id: user,
      status: 'BACKOUT_IN_PROCESS',
      backed_out_at: new Date(),
      source: 'FREE',
      refund_status: 'NOT_ELIGIBLE',
    });
    const request = await BackoutRequestModel.create({
      backout_no: 'DUN-BKO-999901',
      pod_id: pod._id,
      user_id: user,
      member_id: member._id,
      attempt_no: 1,
      status: 'CANCELLED',
      events: [{ status: 'IN_PROCESS', backout_count: 1, at: new Date() }],
    });
    await PodMemberModel.updateOne({ _id: member._id }, { $set: { active_backout_id: request._id } });

    await podMemberService.cancelBackout(String(pod._id), String(user));
    const untouched = await BackoutRequestModel.findById(request._id);
    expect(untouched!.status).toBe('CANCELLED');
    expect(untouched!.events).toHaveLength(1);
  });
});

describe('spot fill — replacement books the released seat (Item 1)', () => {
  it('fills the oldest in-process backout when a join consumes the released seat', async () => {
    await setDeductionPct(10);
    const pod = await makePodDoc({ no_of_spots: 2 });
    const buyer = await makeUser();
    const payment = await makePayment(buyer._id);
    await joinMember(pod, buyer._id, { source: 'PAID', payment_id: payment._id });
    await joinMember(pod, new Types.ObjectId());

    await podMemberService.backout(String(pod._id), String(buyer._id));
    // Pod now 1/2 with one backout in process — a new join takes the released seat.
    await podMemberService.joinFree(String(pod._id), new Types.ObjectId().toString());

    const member = await PodMemberModel.findOne({ user_id: buyer._id });
    expect(member!.status).toBe('BACKED_OUT');
    expect(member!.active_backout_id).toBeNull();
    expect(member!.refund_status).toBe('PENDING'); // eligible, awaiting Finance

    const request = await BackoutRequestModel.findOne({ user_id: buyer._id });
    expect(request!.status).toBe('SPOT_FILLED');
    expect(request!.events.map((e) => e.status)).toEqual(['IN_PROCESS', 'SPOT_FILLED']);

    // Email + in-app/push fired with the refund line.
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'USER', target_user_ids: [String(buyer._id)], silent: false })
    );
    expect(spotFilledEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@x.com', refund_line: expect.stringContaining('450') })
    );
  });

  it('does not fill when free seats absorbed the join, and never fills unlimited pods', async () => {
    const roomy = await makePodDoc({ no_of_spots: 5 });
    const user = new Types.ObjectId();
    await joinMember(roomy, user);
    await podMemberService.backout(String(roomy._id), String(user));
    await podMemberService.joinFree(String(roomy._id), new Types.ObjectId().toString());
    expect((await PodMemberModel.findOne({ user_id: user }))!.status).toBe('BACKOUT_IN_PROCESS');

    const unlimited = await makePodDoc({ no_of_spots: 0 });
    const u2 = new Types.ObjectId();
    await joinMember(unlimited, u2);
    await podMemberService.backout(String(unlimited._id), String(u2));
    await podMemberService.joinFree(String(unlimited._id), new Types.ObjectId().toString());
    expect((await PodMemberModel.findOne({ user_id: u2 }))!.status).toBe('BACKOUT_IN_PROCESS');
  });

  it('fills FIFO by backout time across multiple in-process backouts', async () => {
    const pod = await makePodDoc({ no_of_spots: 2 });
    const first = new Types.ObjectId();
    const second = new Types.ObjectId();
    await joinMember(pod, first);
    await joinMember(pod, second);
    await podMemberService.backout(String(pod._id), String(first));
    await podMemberService.backout(String(pod._id), String(second));
    await PodMemberModel.updateOne({ user_id: first }, { $set: { backed_out_at: new Date(Date.now() - 60_000) } });

    await podMemberService.joinFree(String(pod._id), new Types.ObjectId().toString());
    expect((await PodMemberModel.findOne({ user_id: first }))!.status).toBe('BACKED_OUT');
    expect((await PodMemberModel.findOne({ user_id: second }))!.status).toBe('BACKOUT_IN_PROCESS');

    await podMemberService.joinFree(String(pod._id), new Types.ObjectId().toString());
    expect((await PodMemberModel.findOne({ user_id: second }))!.status).toBe('BACKED_OUT');
  });

  it('skips the email when the user has no address and survives notify failures', async () => {
    const pod = await makePodDoc({ no_of_spots: 1 });
    const noEmail = await makeUser({ auth: {}, profile: { first_name: 'Mail-less' } });
    await joinMember(pod, noEmail._id);
    await podMemberService.backout(String(pod._id), String(noEmail._id));
    await podMemberService.joinFree(String(pod._id), new Types.ObjectId().toString());
    expect(spotFilledEmail).not.toHaveBeenCalled();

    // Notification failure must never fail the join (best-effort).
    const pod2 = await makePodDoc({ no_of_spots: 1 });
    const u = new Types.ObjectId();
    await joinMember(pod2, u);
    await podMemberService.backout(String(pod2._id), String(u));
    notifyCreate.mockRejectedValueOnce(new Error('push down'));
    await podMemberService.joinFree(String(pod2._id), new Types.ObjectId().toString());
    expect((await PodMemberModel.findOne({ user_id: u }))!.status).toBe('BACKED_OUT');
  });

  it('flips the member even when the active request was already closed (defensive branch)', async () => {
    const pod = await makePodDoc({ no_of_spots: 1 });
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));
    // Close the request out-of-band; the member is still IN_PROCESS.
    await BackoutRequestModel.updateOne({ user_id: user }, { $set: { status: 'CANCELLED' } });

    await podMemberService.joinFree(String(pod._id), new Types.ObjectId().toString());
    const member = await PodMemberModel.findOne({ user_id: user });
    expect(member!.status).toBe('BACKED_OUT');
    const request = await BackoutRequestModel.findOne({ user_id: user });
    expect(request!.status).toBe('CANCELLED'); // terminal states never mutate
  });

  it('fills backouts on paid joins recorded by the payment flow', async () => {
    const pod = await makePodDoc({ no_of_spots: 1 });
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));

    // Payment flow pushes the attendee first, then records the membership.
    const replacement = new Types.ObjectId();
    await PodModel.updateOne({ _id: pod._id }, { $addToSet: { pod_attendees: replacement } });
    const payment = await makePayment(replacement);
    await podMemberService.recordPaidJoin(String(pod._id), String(replacement), String(payment._id));

    expect((await PodMemberModel.findOne({ user_id: user }))!.status).toBe('BACKED_OUT');
  });

  it('recordPaidJoin is idempotent and survives a missing pod or fill failure', async () => {
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    const payment = await makePayment(user);
    const same = await podMemberService.recordPaidJoin(String(pod._id), String(user), String(payment._id));
    expect(same.status).toBe('JOINED');

    // Missing pod: membership still records, the fill hook is skipped.
    const ghostPod = new Types.ObjectId().toString();
    const u2 = new Types.ObjectId();
    const p2 = await makePayment(u2);
    const rec = await podMemberService.recordPaidJoin(ghostPod, String(u2), String(p2._id));
    expect(rec.status).toBe('JOINED');

    // Fill failure is contained (best-effort). Persistent rejection: the ticket
    // flow may also read the pod, and both catches must swallow the error.
    const u3 = new Types.ObjectId();
    const p3 = await makePayment(u3);
    jest.spyOn(PodModel, 'findById').mockRejectedValue(new Error('db hiccup') as never);
    const rec3 = await podMemberService.recordPaidJoin(String(pod._id), String(u3), String(p3._id));
    expect(rec3.status).toBe('JOINED');
  });

  it('blocks joining/redeeming while the caller’s own backout is in process', async () => {
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await joinMember(pod, user, { referral_token: 'ref-owner' });
    await podMemberService.backout(String(pod._id), String(user));

    await expect(podMemberService.joinFree(String(pod._id), String(user))).rejects.toThrow(
      /keep my spot/i
    );

    const other = await joinMember(pod, new Types.ObjectId(), { referral_token: 'ref-other' });
    expect(other).toBeTruthy();
    await expect(podMemberService.redeemReferral('ref-other', String(user))).rejects.toThrow(
      /keep my spot/i
    );
  });
});

describe('redeemReferral', () => {
  it('validates the token, pod and self-redeem, and stays idempotent', async () => {
    await expect(podMemberService.redeemReferral('missing', userId)).rejects.toThrow(/invalid referral/i);

    const danglingPod = new Types.ObjectId();
    await PodMemberModel.create({
      pod_id: danglingPod,
      user_id: new Types.ObjectId(),
      status: 'JOINED',
      source: 'FREE',
      refund_status: 'NONE',
      referral_token: 'ref-dangling',
    });
    await expect(podMemberService.redeemReferral('ref-dangling', userId)).rejects.toThrow(/pod not found/i);

    const pod = await makePodDoc();
    const owner = new Types.ObjectId();
    await joinMember(pod, owner, { referral_token: 'ref-own' });
    await expect(podMemberService.redeemReferral('ref-own', String(owner))).rejects.toThrow(
      /own referral/i
    );

    const joined = new Types.ObjectId();
    await joinMember(pod, joined);
    const again = await podMemberService.redeemReferral('ref-own', String(joined));
    expect(again.status).toBe('JOINED');
  });

  it('joins via referral and fills the referrer’s in-process backout', async () => {
    const pod = await makePodDoc({ no_of_spots: 1 });
    const owner = await makeUser();
    await joinMember(pod, owner._id, { referral_token: 'ref-fill' });
    await podMemberService.backout(String(pod._id), String(owner._id));

    const friend = new Types.ObjectId().toString();
    const res = await podMemberService.redeemReferral('ref-fill', friend);
    expect(res.status).toBe('JOINED');
    expect(res.source).toBe('REFERRAL');
    expect(res.referred_by).toBe(String(owner._id));

    const referrer = await PodMemberModel.findOne({ user_id: owner._id });
    expect(referrer!.status).toBe('BACKED_OUT');
    expect((await BackoutRequestModel.findOne({ user_id: owner._id }))!.status).toBe('SPOT_FILLED');
  });
});

describe('getState — backout-aware membership state', () => {
  it('exposes attempts, deduction and the refund preview for a paid member', async () => {
    await setDeductionPct(20);
    const pod = await makePodDoc();
    const buyer = await makeUser();
    const payment = await makePayment(buyer._id, { total: 1000 });
    await joinMember(pod, buyer._id, { source: 'PAID', payment_id: payment._id });

    const state = await podMemberService.getState(String(pod._id), String(buyer._id));
    expect(state).toMatchObject({
      is_member: true,
      status: 'JOINED',
      can_backout: true,
      backout_in_process: false,
      can_cancel_backout: false,
      backout_attempts_used: 0,
      backout_attempts_max: 3,
      backout_deduction_pct: 20,
      backout_refund_amount: 800,
    });
  });

  it('reflects an in-process backout and a maxed-out attempt budget', async () => {
    await setMaxAttempts(1);
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));

    const inProcess = await podMemberService.getState(String(pod._id), String(user));
    expect(inProcess).toMatchObject({
      is_member: false,
      status: 'BACKOUT_IN_PROCESS',
      backout_in_process: true,
      can_cancel_backout: true,
      can_join: false,
      backout_attempts_used: 1,
      backout_attempts_max: 1,
      backout_refund_amount: null,
    });

    await podMemberService.cancelBackout(String(pod._id), String(user));
    const restored = await podMemberService.getState(String(pod._id), String(user));
    expect(restored.is_member).toBe(true);
    expect(restored.can_backout).toBe(false); // budget exhausted
  });

  it('handles anonymous viewers, full pods and a missing payment doc', async () => {
    const pod = await makePodDoc({ no_of_spots: 1, pod_attendees: [new Types.ObjectId()] });
    const anon = await podMemberService.getState(String(pod._id), null);
    expect(anon).toMatchObject({
      is_member: false,
      can_join: false,
      backout_attempts_used: 0,
      backout_refund_amount: null,
    });

    const user = new Types.ObjectId();
    await PodMemberModel.create({
      pod_id: pod._id,
      user_id: user,
      status: 'BACKOUT_IN_PROCESS',
      backed_out_at: new Date(),
      source: 'PAID',
      payment_id: new Types.ObjectId(), // dangling payment
      refund_status: 'PENDING',
    });
    const state = await podMemberService.getState(String(pod._id), String(user));
    expect(state.backout_in_process).toBe(true);
    expect(state.can_cancel_backout).toBe(false); // pod is full — replacement confirmed
    expect(state.backout_refund_amount).toBeNull();
  });
});

describe('rejoin (no-payment)', () => {
  const uid = () => new Types.ObjectId().toString();

  it('flips a backed-out membership back to JOINED and re-adds the attendee', async () => {
    const pod = await makePodDoc();
    const user = uid();
    await backedOut(pod._id, user, { payment_id: new Types.ObjectId(), refund_status: 'PROCESSED' });

    const res = await podMemberService.rejoin(String(pod._id), user);
    expect(res.status).toBe('JOINED');
    expect(res.refund_status).toBe('NONE');
    expect(res.backed_out_at).toBeNull();

    const refreshed = await PodModel.findById(pod._id);
    expect((refreshed!.pod_attendees ?? []).map(String)).toContain(user);
  });

  it('is idempotent when the caller is already joined', async () => {
    const pod = await makePodDoc();
    const user = uid();
    await PodMemberModel.create({ pod_id: pod._id, user_id: user, status: 'JOINED', source: 'FREE', refund_status: 'NONE' });
    const res = await podMemberService.rejoin(String(pod._id), user);
    expect(res.status).toBe('JOINED');
  });

  it('throws NOT_FOUND when there is no backed-out booking', async () => {
    const pod = await makePodDoc();
    await expect(podMemberService.rejoin(String(pod._id), uid())).rejects.toThrow(/no backed-out booking/i);
  });

  it('throws NOT_FOUND for a missing pod', async () => {
    await expect(podMemberService.rejoin(new Types.ObjectId().toString(), uid())).rejects.toThrow(/pod not found/i);
  });

  it('blocks rejoin once the pod is complete', async () => {
    const pod = await makePodDoc({ completed_at: new Date() });
    const user = uid();
    await backedOut(pod._id, user);
    await expect(podMemberService.rejoin(String(pod._id), user)).rejects.toThrow(/already complete/i);
  });

  it('blocks rejoin once the pod date has passed', async () => {
    const pod = await makePodDoc({ pod_date_time: new Date(Date.now() - 3_600_000) });
    const user = uid();
    await backedOut(pod._id, user);
    await expect(podMemberService.rejoin(String(pod._id), user)).rejects.toThrow(/already taken place/i);
  });

  it('blocks rejoin when the pod is full', async () => {
    const taken = new Types.ObjectId();
    const pod = await makePodDoc({ no_of_spots: 1, pod_attendees: [taken] });
    const user = uid();
    await backedOut(pod._id, user);
    await expect(podMemberService.rejoin(String(pod._id), user)).rejects.toThrow(/full/i);
  });

  it('blocks rejoin after a replacement was confirmed (book again instead)', async () => {
    const pod = await makePodDoc({ no_of_spots: 1 });
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));
    await podMemberService.joinFree(String(pod._id), new Types.ObjectId().toString());

    await expect(podMemberService.rejoin(String(pod._id), String(user))).rejects.toThrow(
      /replacement took your spot/i
    );
  });
});

describe('backout refund requests (finance — Items 3/4/5)', () => {
  it('lists nothing when there are no requests', async () => {
    expect(await podMemberService.listBackoutRefunds()).toEqual([]);
  });

  it('lists every request with Backout ID, status, timeline and per-request refund state', async () => {
    await setDeductionPct(10);
    const pod = await makePodDoc({ no_of_spots: 2 });
    const buyer = await makeUser();
    const payment = await makePayment(buyer._id);
    await joinMember(pod, buyer._id, { source: 'PAID', payment_id: payment._id });
    await joinMember(pod, new Types.ObjectId());

    // Attempt 1: cancelled. Attempt 2: spot filled.
    await podMemberService.backout(String(pod._id), String(buyer._id));
    await podMemberService.cancelBackout(String(pod._id), String(buyer._id));
    await podMemberService.backout(String(pod._id), String(buyer._id));
    await podMemberService.joinFree(String(pod._id), new Types.ObjectId().toString());

    const rows = await podMemberService.listBackoutRefunds();
    expect(rows).toHaveLength(2);
    const cancelled = rows.find((r) => r.backout_status === 'CANCELLED')!;
    const filled = rows.find((r) => r.backout_status === 'SPOT_FILLED')!;

    expect(cancelled).toMatchObject({
      user_name: 'Asha Rao',
      user_email: 'buyer@x.com',
      attempt_no: 1,
      backout_attempts_used: 2,
      max_backout_attempts: 3,
      replacement_confirmed: false,
      refund_status: 'NONE',
      payment_amount: 500,
      deduction_pct: 10,
      refund_amount: 450,
      status: 'BACKED_OUT',
    });
    expect(cancelled.backout_no).toMatch(/^DUN-BKO-\d{6}$/);
    expect(cancelled.events.map((e: any) => e.status)).toEqual(['IN_PROCESS', 'CANCELLED']);

    expect(filled).toMatchObject({
      attempt_no: 2,
      replacement_confirmed: true,
      refund_status: 'PENDING',
      payment_currency: '₹',
      payment_status: 'SUCCESS',
    });
    expect(filled.events.map((e: any) => e.status)).toEqual(['IN_PROCESS', 'SPOT_FILLED']);
    expect(filled.backout_no).not.toBe(cancelled.backout_no);
  });

  it('derives fallback fields for free bookings and deleted member docs', async () => {
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    const member = await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));

    // Free booking → NOT_ELIGIBLE; delete the member so fallbacks kick in.
    await PodMemberModel.deleteOne({ _id: member._id });

    const [row] = await podMemberService.listBackoutRefunds();
    expect(row).toMatchObject({
      refund_status: 'NOT_ELIGIBLE',
      status: 'BACKOUT_IN_PROCESS', // derived from the request when the member is gone
      user_name: null,
      payment_amount: null,
    });
    expect(row.joined_at).toBe(row.created_at); // joined_at falls back to the request time
  });

  it('hydrates the live payment total when the request snapshot is missing', async () => {
    const pod = await makePodDoc();
    const buyer = await makeUser();
    const payment = await makePayment(buyer._id, { total: 750 });
    const member = await joinMember(pod, buyer._id, { source: 'PAID', payment_id: payment._id });
    await BackoutRequestModel.create({
      backout_no: 'DUN-BKO-999902',
      pod_id: pod._id,
      user_id: buyer._id,
      member_id: member._id,
      payment_id: payment._id,
      attempt_no: 1,
      status: 'IN_PROCESS',
      payment_amount: null,
      events: [{ status: 'IN_PROCESS', backout_count: 1, at: new Date() }],
    });

    const [row] = await podMemberService.listBackoutRefunds();
    expect(row.payment_amount).toBe(750);
    expect(row.refund_status).toBe('NONE');
  });

  it('gets a single request by id and returns null otherwise', async () => {
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));
    const request = await BackoutRequestModel.findOne({ user_id: user });

    const row = await podMemberService.getBackoutRefund(String(request!._id));
    expect(row).toMatchObject({ backout_no: request!.backout_no, backout_status: 'IN_PROCESS' });
    expect(await podMemberService.getBackoutRefund('not-a-valid-id')).toBeNull();
    expect(await podMemberService.getBackoutRefund(new Types.ObjectId().toString())).toBeNull();
  });

  it('serves the table with Backout-ID search, status filter, sort and paging', async () => {
    const pod = await makePodDoc({ no_of_spots: 4 });
    const a = new Types.ObjectId();
    const b = new Types.ObjectId();
    await joinMember(pod, a);
    await joinMember(pod, b);
    await podMemberService.backout(String(pod._id), String(a));
    await podMemberService.backout(String(pod._id), String(b));
    await podMemberService.cancelBackout(String(pod._id), String(b));
    const reqA = await BackoutRequestModel.findOne({ user_id: a });

    const all = await podMemberService.tableBackoutRefunds();
    expect(all.total).toBe(2);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    const searched = await podMemberService.tableBackoutRefunds({ search: reqA!.backout_no });
    expect(searched.total).toBe(1);
    expect(searched.rows[0].backout_no).toBe(reqA!.backout_no);

    const cancelled = await podMemberService.tableBackoutRefunds({
      filters: [{ field: 'backout_status', op: 'eq', value: 'CANCELLED' }],
    });
    expect(cancelled.rows.map((r) => r.user_id)).toEqual([String(b)]);

    const byNo = await podMemberService.tableBackoutRefunds({
      filters: [{ field: 'backout_no', op: 'contains', value: reqA!.backout_no.slice(-6) }],
    });
    expect(byNo.total).toBe(1);

    const asc = await podMemberService.tableBackoutRefunds({ sort_by: 'created_at', sort_dir: 'asc' });
    expect(asc.rows[0].user_id).toBe(String(a));
    const page2 = await podMemberService.tableBackoutRefunds({ page: 2, page_size: 1 });
    expect(page2.rows).toHaveLength(1);
    expect(page2.total).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});

describe('processBackoutRefund (finance — one refund per request)', () => {
  const filledPaidRequest = async () => {
    await setDeductionPct(10);
    const pod = await makePodDoc({ no_of_spots: 1 });
    const buyer = await makeUser();
    const payment = await makePayment(buyer._id);
    await joinMember(pod, buyer._id, { source: 'PAID', payment_id: payment._id });
    await podMemberService.backout(String(pod._id), String(buyer._id));
    await podMemberService.joinFree(String(pod._id), new Types.ObjectId().toString());
    const request = await BackoutRequestModel.findOne({ user_id: buyer._id });
    return { pod, buyer, payment, request: request! };
  };

  it('processes a Spot Filled refund exactly once and notifies the member', async () => {
    const { buyer, payment, request } = await filledPaidRequest();

    const row = await podMemberService.processBackoutRefund(String(request._id));
    expect(row.refund_status).toBe('PROCESSED');
    expect(row.refund_processed_at).not.toBeNull();

    const refreshedPayment = await PaymentModel.findById(payment._id);
    expect(refreshedPayment!.status).toBe('REFUNDED');
    expect((refreshedPayment!.metadata as any).refund_reason).toBe('backout_spot_filled');
    expect((refreshedPayment!.metadata as any).backout_no).toBe(request.backout_no);

    const member = await PodMemberModel.findOne({ user_id: buyer._id });
    expect(member!.refund_status).toBe('PROCESSED');
    expect(String(member!.refund_payment_id)).toBe(String(payment._id));

    expect(refundEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@x.com', amount: '₹450' })
    );
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Refund processed' })
    );

    await expect(podMemberService.processBackoutRefund(String(request._id))).rejects.toThrow(
      /already been refunded/i
    );
  });

  it('rejects requests that are not refund-eligible', async () => {
    await expect(podMemberService.processBackoutRefund('bad-id')).rejects.toThrow(/not found/i);
    await expect(
      podMemberService.processBackoutRefund(new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);

    // Still in process → not eligible.
    const pod = await makePodDoc();
    const user = new Types.ObjectId();
    await joinMember(pod, user);
    await podMemberService.backout(String(pod._id), String(user));
    const inProcess = await BackoutRequestModel.findOne({ user_id: user });
    await expect(podMemberService.processBackoutRefund(String(inProcess!._id))).rejects.toThrow(
      /only after the spot is filled/i
    );

    // Spot filled but free (no payment) → nothing to refund.
    const freePod = await makePodDoc({ no_of_spots: 1 });
    const freeUser = new Types.ObjectId();
    await joinMember(freePod, freeUser);
    await podMemberService.backout(String(freePod._id), String(freeUser));
    await podMemberService.joinFree(String(freePod._id), new Types.ObjectId().toString());
    const freeReq = await BackoutRequestModel.findOne({ user_id: freeUser });
    await expect(podMemberService.processBackoutRefund(String(freeReq!._id))).rejects.toThrow(
      /no payment to refund/i
    );
  });

  it('rejects when the linked payment is missing or not refundable', async () => {
    const { request, payment } = await filledPaidRequest();

    await PaymentModel.updateOne({ _id: payment._id }, { $set: { status: 'FAILED' } });
    await expect(podMemberService.processBackoutRefund(String(request._id))).rejects.toThrow(
      /cannot be refunded/i
    );

    await PaymentModel.deleteOne({ _id: payment._id });
    await expect(podMemberService.processBackoutRefund(String(request._id))).rejects.toThrow(
      /cannot be refunded/i
    );
  });

  it('still processes when the member doc is gone and when notifications fail', async () => {
    const { buyer, request } = await filledPaidRequest();
    await PodMemberModel.deleteMany({ user_id: buyer._id });
    notifyCreate.mockRejectedValueOnce(new Error('sse down'));

    const row = await podMemberService.processBackoutRefund(String(request._id));
    expect(row.refund_status).toBe('PROCESSED');
  });
});
