import { Types } from 'mongoose';
import { podMemberService } from '../../podMember.service';
import { podMemberResolvers } from '../../podMember.resolver';
import { PodMemberModel } from '../../podMember.model';
import { BackoutRequestModel } from '../../backoutRequest.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { makeContext } from '@test/harness';

const makePod = (over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `att-${Math.random().toString(36).slice(2)}`,
    pod_title: 'Attendees pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'FREE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    no_of_spots: 4,
    is_active: true,
    ...over,
  });

const makeUser = (first: string, last: string, over: Record<string, unknown> = {}) =>
  UserModel.create({
    auth: { email: `${first.toLowerCase()}@x.com` },
    profile: { first_name: first, last_name: last },
    ...over,
  } as never);

describe('podSpotFills / listSpotFills', () => {
  it('returns [] for an invalid id and for a pod with no filled backouts', async () => {
    expect(await podMemberService.listSpotFills('not-an-id')).toEqual([]);
    const pod = await makePod();
    expect(await podMemberService.listSpotFills(String(pod._id))).toEqual([]);
  });

  it('hydrates the backed-out user and the replacement with names and photos', async () => {
    const pod = await makePod();
    const out = await makeUser('Asha', 'Rao', {
      profile: { first_name: 'Asha', last_name: 'Rao', profile_photo: 'https://img/asha.jpg' },
    });
    const filler = await makeUser('Bela', 'Jain', {
      profile: { first_name: 'Bela', last_name: 'Jain', profile_photo: 'https://img/bela.jpg' },
    });
    const member = await PodMemberModel.create({
      pod_id: pod._id,
      user_id: out._id,
      status: 'BACKED_OUT',
      source: 'FREE',
    });
    const filledAt = new Date('2026-07-01T10:00:00.000Z');
    await BackoutRequestModel.create({
      backout_no: 'DUN-BKO-000101',
      pod_id: pod._id,
      user_id: out._id,
      member_id: member._id,
      attempt_no: 1,
      status: 'SPOT_FILLED',
      replacement_user_id: filler._id,
      events: [
        { status: 'IN_PROCESS', backout_count: 1, at: new Date('2026-06-30T10:00:00.000Z') },
        { status: 'SPOT_FILLED', backout_count: 1, at: filledAt },
      ],
    });

    const rows = await podMemberService.listSpotFills(String(pod._id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      backout_no: 'DUN-BKO-000101',
      backed_out_user_id: String(out._id),
      backed_out_user_name: 'Asha Rao',
      backed_out_profile_photo: 'https://img/asha.jpg',
      replacement_user_id: String(filler._id),
      replacement_user_name: 'Bela Jain',
      replacement_profile_photo: 'https://img/bela.jpg',
      filled_at: filledAt.toISOString(),
    });
  });

  it('renders legacy rows (no replacement, no events, unknown user) with nulls', async () => {
    const pod = await makePod();
    // Raw insert: no replacement_user_id, no events, no timestamps — the
    // legacy shape from before those fields existed.
    await BackoutRequestModel.collection.insertOne({
      backout_no: 'DUN-BKO-000102',
      pod_id: pod._id,
      user_id: new Types.ObjectId(),
      member_id: new Types.ObjectId(),
      attempt_no: 1,
      status: 'SPOT_FILLED',
    });

    // Model-created request with no SPOT_FILLED event — filled_at falls back
    // to updated_at.
    const eventless = await BackoutRequestModel.create({
      backout_no: 'DUN-BKO-000103',
      pod_id: pod._id,
      user_id: new Types.ObjectId(),
      member_id: new Types.ObjectId(),
      attempt_no: 1,
      status: 'SPOT_FILLED',
      events: [],
    });

    const rows = await podMemberService.listSpotFills(String(pod._id));
    expect(rows).toHaveLength(2);
    const byNo = new Map(rows.map((r) => [r.backout_no, r]));
    expect(byNo.get('DUN-BKO-000102')).toMatchObject({
      backed_out_user_name: null,
      backed_out_profile_photo: null,
      replacement_user_id: null,
      replacement_user_name: null,
      replacement_profile_photo: null,
      filled_at: '',
    });
    expect(byNo.get('DUN-BKO-000103')?.filled_at).toBe(eventless.updated_at.toISOString());
  });

  it('resolves over the resolver without auth', async () => {
    const pod = await makePod();
    const rows = await podMemberResolvers.Query.podSpotFills(null, {
      pod_doc_id: String(pod._id),
    });
    expect(rows).toEqual([]);
  });
});

