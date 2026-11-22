import { describe, expect, it } from 'vitest';
import { formatDate } from '@duncit/app-settings';
import { formatScore, formatWeek, isEmptyAnalytics, shareOf, sumCounts } from '@/pages/lead-quality-analytics/analyticsData';
import { analytics, typeStats } from './fixtures';

const row = (key: string, count: number) => ({ __typename: 'CrmLeadQualityCount' as const, key, label: key, count });

describe('sumCounts', () => {
  it('adds up counts that share a key across lead types, in the order they first appear', () => {
    expect(sumCounts([[row('LOW', 1), row('HIGH', 2)], [row('HIGH', 3), row('MID', 4)]]).map(({ key, count }) => [key, count])).toEqual([
      ['LOW', 1],
      ['HIGH', 5],
      ['MID', 4],
    ]);
  });

  it('is empty when there is nothing to add', () => {
    expect(sumCounts([])).toEqual([]);
    expect(sumCounts([[], []])).toEqual([]);
  });
});

describe('formatScore', () => {
  it('rounds to one decimal and shows a dash when nothing was scored', () => {
    expect(formatScore(61.25)).toBe('61.3');
    expect(formatScore(48)).toBe('48');
    expect(formatScore(0)).toBe('0');
    expect(formatScore(null)).toBe('—');
    expect(formatScore(undefined)).toBe('—');
    expect(formatScore(Number.NaN)).toBe('—');
  });
});

describe('shareOf', () => {
  it('is a whole percentage of the total, or null when there is no total', () => {
    expect(shareOf(3, 8)).toBe(38);
    expect(shareOf(0, 5)).toBe(0);
    expect(shareOf(5, 5)).toBe(100);
    expect(shareOf(0, 0)).toBeNull();
  });
});

describe('formatWeek', () => {
  it('reads an ISO week as the date its Monday falls on', () => {
    // ISO week 45 of 2026 starts on Monday 2 November.
    expect(formatWeek('2026-W45')).toBe(formatDate(new Date(2026, 10, 2)));
    expect(formatWeek('2026-W01')).toBe(formatDate(new Date(2025, 11, 29)));
  });

  it('leaves a value it cannot read as it is', () => {
    expect(formatWeek('soon')).toBe('soon');
  });
});

describe('isEmptyAnalytics', () => {
  it('is true only with no lead of the chosen types and nothing in the research queue', () => {
    const noLeads = typeStats('VENUE_LEAD', { total: 0 });
    expect(isEmptyAnalytics(analytics({ by_type: [noLeads], research_queue: [] }))).toBe(true);
    expect(isEmptyAnalytics(analytics({ by_type: [], research_queue: [] }))).toBe(true);
    expect(isEmptyAnalytics(analytics({ by_type: [noLeads] }))).toBe(false);
    expect(isEmptyAnalytics(analytics({ research_queue: [] }))).toBe(false);
  });
});
