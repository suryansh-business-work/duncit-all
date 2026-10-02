/**
 * Saved pods (user.saved) against a real database: the save toggle with its
 * counter and duplicate-insert race, and the saved list's visibility rules,
 * category-tree filter, escaped search, every sort, and the public pod shape.
 *
 * Pods, clubs and categories are inserted raw — only the fields this code
 * reads matter, and a full pod fixture would hide which ones those are.
 */
import { Types } from 'mongoose';

import { userService } from '../../user.service';
import { UserModel } from '../../user.model';
import { UserSavedPodModel } from '../../relations';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';

let seq = 0;
async function makeUser() {
  seq += 1;
  const doc = await UserModel.create({
    profile: { first_name: 'Sam' },
    auth: { email: `saved${seq}@example.com` },
  });
  return String(doc._id);
}

async function insertPod(fields: Record<string, any> = {}) {
  const _id = new Types.ObjectId();
  await PodModel.collection.insertOne({
    _id,
    pod_id: `pod-${String(_id).slice(-6)}`,
    pod_title: 'Morning Run',
    pod_description: 'An easy 5k',
    pod_type: 'PAID',
    pod_amount: 100,
    pod_date_time: new Date('2026-11-01T06:00:00.000Z'),
    is_active: true,
    ...fields,
  });
  return String(_id);
}

/** Save pods for a user with explicit save times so RECENT order is deterministic. */
async function saveAt(userId: string, podId: string, at: string) {
  await UserSavedPodModel.collection.insertOne({
    user_id: new Types.ObjectId(userId),
    pod_id: new Types.ObjectId(podId),
    created_at: new Date(at),
    updated_at: new Date(at),
  });
}

