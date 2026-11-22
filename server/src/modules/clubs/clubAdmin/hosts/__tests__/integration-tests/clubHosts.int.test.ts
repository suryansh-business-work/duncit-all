/**
 * Club Admin host management against a real database: who counts as a host,
 * the month's numbers, the inactivity flag, the engagement status rules and
 * the club-membership guard on every read and write.
 */
import { Types } from 'mongoose';
import { clubHostsService } from '../../clubHosts.service';
import { ClubHostEngagementModel, HostPerformanceSnapshotModel } from '../../clubHosts.models';
import { clubAdminService } from '../../../clubAdmin.service';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { settingsService } from '@modules/platform/settings/settings.service';

const DAY = 24 * 60 * 60 * 1000;
const uid = () => new Types.ObjectId().toString();

const seedClub = (over: Record<string, unknown> = {}) =>
  ClubModel.create({ club_id: `c-${Math.random().toString(36).slice(2)}`, club_name: 'Club', ...over });

const seedPod = (clubId: unknown, hostId: unknown, over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `p-${Math.random().toString(36).slice(2)}`,
    pod_title: 'Pod',
    club_id: clubId,
    pod_description: 'desc',
    pod_type: 'FREE',
    pod_hosts_id: [hostId],
    pod_date_time: new Date(Date.now() + DAY),
    is_active: true,
    ...over,
  });

// Login phones are unique, so each seeded user gets the next one; the first
// user of every test (Busy) keeps 9876500000.
let phoneSeq = 0;
beforeEach(() => {
  phoneSeq = 0;
});

const seedUser = (first: string, over: Record<string, unknown> = {}) =>
  UserModel.create({
    auth: {
      email: `${first.toLowerCase()}@example.com`,
      phone: { extension: '91', number: String(9876500000 + phoneSeq++) },
    },
    profile: { first_name: first, last_name: 'Host' },
    ...over,
  });

async function setup() {
  const admin = uid();
  const busy = await seedUser('Busy');
  const idle = await seedUser('Idle');
  const linked = await seedUser('Linked');
  const club = await seedClub({ admin_user_ids: [admin], host_ids: [linked._id] });
  // Busy completed a pod two days ago (settled) and has one coming up.
  await seedPod(club._id, busy._id, { pod_date_time: new Date(Date.now() - 2 * DAY), completed_at: new Date() });
  await seedPod(club._id, busy._id);
  // Idle's only completed pod was 40 days ago.
  await seedPod(club._id, idle._id, { pod_date_time: new Date(Date.now() - 40 * DAY), completed_at: new Date() });
  return { admin, club, busy, idle, linked };
}

const actor = (id: string) => ({ id });

describe('clubAdminClubHostsTable', () => {
  it('lists the union of linked hosts and pod hosts with contacts and the month so far', async () => {
    const { admin, club, busy, idle, linked } = await setup();
    const page = await clubHostsService.hostsTable(actor(admin), String(club._id), { page_size: 50 });
    const byId = new Map(page.rows.map((r) => [r.user_id, r]));
    expect(page.total).toBe(3);
    expect(byId.get(String(linked._id))).toMatchObject({ is_inactive: true, last_pod_at: null, completed_this_month: 0 });
    expect(byId.get(String(idle._id))).toMatchObject({ is_inactive: true, upcoming_count: 0 });
    const busyRow = byId.get(String(busy._id));
    expect(busyRow).toMatchObject({
      is_inactive: false,
      upcoming_count: 1,
      monthly_target: 8,
      phone: '+91 9876500000',
      email: 'busy@example.com',
      engagement_status_key: 'NOT_CONTACTED',
    });
    expect(busyRow?.days_since_last_pod).toBe(2);
  });

  it('ignores cancelled pods and pods of other clubs', async () => {
    const { admin, club } = await setup();
    const ghost = await seedUser('Ghost');
    await seedPod(club._id, ghost._id, { deleted_at: new Date() });
    const other = await seedClub();
    await seedPod(other._id, ghost._id, { completed_at: new Date(), pod_date_time: new Date(Date.now() - DAY) });
    const page = await clubHostsService.hostsTable(actor(admin), String(club._id), { page_size: 50 });
    expect(page.rows.map((r) => r.user_id)).not.toContain(String(ghost._id));
  });

  it('follows the inactivity days set in Pod Settings', async () => {
    const { admin, club, idle } = await setup();
    await settingsService.updateAppSettings({ host_inactivity_days: 60 });
    const page = await clubHostsService.hostsTable(actor(admin), String(club._id), { page_size: 50 });
    expect(page.rows.find((r) => r.user_id === String(idle._id))?.is_inactive).toBe(false);
  });

  it('refuses a caller who does not administer the club', async () => {
    const { club } = await setup();
    await expect(clubHostsService.hostsTable(actor(uid()), String(club._id))).rejects.toThrow(/do not administer/i);
    await expect(clubHostsService.hostsSummary(actor(uid()), String(club._id))).rejects.toThrow(/do not administer/i);
  });

  it('summarises every host for the warning, not one page', async () => {
    const { admin, club } = await setup();
    await expect(clubHostsService.hostsSummary(actor(admin), String(club._id))).resolves.toMatchObject({
      host_count: 3,
      inactive_count: 2,
      inactivity_days: 14,
      monthly_pod_target: 8,
    });
  });
});