describe('adminPodAttendees / listAdminAttendees', () => {
  it('rejects invalid and unknown pod ids', async () => {
    await expect(podMemberService.listAdminAttendees('nope')).rejects.toThrow('Pod not found');
    await expect(
      podMemberService.listAdminAttendees(new Types.ObjectId().toString()),
    ).rejects.toThrow('Pod not found');
  });

  it('lists the host seat, joined members and replaced members with contacts', async () => {
    const host = await makeUser('Hema', 'Kaur');
    const joined = await makeUser('Jai', 'Verma', {
      auth: { email: 'jai@x.com', phone: { extension: '91', number: '9876543210' } },
    });
    const out = await makeUser('Asha', 'Rao');
    const filler = await makeUser('Bela', 'Jain');
    const pod = await makePod({
      pod_hosts_id: [host._id],
      pod_attendees: [host._id, joined._id, filler._id],
      deleted_at: new Date(), // cancelled pods keep their attendee list
    });
    const paymentId = new Types.ObjectId();
    await PodMemberModel.create({
      pod_id: pod._id,
      user_id: joined._id,
      status: 'JOINED',
      source: 'PAID',
      payment_id: paymentId,
      joined_at: new Date('2026-06-01T09:00:00.000Z'),
    });
    const outMember = await PodMemberModel.create({
      pod_id: pod._id,
      user_id: out._id,
      status: 'BACKED_OUT',
      source: 'FREE',
      refund_status: 'PENDING',
      backed_out_at: new Date('2026-06-02T09:00:00.000Z'),
      joined_at: new Date('2026-06-01T10:00:00.000Z'),
    });
    await BackoutRequestModel.create({
      backout_no: 'DUN-BKO-000201',
      pod_id: pod._id,
      user_id: out._id,
      member_id: outMember._id,
      attempt_no: 1,
      status: 'SPOT_FILLED',
      replacement_user_id: filler._id,
    });

    const rows = await podMemberService.listAdminAttendees(String(pod._id));
    const byUser = new Map(rows.map((r) => [r.user_id, r]));
    expect(byUser.get(String(host._id))).toMatchObject({
      full_name: 'Hema Kaur',
      is_host: true,
      status: null,
      member_id: null,
      payment_id: null,
    });
    expect(byUser.get(String(joined._id))).toMatchObject({
      full_name: 'Jai Verma',
      email: 'jai@x.com',
      phone: '+91 9876543210',
      is_host: false,
      status: 'JOINED',
      source: 'PAID',
      payment_id: String(paymentId),
      replaced_by_user_id: null,
    });
    expect(byUser.get(String(out._id))).toMatchObject({
      status: 'BACKED_OUT',
      refund_status: 'PENDING',
      member_id: String(outMember._id),
      backout_no: 'DUN-BKO-000201',
      replaced_by_user_id: String(filler._id),
      replaced_by_name: 'Bela Jain',
    });
    // The filler joined via pod_attendees without a member row in this seed.
    expect(byUser.get(String(filler._id))).toMatchObject({ status: null, is_host: false });
  });

  it('handles legacy pods and fills without a recorded replacement', async () => {
    // Raw insert: pod without pod_hosts_id / pod_attendees arrays.
    const rawPodId = new Types.ObjectId();
    await PodModel.collection.insertOne({
      _id: rawPodId,
      pod_id: 'legacy-pod',
      pod_title: 'Legacy',
      club_id: new Types.ObjectId(),
      pod_description: 'd',
      pod_type: 'FREE',
      pod_date_time: new Date(),
      deleted_at: null,
    });
    const ghostMember = await PodMemberModel.create({
      pod_id: rawPodId,
      user_id: new Types.ObjectId(), // no matching user doc
      status: 'BACKED_OUT',
      source: 'FREE',
    });
    await BackoutRequestModel.create({
      backout_no: 'DUN-BKO-000202',
      pod_id: rawPodId,
      user_id: ghostMember.user_id,
      member_id: ghostMember._id,
      attempt_no: 1,
      status: 'SPOT_FILLED',
      replacement_user_id: null,
    });

    const rows = await podMemberService.listAdminAttendees(String(rawPodId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      full_name: null,
      email: null,
      phone: null,
      profile_photo: null,
      backout_no: 'DUN-BKO-000202',
      replaced_by_user_id: null,
      replaced_by_name: null,
    });
  });

  it('is role-gated on the resolver', async () => {
    const pod = await makePod();
    const rows = await podMemberResolvers.Query.adminPodAttendees(
      null,
      { pod_doc_id: String(pod._id) },
      makeContext({ roles: ['SUPER_ADMIN'] }),
    );
    expect(rows).toEqual([]);
    await expect(
      podMemberResolvers.Query.adminPodAttendees(
        null,
        { pod_doc_id: String(pod._id) },
        makeContext({ roles: [] }),
      ),
    ).rejects.toThrow();
  });
});
