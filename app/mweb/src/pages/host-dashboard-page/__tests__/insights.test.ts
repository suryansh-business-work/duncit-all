import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOST_CHART_RANGE,
  allZero,
  buildEarningsBars,
  buildParticipantTrend,
  buildPodsOverTime,
  buildStatusSlices,
  hostRangeMeta,
  hostRangeOptions,
} from '../insights';

const monthsAgoIso = (m: number) => {
  const d = new Date();
  d.setDate(15);
  d.setMonth(d.getMonth() - m);
  return d.toISOString();
};

describe('hostRangeOptions', () => {
  it('adds "All" only when the host has pods', () => {
    expect(hostRangeOptions(false).some(([v]) => v === 'ALL')).toBe(false);
    expect(hostRangeOptions(true)[0][0]).toBe('ALL');
  });
});

describe('hostRangeMeta', () => {
  it('gives a dynamic title + description per range', () => {
    const year = new Date().getFullYear();
    expect(hostRangeMeta('PAST_3_MONTHS').title).toBe('Pods Hosted in Past 3 Months');
    expect(hostRangeMeta('PAST_6_MONTHS').title).toBe('Pods Hosted in Past 6 Months');
    expect(hostRangeMeta('CURRENT_YEAR').title).toBe(`Pods Hosted in ${year}`);
    expect(hostRangeMeta('LAST_YEAR').title).toBe(`Pods Hosted in ${year - 1}`);
    expect(hostRangeMeta('ALL')).toEqual({
      title: 'All Hosted Pods',
      description: 'Your complete Pod hosting history.',
    });
    expect(DEFAULT_HOST_CHART_RANGE).toBe('PAST_6_MONTHS');
  });
});

describe('buildPodsOverTime', () => {
  it('buckets by month within each range, ignoring out-of-window and bad dates', () => {
    const dates = [monthsAgoIso(1), monthsAgoIso(1), monthsAgoIso(24), null, 'bad-date'];
    const six = buildPodsOverTime(dates, 'PAST_6_MONTHS');
    expect(six).toHaveLength(6);
    expect(six.reduce((sum, d) => sum + d.value, 0)).toBe(2);
    expect(buildPodsOverTime(dates, 'PAST_3_MONTHS')).toHaveLength(3);
  });

  it('spans years and the full history, and is empty without pods', () => {
    const y = new Date().getFullYear();
    expect(
      buildPodsOverTime([new Date(y, 2, 10).toISOString()], 'CURRENT_YEAR').reduce((s, d) => s + d.value, 0),
    ).toBe(1);
    expect(
      buildPodsOverTime([new Date(y - 1, 6, 10).toISOString()], 'LAST_YEAR').reduce((s, d) => s + d.value, 0),
    ).toBe(1);
    expect(buildPodsOverTime([], 'ALL')).toEqual([]);
    expect(buildPodsOverTime([monthsAgoIso(2)], 'ALL').reduce((s, d) => s + d.value, 0)).toBe(1);
  });
});

describe('buildParticipantTrend', () => {
  it('sorts by date and counts guests (attendees minus hosts, floored at 0)', () => {
    const trend = buildParticipantTrend([
      { pod_date_time: monthsAgoIso(1), pod_attendees: [1, 2, 3], pod_hosts_id: [1] },
      { pod_date_time: monthsAgoIso(3), pod_attendees: [1], pod_hosts_id: [1, 2] },
      { pod_date_time: null, pod_attendees: [1], pod_hosts_id: [] },
      { pod_date_time: 'bad', pod_attendees: [], pod_hosts_id: [] },
    ]);
    expect(trend).toHaveLength(2);
    expect(trend.map((d) => d.value)).toEqual([0, 2]);
  });
});

describe('buildStatusSlices / buildEarningsBars / allZero', () => {
  it('builds slices, bars and detects empty data', () => {
    const slices = buildStatusSlices({ upcoming: 1, ongoing: 2, completed: 3, cancelled: 4 });
    expect(slices.map((s) => s.label)).toEqual(['Upcoming', 'Ongoing', 'Completed', 'Cancelled']);
    const bars = buildEarningsBars([
      { month: '2026-03', total: 500 },
      { month: 'bad', total: 0 },
    ]);
    expect(bars[0]).toEqual({ label: 'Mar', value: 500 });
    expect(bars[1].value).toBe(0);
    expect(allZero([])).toBe(true);
    expect(allZero([{ value: 0 }])).toBe(true);
    expect(allZero([{ value: 1 }])).toBe(false);
  });
});
