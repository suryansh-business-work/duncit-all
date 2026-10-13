/**
 * The analytics service's own logic — device/user de-duplication per bucket,
 * super-category scoping of the dashboard totals, the year heat-map levels and
 * the day/year wipes — against mocked models so each query's filter and each
 * result's shape can be asserted.
 */
jest.mock('../../activeUser.model', () => ({
  ActiveUserPingModel: { updateOne: jest.fn(), find: jest.fn(), aggregate: jest.fn(), deleteMany: jest.fn() },
}));
jest.mock('../../appEvent.model', () => ({
  AppEventModel: { create: jest.fn(), find: jest.fn(), deleteMany: jest.fn() },
}));
jest.mock('@modules/pods/category/category.model', () => ({ CategoryModel: { find: jest.fn() } }));
jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: { aggregate: jest.fn(), countDocuments: jest.fn() } }));
jest.mock('@modules/clubs/club/club.model', () => ({
  ClubModel: { aggregate: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { countDocuments: jest.fn() } }));
jest.mock('@modules/venues/venue/venue.model', () => ({ VenueModel: { countDocuments: jest.fn() } }));
jest.mock('@modules/venues/host/host.model', () => ({ HostModel: { countDocuments: jest.fn() } }));
jest.mock('@modules/crm/contact/contact.model', () => ({
  ContactSubmissionModel: { countDocuments: jest.fn(), aggregate: jest.fn() },
}));

import { Types } from 'mongoose';
import { ActiveUserPingModel } from '../../activeUser.model';
import { AppEventModel } from '../../appEvent.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { HostModel } from '@modules/venues/host/host.model';
import { ContactSubmissionModel } from '@modules/crm/contact/contact.model';
import { analyticsService } from '../../analytics.service';
import type { RecordAppEventDTO } from '../../analytics.validator';

const m = (fn: unknown) => fn as jest.Mock;
const USER = new Types.ObjectId().toHexString();
const resolved = <T>(value: T) => ({ lean: () => Promise.resolve(value) });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-03-15T10:00:00Z'));
});
afterEach(() => jest.useRealTimers());

describe('recordPing', () => {
  it('ignores a ping with no device id', async () => {
    expect(await analyticsService.recordPing({ device_id: '   ' })).toBe(false);
    expect(await analyticsService.recordPing({ device_id: null })).toBe(false);
    expect(ActiveUserPingModel.updateOne).not.toHaveBeenCalled();
  });

  it('upserts one ping per device, day and category, lower-casing the slug', async () => {
    expect(await analyticsService.recordPing({ device_id: ' dev-1 ', super_category_slug: 'Dining' })).toBe(true);
    const [filter, update, options] = m(ActiveUserPingModel.updateOne).mock.calls[0];
    expect(filter).toEqual({ device_id: 'dev-1', date_ymd: '2026-03-15', super_category_slug: 'dining' });
    expect(update.$inc).toEqual({ hits: 1 });
    expect(update.$set).toEqual({});
    expect(options).toEqual({ upsert: true });
  });

  it('attaches the signed-in user when there is one', async () => {
    await analyticsService.recordPing({ device_id: 'dev-1', user_id: USER });
    const [filter, update] = m(ActiveUserPingModel.updateOne).mock.calls[0];
    expect(filter.super_category_slug).toBeNull();
    expect(String(update.$set.user_id)).toBe(USER);
  });
});