const counterOf = async (userId: string) =>
  (await UserModel.findById(userId).lean<any>())?.counters?.saved_pods_count ?? 0;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('toggleSavedPod', () => {
  it('refuses a malformed pod id', async () => {
    const userId = await makeUser();
    await expect(userService.toggleSavedPod(userId, 'not-an-id')).rejects.toMatchObject({
      message: 'Invalid pod',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('refuses a pod that does not exist (or is soft-deleted)', async () => {
    const userId = await makeUser();
    const deleted = await insertPod({ deleted_at: new Date('2026-09-01T00:00:00.000Z') });
    await expect(userService.toggleSavedPod(userId, new Types.ObjectId().toString())).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(userService.toggleSavedPod(userId, deleted)).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('saves, then unsaves, keeping the counter and the id list in step', async () => {
    const userId = await makeUser();
    const a = await insertPod();
    const b = await insertPod();

    expect(await userService.toggleSavedPod(userId, a)).toEqual({ pod_id: a, saved: true, saved_pod_ids: [a] });
    const second = await userService.toggleSavedPod(userId, b);
    expect(second.saved).toBe(true);
    expect(second.saved_pod_ids.sort()).toEqual([a, b].sort());
    expect(await counterOf(userId)).toBe(2);

    expect(await userService.toggleSavedPod(userId, a)).toEqual({ pod_id: a, saved: false, saved_pod_ids: [b] });
    expect(await counterOf(userId)).toBe(1);
    expect(await UserSavedPodModel.countDocuments({ user_id: userId, pod_id: a })).toBe(0);
  });

  it('treats a duplicate-key race as already saved without double-counting', async () => {
    const userId = await makeUser();
    const pod = await insertPod();
    jest
      .spyOn(UserSavedPodModel, 'create')
      .mockRejectedValueOnce(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));

    const res = await userService.toggleSavedPod(userId, pod);

    expect(res.saved).toBe(true);
    expect(await counterOf(userId)).toBe(0);
  });

  it('rethrows any other insert failure', async () => {
    const userId = await makeUser();
    const pod = await insertPod();
    const boom = new Error('write concern failed');
    jest.spyOn(UserSavedPodModel, 'create').mockRejectedValueOnce(boom);
    await expect(userService.toggleSavedPod(userId, pod)).rejects.toBe(boom);
    expect(await counterOf(userId)).toBe(0);
  });
});

describe('listSavedPods', () => {
  it('returns an empty list when nothing is saved', async () => {
    const userId = await makeUser();
    expect(await userService.listSavedPods(userId)).toEqual([]);
  });

  it('hides inactive and soft-deleted pods and orders by most recently saved by default', async () => {
    const userId = await makeUser();
    const older = await insertPod({ pod_title: 'Older save' });
    const newer = await insertPod({ pod_title: 'Newer save' });
    const inactive = await insertPod({ is_active: false });
    const deleted = await insertPod({ deleted_at: new Date('2026-09-01T00:00:00.000Z') });
    await saveAt(userId, older, '2026-10-01T00:00:00.000Z');
    await saveAt(userId, newer, '2026-10-02T00:00:00.000Z');
    await saveAt(userId, inactive, '2026-10-03T00:00:00.000Z');
    await saveAt(userId, deleted, '2026-10-03T01:00:00.000Z');

    const list = await userService.listSavedPods(userId);
    expect(list.map((p) => p.pod_title)).toEqual(['Newer save', 'Older save']);

    // An unknown sort key falls back to the same saved order.
    const fallback = await userService.listSavedPods(userId, { sort: 'BOGUS' });
    expect(fallback.map((p) => p.id)).toEqual([newer, older]);
  });

  it('maps a pod onto the public shape, with the club slug and seat counts', async () => {
    const userId = await makeUser();
    const clubId = new Types.ObjectId();
    await ClubModel.collection.insertOne({ _id: clubId, club_id: 'runners-club' });
    const host = new Types.ObjectId();
    const attendee = new Types.ObjectId();
    const productId = new Types.ObjectId();
    const pod = await insertPod({
      club_id: clubId,
      pod_hosts_id: [host],
      pod_attendees: [attendee],
      extra_seats: 2,
      no_of_spots: 10,
      pod_images_and_videos: [{ url: 'https://img.example.com/1.jpg' }],
      place_charges: [{ label: 'Court', amount: 50 }],
      product_requests: [{ product_id: productId, product_name: 'Water', unit_cost: 20, quantity: 3, total_cost: 60 }],
      ticket_discount_enabled: true,
      ticket_discount_tiers: [{ min_tickets: 3, discount_pct: 10 }],
      liked_user_ids: [attendee],
      comments: [{ text: 'hi' }, { text: 'yo' }],
    });
    await saveAt(userId, pod, '2026-10-01T00:00:00.000Z');

    const [shaped] = await userService.listSavedPods(userId);

    expect(shaped).toMatchObject({
      id: pod,
      club_id: String(clubId),
      club_slug: 'runners-club',
      pod_hosts_id: [String(host)],
      pod_attendees: [String(attendee)],
      seats_taken: 3,
      seats_available: 7,
      pod_date_time: '2026-11-01T06:00:00.000Z',
      pod_amount: 100,
      place_charges: [{ label: 'Court', amount: 50, note: null }],
      product_requests: [
        { product_id: String(productId), product_name: 'Water', unit_cost: 20, quantity: 3, total_cost: 60 },
      ],
      ticket_discount_enabled: true,
      ticket_discount_tiers: [{ min_tickets: 3, discount_pct: 10 }],
      like_count: 1,
      comment_count: 2,
      liked_user_ids: [String(attendee)],
      is_active: true,
    });
    expect(shaped.pod_images_and_videos).toEqual([{ url: 'https://img.example.com/1.jpg', type: 'IMAGE' }]);
  });

  it('gives a pod without a club an empty slug and null ids', async () => {
    const userId = await makeUser();
    const pod = await insertPod();
    await saveAt(userId, pod, '2026-10-01T00:00:00.000Z');
    const [shaped] = await userService.listSavedPods(userId);
    expect(shaped.club_slug).toBe('');
    expect(shaped.club_id).toBeNull();
    expect(shaped.venue_id).toBeNull();
    expect(shaped.location_id).toBeNull();
  });

  it('filters by category including every descendant, and drops club-less pods', async () => {
    const userId = await makeUser();
    const root = new Types.ObjectId();
    const child = new Types.ObjectId();
    const grandchild = new Types.ObjectId();
    const unrelated = new Types.ObjectId();
    await CategoryModel.collection.insertMany([
      { _id: root, parent_id: null, slug: 'sports' },
      { _id: child, parent_id: root, slug: 'running' },
      { _id: grandchild, parent_id: child, slug: 'trail' },
      { _id: unrelated, parent_id: null, slug: 'music' },
    ]);
    const leafClub = new Types.ObjectId();
    const superClub = new Types.ObjectId();
    const otherClub = new Types.ObjectId();
    await ClubModel.collection.insertMany([
      { _id: leafClub, club_id: 'trail-club', category_id: grandchild, super_category_id: null },
      { _id: superClub, club_id: 'sports-club', category_id: null, super_category_id: root },
      { _id: otherClub, club_id: 'music-club', category_id: unrelated, super_category_id: unrelated },
    ]);
    const leafPod = await insertPod({ club_id: leafClub, pod_title: 'Trail' });
    const superPod = await insertPod({ club_id: superClub, pod_title: 'Sports' });
    const otherPod = await insertPod({ club_id: otherClub, pod_title: 'Music' });
    const noClubPod = await insertPod({ pod_title: 'Loose' });
    for (const [i, p] of [leafPod, superPod, otherPod, noClubPod].entries()) {
      await saveAt(userId, p, `2026-10-0${i + 1}T00:00:00.000Z`);
    }

    const byRoot = await userService.listSavedPods(userId, { categoryId: String(root), sort: 'NAME_ASC' });
    expect(byRoot.map((p) => p.pod_title)).toEqual(['Sports', 'Trail']);

    const byChild = await userService.listSavedPods(userId, { categoryId: String(child) });
    expect(byChild.map((p) => p.pod_title)).toEqual(['Trail']);

    // A malformed category id is ignored rather than emptying the list.
    const ignored = await userService.listSavedPods(userId, { categoryId: 'garbage' });
    expect(ignored).toHaveLength(4);
  });

  it('searches title and description case-insensitively and treats regex characters literally', async () => {
    const userId = await makeUser();
    const cpp = await insertPod({ pod_title: 'C++ Study Group', pod_description: 'pointers' });
    const desc = await insertPod({ pod_title: 'Board games', pod_description: 'Bring your CATAN set' });
    const neither = await insertPod({ pod_title: 'Cpp', pod_description: 'no plus signs' });
    await saveAt(userId, cpp, '2026-10-01T00:00:00.000Z');
    await saveAt(userId, desc, '2026-10-02T00:00:00.000Z');
    await saveAt(userId, neither, '2026-10-03T00:00:00.000Z');

    expect((await userService.listSavedPods(userId, { search: '  c++ ' })).map((p) => p.id)).toEqual([cpp]);
    expect((await userService.listSavedPods(userId, { search: 'catan' })).map((p) => p.id)).toEqual([desc]);
    // A blank search is no filter at all.
    expect(await userService.listSavedPods(userId, { search: '   ' })).toHaveLength(3);
  });

  it.each([
    ['DATE_ASC', ['B', 'A', 'C']],
    ['DATE_DESC', ['C', 'A', 'B']],
    ['PRICE_LOW', ['C', 'B', 'A']],
    ['PRICE_HIGH', ['A', 'B', 'C']],
    ['NAME_ASC', ['A', 'B', 'C']],
    ['NAME_DESC', ['C', 'B', 'A']],
  ])('sorts by %s', async (sort, expected) => {
    const userId = await makeUser();
    const a = await insertPod({ pod_title: 'A', pod_amount: 300, pod_date_time: new Date('2026-11-02T00:00:00.000Z') });
    const b = await insertPod({ pod_title: 'B', pod_amount: 200, pod_date_time: new Date('2026-11-01T00:00:00.000Z') });
    const c = await insertPod({ pod_title: 'C', pod_amount: 0, pod_date_time: new Date('2026-11-03T00:00:00.000Z') });
    await saveAt(userId, a, '2026-10-01T00:00:00.000Z');
    await saveAt(userId, b, '2026-10-02T00:00:00.000Z');
    await saveAt(userId, c, '2026-10-03T00:00:00.000Z');

    const list = await userService.listSavedPods(userId, { sort });
    expect(list.map((p) => p.pod_title)).toEqual(expected);
  });
});
