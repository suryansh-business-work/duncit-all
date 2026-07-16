import { Types } from 'mongoose';
import { clubAdminService } from '../../clubAdmin.service';
import { podService } from '@modules/pods/pod/pod.service';
import { ClubModel } from '@modules/pods/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { ClubRatingModel } from '@modules/pods/club/clubRating.model';
import { ClubFollowerModel } from '@modules/access/user/relations';
import { UserModel } from '@modules/access/user/user.model';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';

const uid = () => new Types.ObjectId().toString();

const seedClub = (over: Record<string, unknown> = {}) =>
  ClubModel.create({
    club_id: `c-${Math.random().toString(36).slice(2)}`,
    club_name: 'Club',
    ...over,
  });

const seedPod = (clubId: unknown, over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `p-${Math.random().toString(36).slice(2)}`,
    pod_title: 'Pod',
    club_id: clubId,
    pod_description: 'desc',
    pod_type: 'NATIVE_FREE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    is_active: true,
    ...over,
  });

const seedPayment = (podId: unknown, over: Record<string, unknown> = {}) =>
  PaymentModel.create({
    payment_id: `pay-${Math.random().toString(36).slice(2)}`,
    user_id: new Types.ObjectId(),
    user_name: 'Buyer',
    user_email: 'b@duncit.com',
    pod_id: podId,
    subtotal: 100,
    total: 120,
    status: 'SUCCESS',
    ...over,
  });