describe('recordAppEvent', () => {
  const input = (over: Partial<RecordAppEventDTO> = {}) =>
    ({ event_type: 'CLICK', path: '/pods', ...over }) as unknown as RecordAppEventDTO;

  it('stores the event with defaults, parsed metadata and a lower-cased category', async () => {
    const pod = new Types.ObjectId().toHexString();
    await analyticsService.recordAppEvent({
      user_id: USER,
      device_id: 'dev-9',
      input: input({
        super_category_slug: 'Dining',
        pod_id: pod,
        metadata_json: '{"a":1}',
        occurred_at: '2026-03-14T08:00:00.000Z',
      }),
    });
    const doc = m(AppEventModel.create).mock.calls[0][0];
    expect(doc.device_id).toBe('dev-9');
    expect(doc.super_category_slug).toBe('dining');
    expect(String(doc.pod_id)).toBe(pod);
    expect(doc.metadata).toEqual({ a: 1 });
    expect(doc.occurred_at.toISOString()).toBe('2026-03-14T08:00:00.000Z');
    expect(doc.route).toBe('');
    // the heat-map ping is written for the same device and day
    expect(m(ActiveUserPingModel.updateOne).mock.calls[0][0]).toMatchObject({
      device_id: 'dev-9',
      date_ymd: '2026-03-15',
      super_category_slug: 'dining',
    });
  });

  it('falls back to a user-scoped device id, now, and an empty pod / metadata for bad input', async () => {
    await analyticsService.recordAppEvent({
      user_id: USER,
      input: input({ pod_id: 'not-an-id', metadata_json: '[1,2]' }),
    });
    const doc = m(AppEventModel.create).mock.calls[0][0];
    expect(doc.device_id).toBe(`user:${USER}`);
    expect(doc.pod_id).toBeNull();
    expect(doc.super_category_slug).toBeNull();
    expect(doc.metadata).toEqual({});
    expect(doc.occurred_at.toISOString()).toBe('2026-03-15T10:00:00.000Z');
  });

  it('treats unparsable and empty metadata as an empty object', async () => {
    await analyticsService.recordAppEvent({ user_id: USER, input: input({ metadata_json: '{oops' }) });
    await analyticsService.recordAppEvent({ user_id: USER, input: input({ metadata_json: '' }) });
    expect(m(AppEventModel.create).mock.calls.map((c) => c[0].metadata)).toEqual([{}, {}]);
  });

  it('caps a very long device id at 100 characters', async () => {
    await analyticsService.recordAppEvent({ user_id: USER, device_id: 'd'.repeat(300), input: input() });
    expect(m(AppEventModel.create).mock.calls[0][0].device_id).toHaveLength(100);
  });
});

describe('stats', () => {
  const u1 = new Types.ObjectId();
  const docs = [
    { device_id: 'a', user_id: u1, date_ymd: '2026-03-02' },
    { device_id: 'b', user_id: null, date_ymd: '2026-03-02' },
    { device_id: 'a', user_id: u1, date_ymd: '2026-03-03' },
    { device_id: 'c', user_id: null, date_ymd: '2026-03-09' },
  ];

  it('de-duplicates devices and users per day and in total, oldest bucket first', async () => {
    m(ActiveUserPingModel.find).mockReturnValue(resolved([...docs].reverse()));
    const out = await analyticsService.stats({ from: '2026-03-01', to: '2026-03-31' });
    expect(m(ActiveUserPingModel.find).mock.calls[0][0]).toEqual({
      date_ymd: { $gte: '2026-03-01', $lte: '2026-03-31' },
    });
    expect(out.granularity).toBe('DAY');
    expect(out.total_unique_devices).toBe(3);
    expect(out.total_unique_users).toBe(1);
    expect(out.buckets).toEqual([
      { bucket: '2026-03-02', unique_devices: 2, unique_users: 1 },
      { bucket: '2026-03-03', unique_devices: 1, unique_users: 1 },
      { bucket: '2026-03-09', unique_devices: 1, unique_users: 0 },
    ]);
  });

  it('groups by ISO week and by month, and filters by a lower-cased category', async () => {
    m(ActiveUserPingModel.find).mockReturnValue(resolved(docs));
    const weekly = await analyticsService.stats({
      from: '2026-03-01',
      to: '2026-03-31',
      granularity: 'WEEK',
      super_category_slug: 'Dining',
    });
    expect(m(ActiveUserPingModel.find).mock.calls[0][0].super_category_slug).toBe('dining');
    expect(weekly.buckets.map((b) => b.bucket)).toEqual(['2026-W10', '2026-W11']);
    expect(weekly.buckets[0].unique_devices).toBe(2);

    const monthly = await analyticsService.stats({ from: '2026-03-01', to: '2026-03-31', granularity: 'MONTH' });
    expect(monthly.buckets).toEqual([{ bucket: '2026-03', unique_devices: 3, unique_users: 1 }]);
  });

  it('returns empty totals when nothing was recorded', async () => {
    m(ActiveUserPingModel.find).mockReturnValue(resolved([]));
    const out = await analyticsService.stats({ from: '2026-03-01', to: '2026-03-02', super_category_slug: null });
    expect(out).toMatchObject({ total_unique_devices: 0, total_unique_users: 0, buckets: [] });
    expect(m(ActiveUserPingModel.find).mock.calls[0][0].super_category_slug).toBeUndefined();
  });
});

