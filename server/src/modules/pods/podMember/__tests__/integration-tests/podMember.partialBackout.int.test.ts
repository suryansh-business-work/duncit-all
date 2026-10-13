import { Types } from 'mongoose';
import { podMemberService } from '../../podMember.service';
import { PodMemberModel } from '../../podMember.model';
import { BackoutRequestModel } from '../../backoutRequest.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { FinanceSettingsModel } from '@modules/finance/finance/finance.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';

let seq = 0;

async function bookingOf(seats: number, over: { paid?: boolean; extra?: Record<string, unknown> } = {}) {
  const buyer = await UserModel.create({
    auth: { email: `partial${++seq}@x.com` },
    profile: { first_name: 'Asha', last_name: 'Rao' },
  } as never);
  const pod = await PodModel.create({
    pod_id: `pp-${++seq}`,
    pod_title: 'Group pod',
    club_id: new Types.ObjectId(),
    pod_description: 'd',
    pod_type: 'PAID',
    pod_date_time: new Date(Date.now() + 86_400_000),
    no_of_spots: 10,
    is_active: true,
    pod_attendees: [buyer._id],
    extra_seats: seats - 1,
    ...over.extra,
  });
  const payment = over.paid
    ? await PaymentModel.create({
        payment_id: `pay-${++seq}`,
        user_id: buyer._id,
        user_name: 'Asha Rao',
        user_email: 'b@x.com',
        subtotal: 400,
        total: 400,
        currency_symbol: '₹',
        status: 'SUCCESS',
        metadata: { seats },
      } as never)
    : null;
  const member = await PodMemberModel.create({
    pod_id: pod._id,
    user_id: buyer._id,
    status: 'JOINED',
    source: payment ? 'PAID' : 'FREE',
    refund_status: 'NONE',
    seats,
    payment_id: payment?._id ?? null,
  });
  return { buyer, pod, member, payment, uid: String(buyer._id), podId: String(pod._id) };
}

const reload = async (podId: string, uid: string) => ({
  pod: await PodModel.findById(podId),
  member: await PodMemberModel.findOne({ pod_id: podId, user_id: uid }),
});