describe('clubAdminService assignment + guards', () => {
  it('lists only the clubs a user administers', async () => {
    const admin = uid();
    const mine = await seedClub({ admin_user_ids: [admin] });
    await seedClub({ admin_user_ids: [uid()] });
    const clubs = await clubAdminService.listAdminClubs(admin);
    expect(clubs.map((c: any) => c.id)).toEqual([String(mine._id)]);
    expect(await clubAdminService.adminClubIds(admin)).toEqual([String(mine._id)]);
    expect(await clubAdminService.listAdminClubs('not-an-id')).toEqual([]);
  });

  it('guards club access by membership, with a SUPER_ADMIN bypass', async () => {
    const admin = uid();
    const club = await seedClub({ admin_user_ids: [admin] });
    await expect(
      clubAdminService.assertClubAdmin({ id: admin }, String(club._id))
    ).resolves.toBeUndefined();
    await expect(
      clubAdminService.assertClubAdmin({ id: uid() }, String(club._id))
    ).rejects.toThrow(/do not administer/i);
    await expect(
      clubAdminService.assertClubAdmin({ id: uid(), roles: ['SUPER_ADMIN'] }, String(club._id))
    ).resolves.toBeUndefined();
    await expect(
      clubAdminService.assertClubAdmin({ id: uid() }, 'not-an-id')
    ).rejects.toThrow(/do not administer/i);
  });

  it('scopes pod delete to the admin’s own clubs', async () => {
    const admin = uid();
    const club = await seedClub({ admin_user_ids: [admin] });
    const other = await seedClub({ admin_user_ids: [uid()] });
    const myPod = await seedPod(club._id);
    const otherPod = await seedPod(other._id);

    await expect(
      clubAdminService.deletePod({ id: admin }, String(otherPod._id))
    ).rejects.toThrow(/do not administer/i);
    await expect(clubAdminService.deletePod({ id: admin }, String(myPod._id))).resolves.toBe(true);
    // Soft-deleted pods are auto-excluded from normal reads; check the raw doc.
    const raw: any = await PodModel.collection.findOne({ _id: myPod._id });
    expect(raw?.deleted_at).toBeTruthy();
    expect(raw?.is_active).toBe(false);
  });

  it('rejects create/update on clubs/pods the user does not administer', async () => {
    const admin = uid();
    const other = await seedClub({ admin_user_ids: [uid()] });
    const otherPod = await seedPod(other._id);
    await expect(
      clubAdminService.createPod({ id: admin }, { club_id: String(other._id) })
    ).rejects.toThrow(/do not administer/i);
    await expect(
      clubAdminService.updatePod({ id: admin }, String(otherPod._id), { pod_title: 'X' })
    ).rejects.toThrow(/do not administer/i);
    await expect(
      clubAdminService.updatePod({ id: admin }, 'bad-id', {})
    ).rejects.toThrow(/pod not found/i);
  });

  it('records the club admin as host on create when the form supplies none', async () => {
    const admin = uid();
    const club = await seedClub({ admin_user_ids: [admin] });
    const spy = jest.spyOn(podService, 'create').mockResolvedValue({ id: 'p' } as any);
    try {
      await clubAdminService.createPod({ id: admin }, { club_id: String(club._id), pod_hosts_id: [] });
      expect(spy.mock.calls[0][0].pod_hosts_id).toEqual([admin]);
    } finally {
      spy.mockRestore();
    }
  });

  it('keeps explicitly supplied hosts on create', async () => {
    const admin = uid();
    const host = uid();
    const club = await seedClub({ admin_user_ids: [admin] });
    const spy = jest.spyOn(podService, 'create').mockResolvedValue({ id: 'p' } as any);
    try {
      await clubAdminService.createPod({ id: admin }, { club_id: String(club._id), pod_hosts_id: [host] });
      expect(spy.mock.calls[0][0].pod_hosts_id).toEqual([host]);
    } finally {
      spy.mockRestore();
    }
  });

  it('lets a club admin edit their club but strips governance fields', async () => {
    const admin = uid();
    const other = uid();
    const club = await seedClub({
      admin_user_ids: [admin],
      club_name: 'Old Name',
      is_verified: false,
      is_active: true,
    });

    await expect(
      clubAdminService.updateClub({ id: uid() }, String(club._id), { club_name: 'Hacked' })
    ).rejects.toThrow(/do not administer/i);

    const updated: any = await clubAdminService.updateClub({ id: admin }, String(club._id), {
      club_name: 'New Name',
      club_description: 'Fresh copy',
      admin_user_ids: [admin, other], // governance — must be ignored
      is_verified: true, // governance — must be ignored
      is_active: false, // governance — must be ignored
    });

    expect(updated.club_name).toBe('New Name');
    expect(updated.club_description).toBe('Fresh copy');
    expect(updated.admin_user_ids).toEqual([admin]); // unchanged
    expect(updated.is_verified).toBe(false); // unchanged
    expect(updated.is_active).toBe(true); // unchanged
  });

  it('never wipes hosts on update with an empty hosts array', async () => {
    const admin = uid();
    const club = await seedClub({ admin_user_ids: [admin] });
    const pod = await seedPod(club._id);
    const spy = jest.spyOn(podService, 'update').mockResolvedValue({ id: 'p' } as any);
    try {
      await clubAdminService.updatePod({ id: admin }, String(pod._id), {
        pod_title: 'X',
        pod_hosts_id: [],
      });
      expect(spy.mock.calls[0][1]).not.toHaveProperty('pod_hosts_id');
      expect(spy.mock.calls[0][1].pod_title).toBe('X');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('clubAdminService listAdminClubsPage (Your Clubs)', () => {
  it('returns an empty page for a non-admin / invalid user', async () => {
    expect(await clubAdminService.listAdminClubsPage('not-an-id')).toEqual({ items: [], total: 0 });
    expect(await clubAdminService.listAdminClubsPage(uid())).toEqual({ items: [], total: 0 });
  });

  it('paginates and searches the admin’s clubs', async () => {
    const admin = uid();
    await seedClub({ admin_user_ids: [admin], club_name: 'Alpha', club_id: 'alpha' });
    await seedClub({ admin_user_ids: [admin], club_name: 'Bravo', club_id: 'bravo' });
    await seedClub({ admin_user_ids: [admin], club_name: 'Charlie', club_id: 'charlie' });
    await seedClub({ admin_user_ids: [uid()], club_name: 'Other' });

    const page1 = await clubAdminService.listAdminClubsPage(admin, { limit: 2, offset: 0 });
    expect(page1.total).toBe(3);
    expect(page1.items.map((c: any) => c.club_name)).toEqual(['Alpha', 'Bravo']);

    const page2 = await clubAdminService.listAdminClubsPage(admin, { limit: 2, offset: 2 });
    expect(page2.items.map((c: any) => c.club_name)).toEqual(['Charlie']);

    const searched = await clubAdminService.listAdminClubsPage(admin, { search: 'brav' });
    expect(searched.total).toBe(1);
    expect(searched.items[0].club_name).toBe('Bravo');
  });

  it('filters by the Super → Category → Sub cascade', async () => {
    const admin = uid();
    const superCat = await CategoryModel.create({ name: 'Sports', slug: 'sports', level: 'SUPER' });
    const midCat = await CategoryModel.create({ name: 'Racquet', slug: 'racquet', level: 'CATEGORY', parent_id: superCat._id });
    const sub = await CategoryModel.create({ name: 'Tennis', slug: 'tennis', level: 'SUB', parent_id: midCat._id });
    const otherSuper = await CategoryModel.create({ name: 'Arts', slug: 'arts', level: 'SUPER' });

    await seedClub({
      admin_user_ids: [admin],
      club_name: 'Tennis Club',
      super_category_id: superCat._id,
      category_id: sub._id,
    });
    await seedClub({
      admin_user_ids: [admin],
      club_name: 'Art Club',
      super_category_id: otherSuper._id,
      category_id: null,
    });

    const bySuper = await clubAdminService.listAdminClubsPage(admin, {
      super_category_id: String(superCat._id),
    });
    expect(bySuper.items.map((c: any) => c.club_name)).toEqual(['Tennis Club']);

    const byMiddle = await clubAdminService.listAdminClubsPage(admin, {
      category_id: String(midCat._id),
    });
    expect(byMiddle.items.map((c: any) => c.club_name)).toEqual(['Tennis Club']);

    const bySub = await clubAdminService.listAdminClubsPage(admin, {
      sub_category_id: String(sub._id),
    });
    expect(bySub.items.map((c: any) => c.club_name)).toEqual(['Tennis Club']);
  });
});

describe('clubAdminService myAdminClubsTable (Your Clubs table)', () => {
  it('returns an empty page for a non-admin / invalid user', async () => {
    const invalid = await clubAdminService.clubsInfoTable('not-an-id');
    expect(invalid).toMatchObject({ rows: [], total: 0, page: 1, page_size: 25 });
    const none = await clubAdminService.clubsInfoTable(uid());
    expect(none.rows).toEqual([]);
    expect(none.total).toBe(0);
  });

  it('builds max-info rows scoped to the caller', async () => {
    const admin = uid();
    const location = await LocationModel.create({
      location_id: 'blr-info',
      location_name: 'Bengaluru Metro',
      city: 'Bengaluru',
      location_image: 'https://img/loc.jpg',
      location_pincode: '560001',
    });
    const superCat = await CategoryModel.create({ name: 'Sports', slug: 'sports-info', level: 'SUPER' });
    const sub = await CategoryModel.create({ name: 'Tennis', slug: 'tennis-info', level: 'SUB', parent_id: superCat._id });
    // One venue auto-matches (APPROVED + active, same location/locality + categories); one is in another city.
    await VenueModel.collection.insertMany([
      { venue_name: 'Match Hall', location_id: location._id, locality: 'Indiranagar', status: 'APPROVED', is_active: true,
        venue_category: { super_category_id: superCat._id, sub_category_id: sub._id } },
      { venue_name: 'Wrong City', location_id: new Types.ObjectId(), locality: 'Indiranagar', status: 'APPROVED', is_active: true,
        venue_category: { super_category_id: superCat._id, sub_category_id: sub._id } },
    ] as never);
    const club = await seedClub({
      admin_user_ids: [admin],
      club_name: 'Alpha',
      club_id: 'alpha-info',
      locality: 'Indiranagar',
      location_id: location._id,
      super_category_id: superCat._id,
      category_id: sub._id,
      is_verified: true,
      club_feature_images_and_videos: [
        { url: 'https://img/reel.mp4', type: 'VIDEO' },
        { url: 'https://img/cover.jpg', type: 'IMAGE' },
      ],
    });
    await seedPod(club._id); // upcoming
    await seedPod(club._id, { pod_date_time: new Date(Date.now() - 86_400_000) }); // completed
    await ClubFollowerModel.create({ club_id: club._id, user_id: uid() });
    await seedClub({ admin_user_ids: [uid()], club_name: 'Other Admins Club' });

    const page = await clubAdminService.clubsInfoTable(admin);
    expect(page.total).toBe(1); // the other admin's club never appears
    expect(page.rows[0]).toMatchObject({
      id: String(club._id),
      club_name: 'Alpha',
      slug: 'alpha-info',
      cover_image_url: 'https://img/cover.jpg', // first IMAGE wins over a leading VIDEO
      super_category: 'Sports',
      category: 'Tennis',
      locality: 'Indiranagar',
      location_label: 'Bengaluru',
      followers_count: 1,
      total_pods: 2,
      upcoming_pods: 1,
      matched_venues_count: 1,
      is_verified: true,
      is_active: true,
    });
    expect(page.rows[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('defaults unresolvable references to empty row fields', async () => {
    const admin = uid();
    const club = await seedClub({ admin_user_ids: [admin], club_name: 'Bare', club_id: 'bare-info' });
    const page = await clubAdminService.clubsInfoTable(admin);
    expect(page.rows[0]).toMatchObject({
      id: String(club._id),
      cover_image_url: null,
      super_category: null,
      category: null,
      locality: '',
      location_label: null,
      followers_count: 0,
      total_pods: 0,
      upcoming_pods: 0,
      matched_venues_count: 0,
      is_verified: false,
    });
  });

  it('searches (name/slug), sorts and pages the computed rows', async () => {
    const admin = uid();
    const alpha = await seedClub({ admin_user_ids: [admin], club_name: 'Alpha Club', club_id: 'alpha-slug' });
    await seedClub({ admin_user_ids: [admin], club_name: 'Beta Club', club_id: 'beta-slug' });
    await seedClub({ admin_user_ids: [admin], club_name: 'Charlie Club', club_id: 'charlie-slug' });
    await seedPod(alpha._id);

    // Default sort: club_name asc.
    const all = await clubAdminService.clubsInfoTable(admin);
    expect(all.rows.map((r) => r.club_name)).toEqual(['Alpha Club', 'Beta Club', 'Charlie Club']);

    // Search spans club name AND slug.
    const byName = await clubAdminService.clubsInfoTable(admin, { search: 'beta' });
    expect(byName.rows.map((r) => r.club_name)).toEqual(['Beta Club']);
    const bySlug = await clubAdminService.clubsInfoTable(admin, { search: 'charlie-slug' });
    expect(bySlug.rows.map((r) => r.club_name)).toEqual(['Charlie Club']);

    // Allowlisted sort over a computed column.
    const sorted = await clubAdminService.clubsInfoTable(admin, {
      sort_by: 'total_pods',
      sort_dir: 'desc',
    });
    expect(sorted.rows[0].club_name).toBe('Alpha Club');

    // Number filter narrows; paging clamps.
    const withPods = await clubAdminService.clubsInfoTable(admin, {
      filters: [{ field: 'total_pods', op: 'gte', value: '1' }],
    });
    expect(withPods.rows.map((r) => r.club_name)).toEqual(['Alpha Club']);
    const page2 = await clubAdminService.clubsInfoTable(admin, { page: 2, page_size: 2 });
    expect(page2.rows).toHaveLength(1);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(2);
  });
});

describe('clubAdminService dashboard', () => {
  it('returns a zeroed dashboard when the user administers no clubs', async () => {
    const d = await clubAdminService.dashboard(uid());
    expect(d.kpis.assigned_clubs).toBe(0);
    expect(d.kpis.total_revenue).toBe(0);
    expect(d.clubs).toEqual([]);
    expect(d.trend).toEqual([]);
  });

  it('aggregates KPIs, per-club rows and revenue across assigned clubs', async () => {
    const admin = uid();
    const club = await seedClub({ admin_user_ids: [admin], club_name: 'Alpha' });
    const upcoming = await seedPod(club._id, {
      no_of_spots: 5,
      pod_attendees: [uid(), uid()],
      pod_hosts_id: [uid()],
    });
    await seedPod(club._id, {
      pod_date_time: new Date(Date.now() - 86_400_000),
      no_of_spots: 3,
      pod_hosts_id: [uid()],
    });
    await PodMemberModel.create({
      pod_id: upcoming._id,
      user_id: uid(),
      status: 'JOINED',
      source: 'FREE',
      refund_status: 'NONE',
    });
    await PodMemberModel.create({
      pod_id: upcoming._id,
      user_id: uid(),
      status: 'BACKED_OUT',
      source: 'FREE',
      refund_status: 'NONE',
    });
    await ClubFollowerModel.create({ club_id: club._id, user_id: uid() });
    await ClubRatingModel.create({ club_id: club._id, user_id: uid(), stars: 4 });
    await seedPayment(upcoming._id);

    const d = await clubAdminService.dashboard(admin);
    expect(d.kpis).toMatchObject({
      assigned_clubs: 1,
      total_pods: 2,
      upcoming_pods: 1,
      completed_pods: 1,
      total_bookings: 1,
      backed_out: 1,
      total_attendees: 2,
      total_spots: 8,
      total_followers: 1,
      avg_rating: 4,
      ratings_count: 1,
      active_hosts: 2,
      total_revenue: 120,
    });
    expect(d.clubs).toHaveLength(1);
    expect(d.clubs[0]).toMatchObject({
      club_name: 'Alpha',
      total_pods: 2,
      upcoming_pods: 1,
      completed_pods: 1,
      followers: 1,
      rating: 4,
      revenue: 120,
    });
    expect(d.trend.length).toBeGreaterThan(0);
  });

  it('serves the clubAdminDashboardTable page over the computed per-club rows, scoped to the caller', async () => {
    const adminA = uid();
    const adminB = uid();
    const alpha = await seedClub({ club_name: 'Alpha Club', admin_user_ids: [adminA] });
    await seedClub({ club_name: 'Beta Club', admin_user_ids: [adminA] });
    await seedClub({ club_name: 'Other Club', admin_user_ids: [adminB] });
    await seedPod(alpha._id); // one upcoming pod on Alpha

    // Default page: club_name asc; admin B's club never appears for admin A.
    const all = await clubAdminService.dashboardClubsTable(adminA);
    expect(all.total).toBe(2);
    expect(all.rows.map((r) => r.club_name)).toEqual(['Alpha Club', 'Beta Club']);
    expect(all.rows[0].total_pods).toBe(1);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans club name and slug.
    const searched = await clubAdminService.dashboardClubsTable(adminA, { search: 'beta' });
    expect(searched.rows.map((r) => r.club_name)).toEqual(['Beta Club']);
    expect(searched.total).toBe(1);

    // Number filter over a computed column narrows.
    const withPods = await clubAdminService.dashboardClubsTable(adminA, {
      filters: [{ field: 'total_pods', op: 'gte', value: '1' }],
    });
    expect(withPods.rows.map((r) => r.club_name)).toEqual(['Alpha Club']);

    // Allowlisted sort over a computed column + paging.
    const sorted = await clubAdminService.dashboardClubsTable(adminA, {
      sort_by: 'total_pods',
      sort_dir: 'desc',
    });
    expect(sorted.rows[0].club_name).toBe('Alpha Club');
    const page2 = await clubAdminService.dashboardClubsTable(adminA, { page: 2, page_size: 1 });
    expect(page2.rows).toHaveLength(1);
    expect(page2.total).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);

    // A user with no assigned clubs gets an empty page, never someone else's rows.
    const none = await clubAdminService.dashboardClubsTable(uid());
    expect(none.total).toBe(0);
    expect(none.rows).toEqual([]);
  });
});

describe('clubAdminService searchHosts (assign-host picker)', () => {
  /** An onboarded host user in the given review status. */
  const seedHostUser = async (first: string, status = 'APPROVED') => {
    const user = await UserModel.create({
      auth: { email: `${first.toLowerCase()}@example.com` },
      profile: { first_name: first, last_name: 'Host' },
    });
    await HostModel.create({ user_id: user._id, status });
    return String(user._id);
  };

  it('is forbidden for a user who administers no clubs and lacks SUPER_ADMIN', async () => {
    await seedHostUser('Asha');
    await seedClub({ admin_user_ids: [uid()] }); // clubs exist, just not this caller's
    await expect(clubAdminService.searchHosts({ id: uid() })).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('returns only APPROVED hosts, shaped for the picker', async () => {
    const admin = uid();
    await seedClub({ admin_user_ids: [admin] });
    const approved = await seedHostUser('Asha');
    await seedHostUser('Bala', 'SUBMITTED');
    await seedHostUser('Chitra', 'REJECTED');

    const rows = await clubAdminService.searchHosts({ id: admin });
    expect(rows).toEqual([
      { user_id: approved, full_name: 'Asha Host', email: 'asha@example.com' },
    ]);
  });

  it('filters by first name, last name and email', async () => {
    const admin = uid();
    await seedClub({ admin_user_ids: [admin] });
    const asha = await seedHostUser('Asha');
    const bala = await seedHostUser('Bala');

    const byFirst = await clubAdminService.searchHosts({ id: admin }, 'ash');
    expect(byFirst.map((r) => r.user_id)).toEqual([asha]);

    const byEmail = await clubAdminService.searchHosts({ id: admin }, 'bala@example');
    expect(byEmail.map((r) => r.user_id)).toEqual([bala]);

    const byLast = await clubAdminService.searchHosts({ id: admin }, 'host');
    expect(byLast.map((r) => r.user_id).sort()).toEqual([asha, bala].sort());

    expect(await clubAdminService.searchHosts({ id: admin }, 'zzz-no-match')).toEqual([]);
  });

  it('lets SUPER_ADMIN search without administering any club; no approved hosts → empty', async () => {
    await seedHostUser('Bala', 'SUBMITTED'); // not APPROVED → not offered
    await expect(
      clubAdminService.searchHosts({ id: uid(), roles: ['SUPER_ADMIN'] })
    ).resolves.toEqual([]);
  });

  it('shapes a host missing a last name and email without blowing up', async () => {
    const admin = uid();
    await seedClub({ admin_user_ids: [admin] });
    const user = await UserModel.create({ auth: {}, profile: { first_name: 'Mono' } });
    await HostModel.create({ user_id: user._id, status: 'APPROVED' });

    const rows = await clubAdminService.searchHosts({ id: admin });
    expect(rows).toEqual([{ user_id: String(user._id), full_name: 'Mono', email: null }]);
  });
});
