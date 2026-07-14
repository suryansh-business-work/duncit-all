import { Types } from 'mongoose';
import { podMemberService } from '../../podMember.service';
import { PodMemberModel } from '../../podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { UserModel } from '@modules/access/user/user.model';

const userId = new Types.ObjectId().toString();
const podId = new Types.ObjectId().toString();

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
  const makePod = (over: Record<string, unknown> = {}) => ({
    pod_id: `p-${Math.random().toString(36).slice(2)}`,
    pod_title: 'Guard pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'NATIVE_FREE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    is_active: true,
    ...over,
  });

  it('rejects joinFree once the pod date has passed', async () => {
    const { PodModel } = await import('@modules/pods/pod/pod.model');
    const past = await PodModel.create(makePod({ pod_date_time: new Date(Date.now() - 3_600_000) }));
    await expect(
      podMemberService.joinFree(String(past._id), new Types.ObjectId().toString())
    ).rejects.toThrow(/already taken place/i);
  });

  it('still allows joining an upcoming free pod', async () => {
    const { PodModel } = await import('@modules/pods/pod/pod.model');
    const upcoming = await PodModel.create(makePod());
    const member = await podMemberService.joinFree(
      String(upcoming._id),
      new Types.ObjectId().toString()
    );
    expect(member.status).toBe('JOINED');
  });
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

const backedOut = (podId: unknown, userId: unknown, over: Record<string, unknown> = {}) =>
  PodMemberModel.create({
    pod_id: podId,
    user_id: userId,
    status: 'BACKED_OUT',
    backed_out_at: new Date(),
    source: 'PAID',
    refund_status: 'PENDING',
    ...over,
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
});

describe('backout refund requests (finance)', () => {
  it('lists nothing when there are no backouts', async () => {
    expect(await podMemberService.listBackoutRefunds()).toEqual([]);
  });

  it('hydrates rows with user + payment, and handles free / deleted-user rows', async () => {
    const pod = await makePodDoc();

    const buyer = await UserModel.create({
      auth: { email: 'buyer@x.com' },
      profile: { first_name: 'Asha', last_name: 'Rao' },
    } as never);
    const payment = await PaymentModel.create({
      payment_id: `pay-${Date.now()}`,
      user_id: buyer._id,
      user_name: 'Asha Rao',
      user_email: 'buyer@x.com',
      subtotal: 500,
      total: 500,
      currency_symbol: '₹',
      status: 'SUCCESS',
    } as never);
    await backedOut(pod._id, buyer._id, { payment_id: payment._id, joined_at: new Date() });

    // Free backout: user present but no surname, no payment.
    const freeUser = await UserModel.create({
      auth: {},
      profile: { first_name: 'Ravi' },
    } as never);
    await backedOut(pod._id, freeUser._id, { source: 'FREE', refund_status: 'NOT_ELIGIBLE', payment_id: null });

    // Deleted-user backout: membership user_id no longer resolves + no backed_out_at.
    await backedOut(pod._id, new Types.ObjectId(), { source: 'FREE', refund_status: 'NOT_ELIGIBLE', payment_id: null, backed_out_at: null });

    const rows = await podMemberService.listBackoutRefunds();
    expect(rows).toHaveLength(3);

    const paid = rows.find((r) => r.payment_id);
    expect(paid).toMatchObject({
      user_name: 'Asha Rao',
      user_email: 'buyer@x.com',
      payment_amount: 500,
      payment_currency: '₹',
      payment_status: 'SUCCESS',
      refund_threshold_pct: 80,
    });

    const free = rows.find((r) => String(r.user_id) === String(freeUser._id));
    expect(free).toMatchObject({ user_name: 'Ravi', user_email: null, payment_amount: null, payment_status: null });

    const deleted = rows.find((r) => r.user_name === null);
    expect(deleted).toMatchObject({ user_email: null, payment_id: null, backed_out_at: null });
  });

  it('gets a single backout refund by id and returns null otherwise', async () => {
    const pod = await makePodDoc();
    const backed = await backedOut(pod._id, new Types.ObjectId(), { source: 'FREE', refund_status: 'NOT_ELIGIBLE', payment_id: null });
    const joined = await PodMemberModel.create({ pod_id: pod._id, user_id: new Types.ObjectId(), status: 'JOINED', source: 'FREE', refund_status: 'NONE' });

    expect(await podMemberService.getBackoutRefund(String(backed._id))).not.toBeNull();
    expect(await podMemberService.getBackoutRefund(String(joined._id))).toBeNull();
    expect(await podMemberService.getBackoutRefund('not-a-valid-id')).toBeNull();
    expect(await podMemberService.getBackoutRefund(new Types.ObjectId().toString())).toBeNull();
  });

  it('serves the backoutRefundRequestsTable page scoped to BACKED_OUT rows only', async () => {
    const pod = await makePodDoc();
    const memberA = new Types.ObjectId();
    const memberB = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: memberA,
      profile: { first_name: 'Amit', last_name: 'Kumar' },
      auth: { email: 'amit@example.com' },
    } as never);
    await backedOut(pod._id, memberA, { backed_out_at: new Date('2030-01-02T00:00:00Z') });
    await backedOut(pod._id, memberB, {
      backed_out_at: new Date('2030-01-01T00:00:00Z'),
      source: 'FREE',
      refund_status: 'NOT_ELIGIBLE',
      payment_id: null,
    });
    await PodMemberModel.create({
      pod_id: pod._id,
      user_id: new Types.ObjectId(),
      status: 'JOINED',
      source: 'FREE',
      refund_status: 'NONE',
    });

    // Default page: backed_out_at desc; the JOINED membership never surfaces.
    const all = await podMemberService.tableBackoutRefunds();
    expect(all.total).toBe(2);
    expect(all.rows.map((r) => r.refund_status)).toEqual(['PENDING', 'NOT_ELIGIBLE']);
    expect(all.rows[0].user_name).toBe('Amit Kumar'); // hydrated buyer identity
    expect(all.rows[0].user_email).toBe('amit@example.com');
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // `status` is not allowlisted, so a crafted filter cannot widen past the
    // BACKED_OUT baseFilter.
    const forced = await podMemberService.tableBackoutRefunds({
      filters: [{ field: 'status', op: 'eq', value: 'JOINED' }],
    });
    expect(forced.total).toBe(2);
    expect(forced.rows.every((r) => r.status === 'BACKED_OUT')).toBe(true);

    // Enum filter narrows.
    const pending = await podMemberService.tableBackoutRefunds({
      filters: [{ field: 'refund_status', op: 'eq', value: 'PENDING' }],
    });
    expect(pending.rows.map((r) => r.user_id)).toEqual([String(memberA)]);

    // Allowlisted sort + paging over it.
    const sorted = await podMemberService.tableBackoutRefunds({ sort_by: 'backed_out_at', sort_dir: 'asc' });
    expect(sorted.rows.map((r) => r.refund_status)).toEqual(['NOT_ELIGIBLE', 'PENDING']);
    const page2 = await podMemberService.tableBackoutRefunds({ page: 2, page_size: 1 });
    expect(page2.rows).toHaveLength(1);
    expect(page2.total).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