describe('partial backout', () => {
  beforeEach(async () => {
    await FinanceSettingsModel.updateOne(
      { singleton_key: 'finance' },
      { $set: { default_backout_deduction_pct: 0 } },
      { upsert: true }
    );
  });

  it('releases some seats, keeps the member JOINED and records a partial request', async () => {
    const b = await bookingOf(4, { paid: true });
    const res = await podMemberService.backout(b.podId, b.uid, 1);
    expect(res).toMatchObject({ status: 'JOINED', seats: 3, backout_count: 1 });
    const { pod } = await reload(b.podId, b.uid);
    expect(pod?.extra_seats).toBe(2);
    expect(pod?.pod_attendees.map(String)).toEqual([b.uid]);
    const request = await BackoutRequestModel.findOne({ user_id: b.buyer._id });
    expect(request).toMatchObject({ seats: 1, seats_before: 4, status: 'IN_PROCESS', payment_amount: 100, refund_amount: 100 });
  });

  it('shrinks the ticket the QR admits', async () => {
    const b = await bookingOf(3);
    await TicketModel.collection.insertOne({ membership_id: b.member._id, seats: 3 } as never);
    await podMemberService.backout(b.podId, b.uid, 2);
    const ticket = await TicketModel.collection.findOne({ membership_id: b.member._id });
    expect(ticket?.seats).toBe(1);
  });

  it('refuses a release of zero or more than the booking holds', async () => {
    const b = await bookingOf(2);
    await expect(podMemberService.backout(b.podId, b.uid, 0)).rejects.toThrow('Choose at least one seat to release');
    await expect(podMemberService.backout(b.podId, b.uid, 5)).rejects.toThrow('holds 2 seats');
    const single = await bookingOf(1);
    await expect(podMemberService.backout(single.podId, single.uid, 2)).rejects.toThrow('holds 1 seat —');
    expect(await BackoutRequestModel.countDocuments()).toBe(0);
  });

  it('refuses a backout once the pod has taken place', async () => {
    const b = await bookingOf(1, { extra: { pod_date_time: new Date(Date.now() - 60_000) } });
    await expect(podMemberService.backout(b.podId, b.uid)).rejects.toMatchObject({
      message: 'This pod has already taken place — backout is closed.',
    });
  });

  it('tells a member whose whole booking is already backing out so, and others they are not a member', async () => {
    const b = await bookingOf(1);
    await podMemberService.backout(b.podId, b.uid);
    await expect(podMemberService.backout(b.podId, b.uid)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    const stranger = String(new Types.ObjectId());
    await expect(podMemberService.backout(b.podId, stranger)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('keeping a partial release restores the seats on the member and the pod', async () => {
    const b = await bookingOf(3);
    await podMemberService.backout(b.podId, b.uid, 2);
    const res = await podMemberService.cancelBackout(b.podId, b.uid);
    expect(res).toMatchObject({ status: 'JOINED', seats: 3 });
    const { pod } = await reload(b.podId, b.uid);
    expect(pod?.extra_seats).toBe(2);
    const request = await BackoutRequestModel.findOne({ user_id: b.buyer._id });
    expect(request?.status).toBe('CANCELLED');
    expect(request?.events.map((e) => e.status)).toEqual(['IN_PROCESS', 'CANCELLED']);
  });

  it('keeps a specific release by id, but only the caller own and only while open', async () => {
    const b = await bookingOf(4);
    await podMemberService.backout(b.podId, b.uid, 1);
    await podMemberService.backout(b.podId, b.uid, 1);
    const [first, second] = await BackoutRequestModel.find({ user_id: b.buyer._id }).sort({ attempt_no: 1 });
    await expect(
      podMemberService.cancelBackout(b.podId, b.uid, String(new Types.ObjectId()))
    ).rejects.toThrow('That backout is not yours');
    await podMemberService.cancelBackout(b.podId, b.uid, String(first._id));
    await expect(podMemberService.cancelBackout(b.podId, b.uid, String(first._id))).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
    const res = await podMemberService.cancelBackout(b.podId, b.uid, String(second._id));
    expect(res.seats).toBe(4);
  });

  it('cannot keep a partial release after the member left entirely', async () => {
    const b = await bookingOf(3);
    await podMemberService.backout(b.podId, b.uid, 1);
    await PodMemberModel.updateOne({ _id: b.member._id }, { status: 'BACKED_OUT' });
    await expect(podMemberService.cancelBackout(b.podId, b.uid)).rejects.toThrow('can no longer be cancelled');
    await PodMemberModel.deleteOne({ _id: b.member._id });
    await expect(podMemberService.cancelBackout(b.podId, b.uid)).rejects.toThrow('not a member of this pod');
  });

  it('keeping a spot with a missing or full pod is refused', async () => {
    await expect(podMemberService.cancelBackout(String(new Types.ObjectId()), String(new Types.ObjectId()))).rejects.toThrow(
      'Pod not found'
    );
    const b = await bookingOf(2);
    await podMemberService.backout(b.podId, b.uid, 1);
    await PodModel.updateOne({ _id: b.pod._id }, { $set: { no_of_spots: 1 } });
    await expect(podMemberService.cancelBackout(b.podId, b.uid)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });

  it('with no open or filled release the caller is told there is nothing to keep', async () => {
    const b = await bookingOf(2);
    await expect(podMemberService.cancelBackout(b.podId, b.uid)).rejects.toThrow('no backout in process');
    await podMemberService.backout(b.podId, b.uid, 1);
    await BackoutRequestModel.updateMany({}, { status: 'SPOT_FILLED' });
    await expect(podMemberService.cancelBackout(b.podId, b.uid)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });
});
