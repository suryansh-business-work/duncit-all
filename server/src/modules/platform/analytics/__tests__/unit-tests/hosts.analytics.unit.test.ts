/**
 * Analytics > Hosts from hand-built host records and held pods: the pipeline
 * tiles, the activation share, the breakdowns and the ranking. Loaders are
 * mocked; every figure is the module's own arithmetic.
 */
jest.mock('@modules/venues/host/host.model', () => ({ HostModel: { find: jest.fn() } }));
jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: { find: jest.fn() } }));
jest.mock('@modules/finance/payment/payment.model', () => ({ PaymentModel: { aggregate: jest.fn() } }));
jest.mock('@modules/pods/ticket/ticket.model', () => ({ TicketModel: { aggregate: jest.fn() } }));
jest.mock('@modules/support/bouncer/bouncer.model', () => ({ BouncerFeedbackModel: { aggregate: jest.fn() } }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { find: jest.fn() } }));
jest.mock('@modules/platform/location/location.model', () => ({ LocationModel: { find: jest.fn() } }));
jest.mock('@modules/pods/category/category.model', () => ({ CategoryModel: { find: jest.fn() } }));
jest.mock('../../entity/hosts.data', () => ({
  ...jest.requireActual('../../entity/hosts.data'),
  loadHosts: jest.fn(),
}));
jest.mock('../../entity/held-pods', () => ({
  ...jest.requireActual('../../entity/held-pods'),
  loadHeldPods: jest.fn(),
  loadOutcomes: jest.fn(),
}));
jest.mock('../../entity/signals', () => ({
  ...jest.requireActual('../../entity/signals'),
  aspectRatings: jest.fn(),
  markCounts: jest.fn(),
}));
jest.mock('../../entity/lookups', () => ({
  ...jest.requireActual('../../entity/lookups'),
  locationNames: jest.fn(),
  userNames: jest.fn(),
}));

import { Types } from 'mongoose';
import { hostAnalytics } from '../../entity/hosts.analytics';
import { loadHosts, type HostRow } from '../../entity/hosts.data';
import { loadHeldPods, loadOutcomes, type HeldPod } from '../../entity/held-pods';
import { aspectRatings, markCounts } from '../../entity/signals';
import { locationNames, userNames } from '../../entity/lookups';
import type { AnalyticsWindow } from '../../entity/window';

const m = (fn: unknown) => fn as jest.Mock;
const d = (iso: string) => new Date(iso);
const oid = () => new Types.ObjectId();

const WINDOW: AnalyticsWindow = {
  days: 7,
  from: d('2026-03-08T00:00:00Z'),
  to: d('2026-03-15T00:00:00Z'),
  prevFrom: d('2026-03-01T00:00:00Z'),
  prevTo: d('2026-03-08T00:00:00Z'),
  compare: 'PREVIOUS',
  city: null,
  granularity: 'DAY',
  zone: 'UTC',
  buckets: ['2026-03-08', '2026-03-09', '2026-03-10'],
};

const u1 = oid();
const u2 = oid();
const u3 = oid();
const u4 = oid();
const host = (user: Types.ObjectId, over: Partial<HostRow> = {}): HostRow => ({
  _id: oid(),
  user_id: user,
  status: 'APPROVED',
  ...over,
});

const hosts: HostRow[] = [
  host(u1, {
    full_name: 'Asha',
    host_no: 'H-1',
    submitted_at: d('2026-03-01T00:00:00Z'),
    approved_at: d('2026-03-03T00:00:00Z'),
    host_categories: [{ category_id: oid(), category_name: 'Dining' }, { category_id: null }],
  }),
  host(u2, { submitted_at: d('2026-03-09T00:00:00Z'), approved_at: d('2026-03-10T00:00:00Z') }),
  host(u3, { status: 'REJECTED', submitted_at: d('2026-03-09T00:00:00Z'), rejected_at: d('2026-03-12T00:00:00Z') }),
  host(u4, { status: 'SUBMITTED', submitted_at: d('2026-03-11T00:00:00Z') }),
  host(oid(), { status: 'APPROVED', is_active: false }),
];

const pod = (id: string, hostIds: string[], over: Partial<HeldPod> = {}): HeldPod => ({
  id,
  club_id: 'c1',
  host_ids: hostIds,
  location_id: null,
  starts_at: d('2026-03-09T18:00:00Z'),
  spots: 10,
  seats: 5,
  amount: 0,
  mode: 'PHYSICAL',
  type: 'PAID',
  ...over,
});

const stars = new Map([['5', 2]]);

beforeEach(() => {
  jest.clearAllMocks();
  m(loadHosts).mockResolvedValue(hosts);
  m(loadHeldPods).mockImplementation(async (from: Date) =>
    from.getTime() === WINDOW.from.getTime()
      ? [
          pod('p1', [u1.toHexString(), u2.toHexString()]),
          pod('p2', [u1.toHexString()], { starts_at: d('2026-03-10T18:00:00Z'), seats: 8 }),
        ]
      : []
  );
  m(markCounts).mockResolvedValue(new Map([['HOST_SCAN', 3], ['HOST_MANUAL', 1]]));
  m(aspectRatings).mockResolvedValue({ sum: 9, count: 2, average: 4.5, stars });
  m(loadOutcomes).mockResolvedValue(new Map());
  m(locationNames).mockResolvedValue(new Map());
  m(userNames).mockResolvedValue(new Map([[u2.toHexString(), 'Ravi Kumar']]));
});

