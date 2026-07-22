import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  filterExplorePods,
  activeExploreFilterCount,
  type ExploreFilters,
} from '../exploreFilters';

const baseFilters = (over: Partial<ExploreFilters> = {}): ExploreFilters => ({
  preset: 'ALL',
  categoryId: '',
  price: 'ALL',
  date: 'ALL',
  sort: 'SOONEST',
  search: '',
  ...over,
});

// A fixed "now" so date-range branches are deterministic.
const NOW = new Date('2026-07-22T12:00:00.000Z');

const iso = (base: Date, addDays: number, hour = 12) => {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + addDays);
  d.setHours(hour);
  return d.toISOString();
};

const makePod = (over: Record<string, unknown> = {}) => ({
  club_id: 'club1',
  reel_url: 'reel.mp4',
  pod_type: 'FREE_NATIVE',
  pod_mode: 'PHYSICAL',
  pod_date_time: iso(NOW, 0),
  location_id: 'loc1',
  zone_name: 'zoneA',
  pod_title: 'Yoga',
  pod_description: 'morning session',
  place_label: 'Park',
  like_count: 0,
  comment_count: 0,
  pod_attendees: [],
  pod_amount: 0,
  ...over,
});

const makeClub = (over: Record<string, unknown> = {}) => ({
  club_id: 'club1',
  club_name: 'Fitness Club',
  category_id: 'cat-child',
  super_category_id: 'super1',
  ...over,
});

const clubsMap = (clubs: Array<Record<string, unknown>>) =>
  new Map(clubs.map((c) => [c.club_id as string, c]));

// category tree: cat-child -> cat-parent -> null
const categories = [
  { id: 'cat-child', parent_id: 'cat-parent' },
  { id: 'cat-parent', parent_id: null },
];
const superCategories = [
  { id: 'super1', slug: 'sports' },
  { id: 'super2', slug: 'music' },
];

const run = (
  pods: Array<Record<string, unknown>>,
  clubs: Array<Record<string, unknown>>,
  filters: ExploreFilters,
  extra: Partial<Parameters<typeof filterExplorePods>[0]> = {},
) =>
  filterExplorePods({
    pods,
    clubsById: clubsMap(clubs),
    categories,
    superCategories,
    filters,
    ...extra,
  });