describe('clubAdminHostDetail', () => {
  it('returns the host with statuses and only snapshotted months of history', async () => {
    const { admin, club, busy } = await setup();
    await HostPerformanceSnapshotModel.create({
      club_id: club._id,
      host_user_id: busy._id,
      period: '2000-01',
      completed: 1,
      target: 8,
      score: 13,
      computed_at: new Date(),
    });
    const detail = await clubHostsService.hostDetail(actor(admin), String(club._id), String(busy._id));
    expect(detail?.statuses.length).toBeGreaterThanOrEqual(6);
    expect(detail?.score_history).toEqual([]); // 2000-01 is outside the last six months
  });

  it('is null for a user who does not host the club', async () => {
    const { admin, club } = await setup();
    const stranger = await seedUser('Stranger');
    await expect(clubHostsService.hostDetail(actor(admin), String(club._id), String(stranger._id))).resolves.toBeNull();
  });
});

describe('setClubHostEngagement', () => {
  it('saves an active status with a note and appends history', async () => {
    const { admin, club, idle } = await setup();
    await clubHostsService.setEngagement(actor(admin), String(club._id), String(idle._id), 'CONTACTED', ' Called, busy at work ');
    const saved = await clubHostsService.setEngagement(actor(admin), String(club._id), String(idle._id), 'ENGAGING', null);
    expect(saved).toMatchObject({ status_key: 'ENGAGING', status_label: 'Engaging', note: null });
    const doc = await ClubHostEngagementModel.findOne({ club_id: club._id, host_user_id: idle._id }).lean();
    expect(doc?.history.map((h) => h.status_key)).toEqual(['CONTACTED', 'ENGAGING']);
    expect(doc?.history[0].note).toBe('Called, busy at work');
  });

  it('refuses an unknown or switched-off status', async () => {
    const { admin, club, idle } = await setup();
    await expect(
      clubHostsService.setEngagement(actor(admin), String(club._id), String(idle._id), 'MADE_UP')
    ).rejects.toThrow(/active engagement statuses/);
    await settingsService.updateAppSettings({
      host_engagement_statuses: [{ key: 'ACTIVE', label: 'Active', is_active: true }],
    });
    await expect(
      clubHostsService.setEngagement(actor(admin), String(club._id), String(idle._id), 'CONTACTED')
    ).rejects.toThrow(/active engagement statuses/);
  });

  it('refuses a host of another club and a non-admin caller', async () => {
    const { admin, club } = await setup();
    const other = await seedClub();
    const outsider = await seedUser('Outsider');
    await seedPod(other._id, outsider._id);
    await expect(
      clubHostsService.setEngagement(actor(admin), String(club._id), String(outsider._id), 'CONTACTED')
    ).rejects.toThrow(/not a host of this club/);
    await expect(
      clubHostsService.setEngagement(actor(uid()), String(club._id), String(outsider._id), 'CONTACTED')
    ).rejects.toThrow(/do not administer/i);
  });
});

describe('clubAdminPodsTable lifecycle', () => {
  it('narrows a host’s pods to Upcoming or Past', async () => {
    const { admin, club, busy } = await setup();
    const filters = [{ field: 'host_user_id', op: 'eq', value: String(busy._id) }];
    const upcoming = await clubAdminService.podsTable(actor(admin), String(club._id), { filters }, null, 'UPCOMING');
    const past = await clubAdminService.podsTable(actor(admin), String(club._id), { filters }, null, 'COMPLETED');
    expect(upcoming.total).toBe(1);
    expect(past.total).toBe(1);
  });
});
