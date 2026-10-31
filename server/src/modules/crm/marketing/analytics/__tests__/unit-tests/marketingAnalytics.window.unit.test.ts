import { countsIn, median, percent, seriesOf, windowOf } from '../../marketingAnalytics.window';

describe('windowOf', () => {
  it('reads two calendar days in the admin zone, both included', () => {
    const window = windowOf({ from: '2026-10-01', to: '2026-10-03' });
    // Asia/Kolkata is UTC+5:30, so the 1st starts at 18:30 UTC on the 30th.
    expect(window.start.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(window.end.toISOString()).toBe('2026-10-03T18:30:00.000Z');
    expect(window.days).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(window.platforms).toEqual([]);
    expect(window.zone).toBe('Asia/Kolkata');
  });

  it('keeps a one-day window and the asked networks, once each', () => {
    const window = windowOf({ from: '2026-10-05', to: '2026-10-05', platforms: ['INSTAGRAM', 'X', 'INSTAGRAM'] });
    expect(window.days).toEqual(['2026-10-05']);
    expect(window.platforms).toEqual(['INSTAGRAM', 'X']);
  });

  it('refuses a day that is not yyyy-MM-dd or does not exist', () => {
    expect(() => windowOf({ from: '01/10/2026', to: '2026-10-03' })).toThrow('from must be a day written yyyy-MM-dd.');
    expect(() => windowOf({ from: '2026-10-01', to: '2026-02-30' })).toThrow('to must be a day written yyyy-MM-dd.');
  });

  it('refuses a window that ends before it starts', () => {
    expect(() => windowOf({ from: '2026-10-05', to: '2026-10-04' })).toThrow('The window ends before it starts.');
  });

  it('allows 366 days and refuses 367', () => {
    expect(windowOf({ from: '2025-10-01', to: '2026-10-01' }).days).toHaveLength(366);
    expect(() => windowOf({ from: '2025-09-30', to: '2026-10-01' })).toThrow('Pick at most 366 days.');
  });

  it('refuses a network it does not know', () => {
    expect(() => windowOf({ from: '2026-10-01', to: '2026-10-02', platforms: ['MYSPACE'] })).toThrow('Unknown network: MYSPACE.');
  });

  it('answers BAD_USER_INPUT', () => {
    try {
      windowOf({ from: 'x', to: 'y' });
      throw new Error('expected a refusal');
    } catch (error) {
      expect((error as { extensions?: { code?: string } }).extensions?.code).toBe('BAD_USER_INPUT');
    }
  });
});

describe('median', () => {
  it('is 0 for nothing, the middle for an odd count and the mean of the middle two for an even one', () => {
    expect(median([])).toBe(0);
    expect(median([9, 1, 5])).toBe(5);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('percent', () => {
  it('rounds to one decimal and reads an empty whole as 0', () => {
    expect(percent(1, 3)).toBe(33.3);
    expect(percent(5, 0)).toBe(0);
  });
});

describe('seriesOf and countsIn', () => {
  it('lays per-day rows on the window, 0 for a day with nothing', () => {
    const window = windowOf({ from: '2026-10-01', to: '2026-10-03' });
    expect(seriesOf(window, [{ _id: '2026-10-03', value: 4 }, { _id: '2026-09-30', value: 9 }])).toEqual([0, 0, 4]);
  });

  it('keeps the given order and fills the missing codes with 0', () => {
    expect(countsIn(['A', 'B', 'C'], [{ _id: 'C', count: 2 }, { _id: null, count: 7 }])).toEqual([
      { key: 'A', count: 0 },
      { key: 'B', count: 0 },
      { key: 'C', count: 2 },
    ]);
  });
});
