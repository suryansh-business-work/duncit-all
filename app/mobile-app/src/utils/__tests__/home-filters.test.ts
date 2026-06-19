import {
  DATE_OPTIONS,
  DEFAULT_HOME_FILTERS,
  PRICE_OPTIONS,
  SORT_OPTIONS,
  activeFilterCount,
  comparePods,
  matchesDate,
  matchesPrice,
} from '@/utils/home-filters';

describe('home-filters', () => {
  it('exposes the selectable option lists', () => {
    expect(PRICE_OPTIONS.map(([v]) => v)).toEqual(['ALL', 'FREE', 'PAID', 'PREMIUM']);
    expect(DATE_OPTIONS.length).toBe(5);
    expect(SORT_OPTIONS.length).toBe(4);
  });

  describe('activeFilterCount', () => {
    it('is zero for the defaults and no category', () => {
      expect(activeFilterCount(DEFAULT_HOME_FILTERS, '')).toBe(0);
    });

    it('counts each non-default dimension including the category', () => {
      expect(
        activeFilterCount({ price: 'FREE', date: 'TODAY', sort: 'PRICE_ASC' }, 'cat1'),
      ).toBe(4);
    });
  });

  describe('matchesPrice', () => {
    it('lets everything through for ALL', () => {
      expect(matchesPrice({ pod_type: 'NATIVE_PAID' }, 'ALL')).toBe(true);
    });
    it('matches free, paid and premium buckets', () => {
      expect(matchesPrice({ pod_type: 'NATIVE_FREE' }, 'FREE')).toBe(true);
      expect(matchesPrice({ pod_type: 'NATIVE_PAID' }, 'PAID')).toBe(true);
      expect(matchesPrice({ pod_type: 'NON_NATIVE_PAID' }, 'PAID')).toBe(true);
      expect(matchesPrice({ pod_type: 'NATIVE_PAID_PREMIUM' }, 'PREMIUM')).toBe(true);
    });
    it('rejects mismatches and missing types', () => {
      expect(matchesPrice({ pod_type: 'NATIVE_PAID' }, 'FREE')).toBe(false);
      expect(matchesPrice({ pod_type: null }, 'PAID')).toBe(false);
      expect(matchesPrice({}, 'PREMIUM')).toBe(false);
    });
  });

  describe('matchesDate', () => {
    // Build dates from local components so the day-boundary windows (which use
    // local midnight) behave the same regardless of the runner's timezone.
    const local = (y: number, mo: number, d: number, h: number) =>
      new Date(y, mo, d, h, 0, 0).toISOString();
    const now = new Date(2026, 5, 10, 12, 0, 0);
    it('lets everything through for ALL', () => {
      expect(matchesDate(null, 'ALL', now)).toBe(true);
    });
    it('rejects pods without a date for a specific window', () => {
      expect(matchesDate(null, 'TODAY', now)).toBe(false);
      expect(matchesDate(undefined, 'WEEK', now)).toBe(false);
    });
    it('matches today / tomorrow / week / month windows', () => {
      expect(matchesDate(local(2026, 5, 10, 20), 'TODAY', now)).toBe(true);
      expect(matchesDate(local(2026, 5, 11, 9), 'TODAY', now)).toBe(false);
      expect(matchesDate(local(2026, 5, 11, 9), 'TOMORROW', now)).toBe(true);
      expect(matchesDate(local(2026, 5, 12, 9), 'TOMORROW', now)).toBe(false);
      expect(matchesDate(local(2026, 5, 15, 9), 'WEEK', now)).toBe(true);
      expect(matchesDate(local(2026, 5, 25, 9), 'WEEK', now)).toBe(false);
      expect(matchesDate(local(2026, 5, 30, 9), 'MONTH', now)).toBe(true);
      expect(matchesDate(local(2026, 7, 1, 9), 'MONTH', now)).toBe(false);
    });
  });

  describe('comparePods', () => {
    const early = { pod_date_time: '2026-06-01T00:00:00.000Z', pod_amount: 100 };
    const late = { pod_date_time: '2026-06-09T00:00:00.000Z', pod_amount: 50 };
    it('sorts by date ascending by default', () => {
      expect(comparePods(early, late, 'DATE_ASC')).toBeLessThan(0);
    });
    it('sorts by date descending', () => {
      expect(comparePods(early, late, 'DATE_DESC')).toBeGreaterThan(0);
    });
    it('sorts by price ascending and descending', () => {
      expect(comparePods(early, late, 'PRICE_ASC')).toBeGreaterThan(0);
      expect(comparePods(early, late, 'PRICE_DESC')).toBeLessThan(0);
    });
    it('treats missing date/amount as zero', () => {
      expect(comparePods({}, {}, 'DATE_ASC')).toBe(0);
      expect(comparePods({}, {}, 'PRICE_ASC')).toBe(0);
    });
  });
});