describe('dashboardTotals', () => {
  const dining = { _id: new Types.ObjectId(), slug: 'dining', name: 'Dining' };
  const sports = { _id: new Types.ObjectId(), slug: 'sports', name: 'Sports' };

  const arrange = () => {
    m(CategoryModel.find).mockReturnValue({ sort: () => resolved([dining, sports]) });
    m(ClubModel.aggregate).mockResolvedValue([{ _id: dining._id, count: 4 }]);
    m(PodModel.aggregate).mockResolvedValue([{ _id: dining._id, count: 9 }, { _id: sports._id, count: 2 }]);
    m(UserModel.countDocuments).mockResolvedValue(100);
    m(PodModel.countDocuments).mockResolvedValue(50);
    m(ClubModel.countDocuments).mockResolvedValue(20);
    m(VenueModel.countDocuments).mockResolvedValue(7);
    m(HostModel.countDocuments).mockResolvedValue(3);
    m(ContactSubmissionModel.countDocuments).mockResolvedValueOnce(5).mockResolvedValueOnce(12);
    m(ContactSubmissionModel.aggregate).mockResolvedValue([
      { _id: 'NEW', count: 3 },
      { _id: 'RESOLVED', count: 6 },
    ]);
  };

  it('reports every super category with zero-filled counts and the global totals', async () => {
    arrange();
    const out = await analyticsService.dashboardTotals();
    expect(out.pods).toEqual([
      { super_category_slug: 'dining', super_category_name: 'Dining', count: 9 },
      { super_category_slug: 'sports', super_category_name: 'Sports', count: 2 },
    ]);
    expect(out.clubs.map((c) => c.count)).toEqual([4, 0]);
    expect(out).toMatchObject({
      users_total: 100,
      pods_total: 50,
      clubs_total: 20,
      venues_total: 7,
      hosts_total: 3,
      support_tickets_open: 5,
      support_tickets_total: 12,
    });
    expect(out.support_tickets_by_status).toEqual([
      { status: 'NEW', count: 3 },
      { status: 'IN_PROGRESS', count: 0 },
      { status: 'RESOLVED', count: 6 },
      { status: 'ARCHIVED', count: 0 },
    ]);
    // every active super category is passed to the aggregate as the narrowing set
    expect(m(ClubModel.aggregate).mock.calls[0][0][0].$match.super_category_id.$in).toHaveLength(2);
  });

  it('scopes pod and club totals to the chosen category but leaves the rest global', async () => {
    arrange();
    // the narrowed aggregate only returns the chosen category's rows
    m(PodModel.aggregate).mockResolvedValue([{ _id: dining._id, count: 9 }]);
    const out = await analyticsService.dashboardTotals('Dining');
    expect(out.pods).toEqual([{ super_category_slug: 'dining', super_category_name: 'Dining', count: 9 }]);
    expect(out.pods_total).toBe(9);
    expect(out.clubs_total).toBe(4);
    expect(out.users_total).toBe(100);
    expect(m(ClubModel.aggregate).mock.calls[0][0][0]).toEqual({
      $match: { super_category_id: { $in: [dining._id] } },
    });
  });

  it('lists no buckets for an unknown category', async () => {
    arrange();
    const out = await analyticsService.dashboardTotals('nope');
    expect(out.pods).toEqual([]);
    expect(out.clubs).toEqual([]);
  });
});

describe('userActivityYear', () => {
  it('builds the heat-map with levels and always offers the current and chosen years', async () => {
    m(ActiveUserPingModel.aggregate)
      .mockResolvedValueOnce([{ _id: '2024' }, { _id: '2025' }, { _id: '' }])
      .mockResolvedValueOnce([
        { _id: '2023-01-02', count: 0 },
        { _id: '2023-01-03', count: 2 },
        { _id: '2023-01-04', count: 5 },
        { _id: '2023-01-05', count: 10 },
        { _id: '2023-01-06', count: 11 },
      ]);
    const out = await analyticsService.userActivityYear({ user_id: USER, year: 2023 });
    expect(out.year).toBe(2023);
    expect(out.available_years).toEqual([2023, 2024, 2025, 2026]);
    expect(out.days.map((d) => d.level)).toEqual([0, 1, 2, 3, 4]);
    expect(out.total_visits).toBe(28);
    expect(m(ActiveUserPingModel.aggregate).mock.calls[1][0][0].$match.date_ymd).toEqual({
      $gte: '2023-01-01',
      $lte: '2023-12-31',
    });
  });

  it('defaults to the current year without duplicating it', async () => {
    m(ActiveUserPingModel.aggregate).mockResolvedValueOnce([{ _id: '2026' }]).mockResolvedValueOnce([]);
    const out = await analyticsService.userActivityYear({ user_id: USER });
    expect(out.year).toBe(2026);
    expect(out.available_years).toEqual([2026]);
    expect(out.total_visits).toBe(0);
  });
});