const tile = (out: Awaited<ReturnType<typeof hostAnalytics>>, key: string) =>
  out.kpis.find((k) => k.key === key);

describe('hostAnalytics', () => {
  it('computes the pipeline and activity tiles against the previous period', async () => {
    const out = await hostAnalytics(WINDOW);
    expect(tile(out, 'hosts_total')?.value).toBe(5);
    // approved AND active: u1, u2, and the u3 / u4 / inactive rows are not
    expect(tile(out, 'approved_hosts')?.value).toBe(2);
    expect(tile(out, 'pending_review')?.value).toBe(1);
    expect(tile(out, 'new_applications')).toMatchObject({ value: 3, previous: 1 });
    expect(tile(out, 'approvals')).toMatchObject({ value: 1, previous: 1 });
    // 1 approved against 1 rejected in the window
    expect(tile(out, 'approval_rate')?.value).toBe(50);
    expect(tile(out, 'active_hosts')).toMatchObject({ value: 2, previous: 0 });
    expect(tile(out, 'host_activation_rate')?.value).toBe(100);
    // 3 hosting slots shared by 2 active hosts
    expect(tile(out, 'pods_per_active_host')?.value).toBe(1.5);
    expect(tile(out, 'scan_share')?.value).toBe(75);
    expect(tile(out, 'host_rating')?.value).toBe(4.5);
    expect(tile(out, 'avg_review_days')?.value).toBe(1);
  });

  it('lays onboarding and activity onto the day buckets', async () => {
    const out = await hostAnalytics(WINDOW);
    const onboarding = out.trends.find((t) => t.key === 'host_onboarding');
    expect(onboarding?.series.find((s) => s.key === 'new_applications')?.values).toEqual([0, 2, 0]);
    expect(onboarding?.series.find((s) => s.key === 'approvals')?.values).toEqual([0, 0, 1]);
    const activity = out.trends.find((t) => t.key === 'host_activity');
    expect(activity?.series[0].values).toEqual([0, 2, 1]);
  });

  it('breaks hosts down by status, pods hosted, category, city and marks', async () => {
    const out = await hostAnalytics(WINDOW);
    const byKey = (key: string) => out.breakdowns.find((b) => b.key === key);
    const status = Object.fromEntries(byKey('host_status')!.slices.map((s) => [s.key, s.value]));
    expect(status).toMatchObject({ APPROVED: 2, REJECTED: 1, SUBMITTED: 1, INACTIVE: 1, DRAFT: 0 });
    // u1 hosted two pods, u2 one; the unactive approved host still counts as hosting none
    const perHost = Object.fromEntries(byKey('pods_per_host')!.slices.map((s) => [s.key, s.value]));
    expect(Object.values(perHost).reduce((a, b) => a + b, 0)).toBe(2);
    expect(byKey('hosts_by_category')!.slices.length).toBeGreaterThan(0);
    expect(byKey('host_marks')!.slices.find((s) => s.key === 'HOST_SCAN')?.value).toBe(3);
    expect(byKey('host_rating_stars')!.slices.find((s) => s.key === '5')?.value).toBe(2);
  });

  it('ranks hosts by seats, naming them from the record then the user, and linking known hosts', async () => {
    const out = await hostAnalytics(WINDOW);
    const rows = out.leaderboard!.rows;
    expect(out.leaderboard!.key).toBe('top_hosts');
    expect(rows.map((r) => r.id)).toEqual([u1.toHexString(), u2.toHexString()]);
    expect(rows[0]).toMatchObject({ name: 'Asha', caption: 'H-1' });
    expect(rows[0].link).not.toBeNull();
    expect(rows[0].values.slice(0, 2)).toEqual([2, 13]);
    // no host_no and no full_name on u2's record: the user's own name is used
    expect(rows[1]).toMatchObject({ name: 'Ravi Kumar', caption: null });
  });

  it('shows an unlinked, unnamed row for a hosting user with no host record', async () => {
    const stranger = oid().toHexString();
    m(loadHeldPods).mockImplementation(async (from: Date) =>
      from.getTime() === WINDOW.from.getTime() ? [pod('p9', [stranger])] : []
    );
    m(userNames).mockResolvedValue(new Map());
    const out = await hostAnalytics(WINDOW);
    expect(out.leaderboard!.rows[0]).toMatchObject({ id: stranger, name: '', caption: null, link: null });
  });

  it('copes with a platform with no hosts and no activity', async () => {
    m(loadHosts).mockResolvedValue([]);
    m(loadHeldPods).mockResolvedValue([]);
    m(markCounts).mockResolvedValue(new Map());
    m(aspectRatings).mockResolvedValue({ sum: 0, count: 0, average: 0, stars: new Map() });
    const out = await hostAnalytics(WINDOW);
    expect(tile(out, 'host_activation_rate')?.value).toBe(0);
    expect(tile(out, 'scan_share')?.value).toBe(0);
    expect(tile(out, 'avg_review_days')?.value).toBe(0);
    expect(out.leaderboard!.rows).toEqual([]);
  });
});
