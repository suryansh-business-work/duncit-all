import { Types } from 'mongoose';
import { myBookingClashes } from '../../podMember.clash';
import { podMemberResolvers } from '../../podMember.resolver';
import { PodMemberModel } from '../../podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { POD_LIVE_TAIL_MS } from '@modules/pods/pod/pod.lifecycle';
import { ClubModel } from '@modules/clubs/club/club.model';
import { makeContext } from '@test/harness';

/**
 * "You already have a pod at that time": the member's JOINED pods whose time
 * overlaps the pod(s) they are about to book. Advisory — it never blocks.
 */

const HOUR = 60 * 60 * 1000;
const BASE = Date.now() + 7 * 24 * HOUR;
const at = (hours: number) => new Date(BASE + hours * HOUR);

let club: { _id: Types.ObjectId; club_id: string };

beforeEach(async () => {
  const slug = `club-${new Types.ObjectId().toString()}`;
  const doc = await ClubModel.create({ club_id: slug, club_name: 'Clash club' } as never);
  club = { _id: doc._id as Types.ObjectId, club_id: slug };
});

const makePod = (start: Date, end: Date | null = null, over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toString()}`,
    pod_title: `Pod at ${start.toISOString()}`,
    club_id: club._id,
    pod_description: 'desc',
    pod_mode: 'PHYSICAL',
    pod_type: 'FREE',
    pod_amount: 0,
    pod_hosts_id: [new Types.ObjectId()],
    pod_date_time: start,
    pod_end_date_time: end,
    no_of_spots: 6,
    is_active: true,
    ...over,
  });

const book = (podId: unknown, userId: Types.ObjectId, status = 'JOINED') =>
  PodMemberModel.create({ pod_id: podId, user_id: userId, status, seats: 1, source: 'FREE' });

const ids = (clashes: { pod_id: string }[]) => clashes.map((c) => c.pod_id).sort((a, b) => a.localeCompare(b));

describe('myBookingClashes', () => {
  it('lists every JOINED pod that overlaps the pod being booked, with what the dialog needs to link it', async () => {
    const user = new Types.ObjectId();
    const target = await makePod(at(0), at(2));
    const overlapStart = await makePod(at(-1), at(1));
    const inside = await makePod(at(0.5), at(1.5));
    await book(overlapStart._id, user);
    await book(inside._id, user);

    const clashes = await myBookingClashes(String(user), [String(target._id)]);

    expect(ids(clashes)).toEqual([String(overlapStart._id), String(inside._id)].sort((a, b) => a.localeCompare(b)));
    const first = clashes.find((c) => c.pod_id === String(overlapStart._id))!;
    expect(first).toEqual({
      target_pod_id: String(target._id),
      pod_id: String(overlapStart._id),
      pod_slug: overlapStart.pod_id,
      club_slug: club.club_id,
      pod_title: overlapStart.pod_title,
      pod_date_time: at(-1).toISOString(),
      pod_end_date_time: at(1).toISOString(),
    });
  });

  it('treats touching times as no clash — one pod ending exactly when the other starts', async () => {
    const user = new Types.ObjectId();
    const target = await makePod(at(0), at(2));
    const before = await makePod(at(-2), at(0));
    const after = await makePod(at(2), at(3));
    await book(before._id, user);
    await book(after._id, user);

    expect(await myBookingClashes(String(user), [String(target._id)])).toEqual([]);
  });

  it('gives a pod with no end the live tail, so an end-less pod still clashes for its first hours', async () => {
    const user = new Types.ObjectId();
    const target = await makePod(at(3), at(5));
    const endless = await makePod(at(0));
    await book(endless._id, user);

    const [clash] = await myBookingClashes(String(user), [String(target._id)]);
    expect(clash.pod_id).toBe(String(endless._id));
    expect(clash.pod_end_date_time).toBe(new Date(at(0).getTime() + POD_LIVE_TAIL_MS).toISOString());

    const later = await makePod(at(4.5), at(6));
    expect(await myBookingClashes(String(user), [String(later._id)])).toEqual([]);
  });

  it('ignores bookings that are not JOINED, other people, cancelled or completed pods, and the target itself', async () => {
    const user = new Types.ObjectId();
    const target = await makePod(at(0), at(2));
    const cancelledSpot = await makePod(at(0), at(2));
    const someoneElse = await makePod(at(0), at(2));
    const deletedPod = await makePod(at(0), at(2), { deleted_at: new Date() });
    const completedPod = await makePod(at(0), at(2), { completed_at: new Date() });
    await book(cancelledSpot._id, user, 'BACKED_OUT');
    await book(someoneElse._id, new Types.ObjectId());
    await book(deletedPod._id, user);
    await book(completedPod._id, user);
    await book(target._id, user);

    expect(await myBookingClashes(String(user), [String(target._id)])).toEqual([]);
  });

  it('checks every date of a recurring booking and reports each date a booked pod overlaps', async () => {
    const user = new Types.ObjectId();
    const dateOne = await makePod(at(0), at(2));
    const dateTwo = await makePod(at(24), at(26));
    const booked = await makePod(at(1), at(25));
    await book(booked._id, user);

    const clashes = await myBookingClashes(String(user), [String(dateOne._id), String(dateTwo._id)]);

    expect(clashes.map((c) => c.target_pod_id).sort((a, b) => a.localeCompare(b))).toEqual(
      [String(dateOne._id), String(dateTwo._id)].sort((a, b) => a.localeCompare(b))
    );
  });

  it('answers empty for invalid or unknown ids instead of failing the booking it precedes', async () => {
    const user = new Types.ObjectId();
    expect(await myBookingClashes(String(user), [])).toEqual([]);
    expect(await myBookingClashes(String(user), ['not-an-id'])).toEqual([]);
    expect(await myBookingClashes(String(user), [String(new Types.ObjectId())])).toEqual([]);
  });

  it('returns no club slug rather than a broken link when the booked pod has lost its club', async () => {
    const user = new Types.ObjectId();
    const target = await makePod(at(0), at(2));
    const orphan = await makePod(at(1), at(3), { club_id: new Types.ObjectId() });
    await book(orphan._id, user);

    const [clash] = await myBookingClashes(String(user), [String(target._id)]);
    expect(clash.club_slug).toBe('');
  });
});

describe('Query.myBookingClashes', () => {
  it('requires a signed-in caller', async () => {
    await expect(
      (async () =>
        (podMemberResolvers.Query as any).myBookingClashes({}, { pod_doc_ids: [] }, makeContext(null)))()
    ).rejects.toThrow(/authentication required/i);
  });
});