describe('filterExplorePods', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('drops pods without a reel_url', () => {
    const result = run(
      [makePod({ reel_url: null }), makePod({ pod_title: 'Keep' })],
      [makeClub()],
      baseFilters(),
    );
    expect(result).toHaveLength(1);
    expect(result[0].pod_title).toBe('Keep');
  });

  it('filters by super category slug', () => {
    const pods = [
      makePod({ club_id: 'club1' }),
      makePod({ club_id: 'club2' }),
    ];
    const clubs = [
      makeClub({ club_id: 'club1', super_category_id: 'super1' }),
      makeClub({ club_id: 'club2', super_category_id: 'super2' }),
    ];
    const result = run(pods, clubs, baseFilters(), { superCategorySlug: 'sports' });
    expect(result).toHaveLength(1);
    expect(result[0].club_id).toBe('club1');
  });

  it('matches category via parent traversal', () => {
    const result = run([makePod()], [makeClub({ category_id: 'cat-child' })], baseFilters({ categoryId: 'cat-parent' }));
    expect(result).toHaveLength(1);
  });

  it('excludes pods whose category does not match', () => {
    const result = run([makePod()], [makeClub({ category_id: 'cat-child' })], baseFilters({ categoryId: 'other' }));
    expect(result).toHaveLength(0);
  });

  it('empty categoryId matches everything', () => {
    const result = run([makePod()], [makeClub({ category_id: null })], baseFilters({ categoryId: '' }));
    expect(result).toHaveLength(1);
  });

  it('NEAR preset filters by location and zone; virtual pods bypass', () => {
    const pods = [
      makePod({ location_id: 'loc1', zone_name: 'zoneA', pod_title: 'Match' }),
      makePod({ location_id: 'locX', zone_name: 'zoneA', pod_title: 'WrongLoc' }),
      makePod({ location_id: 'loc1', zone_name: 'zoneZ', pod_title: 'WrongZone' }),
      makePod({ pod_mode: 'VIRTUAL', location_id: 'locX', zone_name: 'zoneZ', pod_title: 'Virtual' }),
    ];
    const result = run(pods, [makeClub()], baseFilters({ preset: 'NEAR' }), {
      locationId: 'loc1',
      zoneName: 'zoneA',
    });
    const titles = result.map((p) => p.pod_title).sort();
    expect(titles).toEqual(['Match', 'Virtual']);
  });

  it('price filters: FREE, PAID, PREMIUM', () => {
    const pods = [
      makePod({ pod_type: 'FREE_NATIVE', pod_title: 'free' }),
      makePod({ pod_type: 'NATIVE_PAID', pod_title: 'paid' }),
      makePod({ pod_type: 'NATIVE_PAID_PREMIUM', pod_title: 'premium' }),
    ];
    const clubs = [makeClub()];
    expect(run(pods, clubs, baseFilters({ price: 'FREE' })).map((p) => p.pod_title)).toEqual(['free']);
    expect(run(pods, clubs, baseFilters({ price: 'PAID' })).map((p) => p.pod_title)).toEqual(['paid']);
    expect(run(pods, clubs, baseFilters({ price: 'PREMIUM' })).map((p) => p.pod_title)).toEqual(['premium']);
    expect(run(pods, clubs, baseFilters({ price: 'ALL' }))).toHaveLength(3);
  });

  it('date filters: TODAY, TOMORROW, WEEK, MONTH', () => {
    const pods = [
      makePod({ pod_date_time: iso(NOW, 0), pod_title: 'today' }),
      makePod({ pod_date_time: iso(NOW, 1), pod_title: 'tomorrow' }),
      makePod({ pod_date_time: iso(NOW, 4), pod_title: 'thisweek' }),
      makePod({ pod_date_time: iso(NOW, 20), pod_title: 'thismonth' }),
      makePod({ pod_date_time: iso(NOW, 40), pod_title: 'faraway' }),
    ];
    const clubs = [makeClub()];
    expect(run(pods, clubs, baseFilters({ date: 'TODAY' })).map((p) => p.pod_title)).toEqual(['today']);
    expect(run(pods, clubs, baseFilters({ date: 'TOMORROW' })).map((p) => p.pod_title)).toEqual(['tomorrow']);
    expect(run(pods, clubs, baseFilters({ date: 'WEEK' })).map((p) => p.pod_title).sort()).toEqual(['thisweek', 'today', 'tomorrow']);
    expect(run(pods, clubs, baseFilters({ date: 'MONTH' })).map((p) => p.pod_title).sort()).toEqual(['thismonth', 'thisweek', 'today', 'tomorrow']);
    expect(run(pods, clubs, baseFilters({ date: 'ALL' }))).toHaveLength(5);
  });

  it('TONIGHT preset restricts to today regardless of date filter', () => {
    const pods = [
      makePod({ pod_date_time: iso(NOW, 0), pod_title: 'tonight' }),
      makePod({ pod_date_time: iso(NOW, 5), pod_title: 'later' }),
    ];
    const result = run(pods, [makeClub()], baseFilters({ preset: 'TONIGHT', date: 'MONTH' }));
    expect(result.map((p) => p.pod_title)).toEqual(['tonight']);
  });

  it('drops pods with missing pod_date_time under a date filter', () => {
    const result = run([makePod({ pod_date_time: null })], [makeClub()], baseFilters({ date: 'TODAY' }));
    expect(result).toHaveLength(0);
  });

  it('search matches across pod and club fields, case-insensitive', () => {
    const pods = [
      makePod({ pod_title: 'Salsa Night', pod_title_extra: '' }),
      makePod({ pod_title: 'Other', pod_description: '', place_label: '', club_id: 'club2' }),
    ];
    const clubs = [makeClub({ club_id: 'club1' }), makeClub({ club_id: 'club2', club_name: 'Nope' })];
    const result = run(pods, clubs, baseFilters({ search: '  SALSA  ' }));
    expect(result).toHaveLength(1);
    expect(result[0].pod_title).toBe('Salsa Night');
  });

  it('sorts by SOONEST (date ascending) by default', () => {
    const pods = [
      makePod({ pod_date_time: iso(NOW, 5), pod_title: 'late' }),
      makePod({ pod_date_time: iso(NOW, 1), pod_title: 'early' }),
    ];
    const result = run(pods, [makeClub()], baseFilters());
    expect(result.map((p) => p.pod_title)).toEqual(['early', 'late']);
  });

  it('sorts by TRENDING using engagement score', () => {
    const pods = [
      makePod({ pod_title: 'low', like_count: 1, comment_count: 0, pod_attendees: [] }),
      makePod({ pod_title: 'high', like_count: 10, comment_count: 5, pod_attendees: [{}, {}] }),
    ];
    const result = run(pods, [makeClub()], baseFilters({ sort: 'TRENDING' }));
    expect(result.map((p) => p.pod_title)).toEqual(['high', 'low']);
  });

  it('TRENDING falls through to date when scores tie', () => {
    const pods = [
      makePod({ pod_title: 'b', pod_date_time: iso(NOW, 3), like_count: 1 }),
      makePod({ pod_title: 'a', pod_date_time: iso(NOW, 1), like_count: 1 }),
    ];
    const result = run(pods, [makeClub()], baseFilters({ preset: 'TRENDING' }));
    expect(result.map((p) => p.pod_title)).toEqual(['a', 'b']);
  });

  it('sorts by PRICE_LOW and PRICE_HIGH', () => {
    const pods = [
      makePod({ pod_title: 'cheap', pod_amount: 5 }),
      makePod({ pod_title: 'pricey', pod_amount: 50 }),
    ];
    const clubs = [makeClub()];
    expect(run(pods, clubs, baseFilters({ sort: 'PRICE_LOW' })).map((p) => p.pod_title)).toEqual(['cheap', 'pricey']);
    expect(run(pods, clubs, baseFilters({ sort: 'PRICE_HIGH' })).map((p) => p.pod_title)).toEqual(['pricey', 'cheap']);
  });

  it('handles no superCategorySlug (selectedSuperId null)', () => {
    const result = run([makePod()], [makeClub()], baseFilters());
    expect(result).toHaveLength(1);
  });
});

describe('activeExploreFilterCount', () => {
  it('is zero for all defaults', () => {
    expect(activeExploreFilterCount(baseFilters())).toBe(0);
  });

  it('counts each active filter', () => {
    expect(
      activeExploreFilterCount(
        baseFilters({
          preset: 'TRENDING',
          categoryId: 'cat',
          price: 'PAID',
          date: 'WEEK',
          sort: 'PRICE_LOW',
          search: '  hi  ',
        }),
      ),
    ).toBe(6);
  });

  it('ignores whitespace-only search', () => {
    expect(activeExploreFilterCount(baseFilters({ search: '   ' }))).toBe(0);
  });
});
