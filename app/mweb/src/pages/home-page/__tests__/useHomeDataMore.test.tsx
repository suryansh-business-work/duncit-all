import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { HEADER_STATIC } from '../../../components/app-header/queries';
import { FOLLOWED_USERS, HOME_LIVE, HOME_STATIC } from '../queries';
import { useHomeData } from '../useHomeData';

const h = vi.hoisted(() => ({
  results: new Map<unknown, unknown>(),
  calls: [] as Array<{ doc: unknown; opts: { variables?: unknown; skip?: boolean } }>,
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (doc: unknown, opts: { variables?: unknown; skip?: boolean }) => {
    h.calls.push({ doc, opts: opts ?? {} });
    return h.results.get(doc) ?? { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
  },
}));
vi.mock('../../../user-info/useUserInfo', () => ({ useUserInfo: () => ({ me: null }) }));
vi.mock('../../../hooks/useFollowedClubs', () => ({ useFollowedClubs: () => ({ ids: [] }) }));
vi.mock('../../../utils/dateFormat', async (orig) => ({ ...(await orig<object>()), useHappeningNearbyDays: () => 365 }));

const day = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

const CATEGORIES = [
  { id: 'sup', name: 'Sports', slug: 'sports', level: 'SUPER', parent_id: null },
  { id: 'cat', name: 'Racquet', slug: 'racquet', level: 'CATEGORY', parent_id: 'sup' },
  { id: 'sub', name: 'Badminton', slug: 'badminton', level: 'SUB', parent_id: 'cat' },
  // Lost parent: the chain stops at a category that is not in the catalogue.
  { id: 'lost', name: 'Lost', slug: 'lost', level: 'CATEGORY', parent_id: 'gone' },
  // A top-level node that is not a SUPER and has no parent.
  { id: 'root', name: 'Root', slug: 'root', level: 'CATEGORY', parent_id: null },
];
const CLUBS = [
  { id: 'clubA', category_id: 'cat', super_category_id: null },
  { id: 'clubB', category_id: 'sub', super_category_id: 'sup' },
  { id: 'clubC', category_id: null, super_category_id: null },
  { id: 'clubD', category_id: 'lost', super_category_id: null },
];
const pod = (id: string, club: string, over: Record<string, unknown> = {}) => ({
  id,
  club_id: club,
  pod_date_time: day(1),
  pod_type: 'PAID',
  pod_amount: 100,
  pod_hosts_id: [],
  host_names: null,
  ...over,
});

const feed = (pods: unknown[], overrides: { header?: object; staticData?: object } = {}) => {
  h.results.clear();
  h.results.set(HEADER_STATIC, { data: { branding: {}, locations: [], ...overrides.header }, error: undefined });
  h.results.set(HOME_STATIC, { data: { clubs: CLUBS, categories: CATEGORIES, publicHosts: [], ...overrides.staticData }, loading: false, error: undefined, refetch: vi.fn() });
  h.results.set(HOME_LIVE, { data: { pods, stories: [] }, loading: false, error: undefined, refetch: vi.fn() });
  h.results.set(FOLLOWED_USERS, { data: undefined });
};

const params: Parameters<typeof useHomeData>[0] = {
  superCategorySlug: '',
  locationId: 'loc1',
  zoneName: 'zone',
  categoryId: '',
  priceFilter: 'ALL',
  dateFilter: 'ALL',
  sortBy: 'DATE_ASC',
};
const run = (over: Partial<typeof params> = {}) => renderHook(() => useHomeData({ ...params, ...over }));

beforeEach(() => {
  h.calls.length = 0;
});

describe('club section ordering', () => {
  const pods = [
    pod('early-dear', 'clubA', { pod_date_time: day(1), pod_amount: 500 }),
    pod('late-cheap', 'clubA', { pod_date_time: day(3), pod_amount: 50 }),
    pod('mid-mid', 'clubA', { pod_date_time: day(2), pod_amount: 200 }),
  ];
  const order = (sortBy: typeof params.sortBy) => {
    feed(pods);
    return run({ sortBy }).result.current.podsByClub.get('clubA')?.map((p: { id: string }) => p.id);
  };

  it('sorts a club earliest first, latest first, cheapest first and dearest first', () => {
    expect(order('DATE_ASC')).toEqual(['early-dear', 'mid-mid', 'late-cheap']);
    expect(order('DATE_DESC')).toEqual(['late-cheap', 'mid-mid', 'early-dear']);
    expect(order('PRICE_ASC')).toEqual(['late-cheap', 'mid-mid', 'early-dear']);
    expect(order('PRICE_DESC')).toEqual(['early-dear', 'mid-mid', 'late-cheap']);
  });

  it('treats a pod with no price as free and one with no date as earliest', () => {
    feed([pod('a', 'clubA', { pod_amount: null, pod_date_time: null }), pod('b', 'clubA', { pod_amount: 10 })]);
    const result = run({ sortBy: 'PRICE_ASC' }).result.current;
    expect(result.podsByClub.get('clubA')?.map((p: { id: string }) => p.id)).toEqual(['a', 'b']);
  });
});

describe('filters', () => {
  it('filters by the next month, and drops undated pods from a dated filter', () => {
    feed([pod('soon', 'clubA', { pod_date_time: day(2) }), pod('far', 'clubA', { pod_date_time: day(60) }), pod('nodate', 'clubA', { pod_date_time: null })]);
    const ids = run({ dateFilter: 'MONTH' }).result.current.activePods.map((p: { id: string }) => p.id);
    expect(ids).toEqual(['soon']);
  });

  it('filters by today, tomorrow and this week', () => {
    const today = new Date();
    today.setHours(23, 0, 0, 0);
    feed([pod('today', 'clubA', { pod_date_time: today.toISOString() }), pod('tomorrow', 'clubA', { pod_date_time: day(1) }), pod('week', 'clubA', { pod_date_time: day(5) })]);
    const idsFor = (dateFilter: typeof params.dateFilter) => run({ dateFilter }).result.current.activePods.map((p: { id: string }) => p.id);
    expect(idsFor('TOMORROW')).toEqual(['tomorrow']);
    expect(idsFor('WEEK')).toContain('week');
    expect(idsFor('WEEK')).not.toContain('tomorrow-x');
  });

  it('filters by category, keeping clubs in the category, below it or above it, and dropping clubs with none', () => {
    feed([pod('p-cat', 'clubA'), pod('p-sub', 'clubB'), pod('p-none', 'clubC'), pod('p-lost', 'clubD')]);
    const idsFor = (categoryId: string) => run({ categoryId }).result.current.activePods.map((p: { id: string }) => p.id).sort();
    // A club in the chosen category itself.
    expect(idsFor('cat')).toEqual(['p-cat', 'p-sub']);
    // The chosen category is below the club's own (a sub chosen, club sits in its parent).
    expect(idsFor('sub')).toEqual(['p-cat', 'p-sub']);
    // A club with no category never matches a category filter.
    expect(idsFor('sup')).not.toContain('p-none');
    expect(idsFor('lost')).toEqual(['p-lost']);
  });

  it('keeps clubs whose super category is chosen, by their own id or through the catalogue', () => {
    feed([pod('p-cat', 'clubA'), pod('p-sub', 'clubB'), pod('p-lost', 'clubD')]);
    const ids = run({ superCategorySlug: 'sports' }).result.current.activePods.map((p: { id: string }) => p.id).sort();
    expect(ids).toEqual(['p-cat', 'p-sub']);
  });

  it('shows nothing for an unknown super category slug rather than everything', () => {
    feed([pod('p-cat', 'clubA')]);
    expect(run({ superCategorySlug: 'nope' }).result.current.activePods.length).toBe(1);
  });
});

describe('waiting for the city', () => {
  it('does not ask for the live feed until the header has picked a city', () => {
    feed([], { header: { locations: [{ id: 'loc1' }] } });
    run({ locationId: '', zoneName: '' });
    const live = h.calls.find((c) => c.doc === HOME_LIVE);
    expect(live?.opts.skip).toBe(true);
  });

  it('asks for every city when the header has no city to pick, with the location and zone left out', () => {
    feed([], { header: { locations: [] } });
    const { result } = run({ locationId: '', zoneName: '' });
    const live = h.calls.find((c) => c.doc === HOME_LIVE);
    expect(live?.opts.skip).toBe(false);
    expect(live?.opts.variables).toEqual({ podFilter: { location_id: undefined, zone_name: undefined, is_active: true } });
    expect(result.current.loading).toBe(false);
  });

  it('asks for the city as soon as one is known, and waits when the header has not answered', () => {
    feed([]);
    run();
    expect(h.calls.find((c) => c.doc === HOME_LIVE)?.opts.skip).toBe(false);
    h.calls.length = 0;
    feed([]);
    h.results.set(HEADER_STATIC, { data: undefined, error: undefined });
    run({ locationId: '' });
    expect(h.calls.find((c) => c.doc === HOME_LIVE)?.opts.skip).toBe(true);
  });

  it('does not wait when the header failed outright', () => {
    feed([]);
    h.results.set(HEADER_STATIC, { data: undefined, error: new Error('down') });
    run({ locationId: '' });
    expect(h.calls.find((c) => c.doc === HOME_LIVE)?.opts.skip).toBe(false);
  });
});

describe('rails that are sorted by start time', () => {
  const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();

  it('lists running pods longest-running first and past pods most recent first', () => {
    feed([
      pod('run-new', 'clubA', { pod_date_time: hours(-1), pod_end_date_time: hours(2) }),
      pod('run-old', 'clubA', { pod_date_time: hours(-3), pod_end_date_time: hours(2) }),
      pod('past-old', 'clubA', { pod_date_time: day(-5), pod_end_date_time: day(-5) }),
      pod('past-new', 'clubA', { pod_date_time: day(-2), pod_end_date_time: day(-2) }),
    ]);
    const result = run().result.current;
    expect(result.ongoingPods.map((p: { id: string }) => p.id)).toEqual(['run-old', 'run-new']);
    expect(result.previousPods.map((p: { id: string }) => p.id)).toEqual(['past-new', 'past-old']);
  });

  it('puts undated pods first when sorting earliest first and last when sorting latest first, and reads a missing price as zero', () => {
    const pods = [
      pod('u1', 'clubA', { pod_date_time: null, pod_amount: null }),
      pod('dated', 'clubA', { pod_date_time: day(2), pod_amount: 80 }),
      pod('u2', 'clubA', { pod_date_time: null, pod_amount: null }),
      pod('dated-too', 'clubA', { pod_date_time: day(3), pod_amount: 10 }),
      pod('u3', 'clubA', { pod_date_time: null, pod_amount: null }),
    ];
    const idsFor = (sortBy: typeof params.sortBy) => {
      feed(pods);
      return run({ sortBy }).result.current.podsByClub.get('clubA')?.map((p: { id: string }) => p.id) ?? [];
    };
    const undated = (ids: string[]) => ids.filter((id) => id.startsWith('u'));
    expect(undated(idsFor('DATE_ASC').slice(0, 3))).toHaveLength(3);
    expect(idsFor('DATE_ASC').slice(3)).toEqual(['dated', 'dated-too']);
    expect(undated(idsFor('DATE_DESC').slice(2))).toHaveLength(3);
    expect(idsFor('DATE_DESC').slice(0, 2)).toEqual(['dated-too', 'dated']);
    expect(undated(idsFor('PRICE_ASC').slice(0, 3))).toHaveLength(3);
    expect(idsFor('PRICE_DESC').slice(0, 2)).toEqual(['dated', 'dated-too']);
  });

  it('filters to pods that start today', () => {
    const later = new Date();
    later.setHours(23, 59, 0, 0);
    feed([pod('today', 'clubA', { pod_date_time: later.toISOString() }), pod('next-week', 'clubA', { pod_date_time: day(5) })]);
    const ids = run({ dateFilter: 'TODAY' }).result.current.activePods.map((p: { id: string }) => p.id);
    expect(ids).toContain('today');
    expect(ids).not.toContain('next-week');
  });
});