describe('userClickstream', () => {
  const query = (rows: unknown[]) => {
    const limit = jest.fn().mockResolvedValue(rows);
    m(AppEventModel.find).mockReturnValue({ sort: () => ({ limit }) });
    return limit;
  };
  const event = (over: Record<string, unknown>) => ({
    _id: new Types.ObjectId(),
    user_id: new Types.ObjectId(USER),
    device_id: 'dev',
    event_type: 'CLICK',
    occurred_at: new Date('2026-03-14T08:00:00Z'),
    ...over,
  });

  it('returns the day as public events, with empty strings for unset text', async () => {
    const pod = new Types.ObjectId();
    const limit = query([event({ path: '/pods', pod_id: pod, metadata: { a: 1 } }), event({})]);
    const out = await analyticsService.userClickstream({ user_id: USER, date: '2026-03-14' });
    expect(limit).toHaveBeenCalledWith(300);
    const filter = m(AppEventModel.find).mock.calls[0][0];
    expect(filter.occurred_at.$gte.toISOString()).toBe('2026-03-14T00:00:00.000Z');
    expect(filter.occurred_at.$lte.toISOString()).toBe('2026-03-14T23:59:59.999Z');
    expect(out[0]).toMatchObject({ path: '/pods', pod_id: String(pod), metadata_json: '{"a":1}' });
    expect(out[1]).toMatchObject({ path: '', pod_id: null, metadata_json: '{}', super_category_slug: null });
    expect(out[0].occurred_at).toBe('2026-03-14T08:00:00.000Z');
  });

  it('clamps the limit between 1 and 1000', async () => {
    const limit = query([]);
    await analyticsService.userClickstream({ user_id: USER, date: '2026-03-14', limit: 99999 });
    await analyticsService.userClickstream({ user_id: USER, date: '2026-03-14', limit: -4 });
    expect(limit.mock.calls.map((c) => c[0])).toEqual([1000, 1]);
  });
});

describe('deleteUserActivityDay / deleteUserActivityYear', () => {
  it('reports whether anything was removed from pings or events, scoped to the user and day', async () => {
    m(ActiveUserPingModel.deleteMany).mockResolvedValue({ deletedCount: 0 });
    m(AppEventModel.deleteMany).mockResolvedValue({ deletedCount: 3 });
    expect(await analyticsService.deleteUserActivityDay({ user_id: USER, date: '2026-03-14' })).toBe(true);
    expect(m(ActiveUserPingModel.deleteMany).mock.calls[0][0]).toMatchObject({ date_ymd: '2026-03-14' });
    expect(String(m(ActiveUserPingModel.deleteMany).mock.calls[0][0].user_id)).toBe(USER);

    m(AppEventModel.deleteMany).mockResolvedValue({ deletedCount: 0 });
    expect(await analyticsService.deleteUserActivityDay({ user_id: USER, date: '2026-03-14' })).toBe(false);
  });

  it('wipes a whole year across both collections', async () => {
    m(ActiveUserPingModel.deleteMany).mockResolvedValue({ deletedCount: 2 });
    m(AppEventModel.deleteMany).mockResolvedValue({ deletedCount: 0 });
    expect(await analyticsService.deleteUserActivityYear({ user_id: USER, year: 2025 })).toBe(true);
    expect(m(ActiveUserPingModel.deleteMany).mock.calls[0][0].date_ymd).toEqual({
      $gte: '2025-01-01',
      $lte: '2025-12-31',
    });
    const range = m(AppEventModel.deleteMany).mock.calls[0][0].occurred_at;
    expect(range.$gte.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(range.$lte.toISOString()).toBe('2025-12-31T23:59:59.999Z');

    m(ActiveUserPingModel.deleteMany).mockResolvedValue({ deletedCount: 0 });
    expect(await analyticsService.deleteUserActivityYear({ user_id: USER, year: 2025 })).toBe(false);
  });
});
