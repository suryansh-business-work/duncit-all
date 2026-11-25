import { describe, expect, it } from 'vitest';
import { crmFormatScore, crmIsEmptyAnalytics, crmIsoWeekMonday, crmShareOf, crmSumCounts } from '../src';

/** Quality Analytics helpers: they combine and format the server's numbers, never invent them. */

describe('crmSumCounts', () => {
  it('adds counts that share a key across lead types, in first-seen order', () => {
    expect(
      crmSumCounts([
        [{ key: 'low', label: '0–39', count: 2 }, { key: 'high', label: '70–100', count: 1 }],
        [{ key: 'high', label: '70–100', count: 3 }, { key: 'mid', label: '40–69', count: 4 }],
      ]),
    ).toEqual([
      { key: 'low', label: '0–39', count: 2 },
      { key: 'high', label: '70–100', count: 4 },
      { key: 'mid', label: '40–69', count: 4 },
    ]);
    expect(crmSumCounts([])).toEqual([]);
  });
});

describe('formatting', () => {
  it('rounds a score to one decimal, and shows the dash when nothing was scored', () => {
    expect(crmFormatScore(72.46, '—')).toBe('72.5');
    expect(crmFormatScore(null, '—')).toBe('—');
    expect(crmFormatScore(Number.NaN, '—')).toBe('—');
  });

  it('gives a whole-number share, or null with nothing to share', () => {
    expect(crmShareOf(1, 3)).toBe(33);
    expect(crmShareOf(1, 0)).toBeNull();
  });
});

describe('crmIsEmptyAnalytics', () => {
  it('is empty only when no lead of the chosen types exists and the research queue is empty', () => {
    expect(crmIsEmptyAnalytics({ by_type: [{ total: 0 }], research_queue: [{ count: 0 }] })).toBe(true);
    expect(crmIsEmptyAnalytics({ by_type: [{ total: 1 }], research_queue: [] })).toBe(false);
    expect(crmIsEmptyAnalytics({ by_type: [{ total: 0 }], research_queue: [{ count: 2 }] })).toBe(false);
  });
});

describe('crmIsoWeekMonday', () => {
  it('finds the Monday an ISO week starts on, including weeks that begin in the previous year', () => {
    expect(crmIsoWeekMonday('2026-W45')).toEqual(new Date(2026, 10, 2));
    expect(crmIsoWeekMonday('2026-W01')).toEqual(new Date(2025, 11, 29));
    expect(crmIsoWeekMonday('2021-W01')).toEqual(new Date(2021, 0, 4));
  });

  it('reads nothing that is not an ISO week', () => {
    expect(crmIsoWeekMonday('2026-45')).toBeNull();
    expect(crmIsoWeekMonday('2026-W00')).toBeNull();
    expect(crmIsoWeekMonday('2026-W54')).toBeNull();
  });
});
