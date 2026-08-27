/**
 * The Host Studio chart data. A host reads these numbers beside the money the
 * settlement pays out, so mWeb and the app have to produce identical series —
 * which is why the helpers moved here from two near-identical copies.
 *
 * `now` is injected everywhere a window is computed, so a suite run on 31
 * December does not disagree with one run on 1 January.
 */
import { describe, expect, it } from 'vitest';

import {
  allZero,
  buildEarningsBars,
  buildParticipantTrend,
  buildPodsOverTime,
  buildStatusSlices,
  DEFAULT_HOST_CHART_RANGE,
  hostRangeMeta,
  hostRangeOptions,
  type StatusPalette,
} from '../src';

/** Hands back the key with its vars applied, so a wrong key fails loudly. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) => {
  const vars = options?.vars ?? {};
  return Object.entries(vars).reduce<string>(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
    key,
  );
};

/** The same four tokens both surfaces pass in from @duncit/auth-tokens. */
const palette: StatusPalette = {
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
  error: '#ef4444',
};

const NOW = new Date(2026, 7, 27); // 27 Aug 2026 — local time, as the charts bucket

const monthsBefore = (m: number) => new Date(2026, 7 - m, 15).toISOString();

describe('DEFAULT_HOST_CHART_RANGE', () => {
  it('opens on the past six months', () => {
    expect(DEFAULT_HOST_CHART_RANGE).toBe('PAST_6_MONTHS');
  });
});

describe('hostRangeOptions', () => {
  it('offers "All" only once the host has a pod — an empty history has no range', () => {
    expect(hostRangeOptions(false, t, NOW).some(([value]) => value === 'ALL')).toBe(false);
    expect(hostRangeOptions(true, t, NOW)[0]?.[0]).toBe('ALL');
  });

  it('names the two year windows with real years', () => {
    const labels = Object.fromEntries(hostRangeOptions(false, t, NOW));
    expect(labels.LAST_YEAR).toBe('mweb.hostDashboard.insights.rangeLastYear');
    expect(labels.CURRENT_YEAR).toBe('mweb.hostDashboard.insights.rangeCurrentYear');
  });

  it('lists every range exactly once', () => {
    const values = hostRangeOptions(true, t, NOW).map(([value]) => value);
    expect(values).toEqual(['ALL', 'LAST_YEAR', 'CURRENT_YEAR', 'PAST_6_MONTHS', 'PAST_3_MONTHS']);
  });
});

describe('hostRangeMeta', () => {
  it('titles each range through the catalogue rather than a literal', () => {
    expect(hostRangeMeta('PAST_3_MONTHS', t, NOW).title).toBe(
      'mweb.hostDashboard.insights.titlePast3',
    );
    expect(hostRangeMeta('PAST_6_MONTHS', t, NOW).title).toBe(
      'mweb.hostDashboard.insights.titlePast6',
    );
    expect(hostRangeMeta('ALL', t, NOW).title).toBe('mweb.hostDashboard.insights.titleAll');
  });

  it('interpolates the year for the two year windows', () => {
    const current = hostRangeMeta('CURRENT_YEAR', (key, o) => `${key}:${o?.vars?.year}`, NOW);
    const last = hostRangeMeta('LAST_YEAR', (key, o) => `${key}:${o?.vars?.year}`, NOW);
    expect(current.title).toBe('mweb.hostDashboard.insights.titleYear:2026');
    expect(last.title).toBe('mweb.hostDashboard.insights.titleYear:2025');
    expect(current.description).toBe('mweb.hostDashboard.insights.descYear:2026');
  });

  it('carries a description for every range', () => {
    for (const range of ['ALL', 'LAST_YEAR', 'CURRENT_YEAR', 'PAST_6_MONTHS', 'PAST_3_MONTHS'] as const) {
      expect(hostRangeMeta(range, t, NOW).description, range).toBeTruthy();
    }
  });
});

describe('buildPodsOverTime', () => {
  it('buckets by month and keeps empty months at zero', () => {
    const series = buildPodsOverTime([monthsBefore(0), monthsBefore(0), monthsBefore(2)], 'PAST_6_MONTHS', NOW);
    expect(series).toHaveLength(6);
    expect(series.at(-1)?.value).toBe(2);
    expect(series.at(-3)?.value).toBe(1);
    expect(series.at(-2)?.value).toBe(0);
  });

  it('spans three months for the short window', () => {
    expect(buildPodsOverTime([monthsBefore(0)], 'PAST_3_MONTHS', NOW)).toHaveLength(3);
  });

  it('spans the whole calendar year for either year window', () => {
    expect(buildPodsOverTime([monthsBefore(0)], 'CURRENT_YEAR', NOW)).toHaveLength(12);
    expect(buildPodsOverTime([monthsBefore(0)], 'LAST_YEAR', NOW)).toHaveLength(12);
  });

  it('runs ALL from the host’s first pod to today', () => {
    const series = buildPodsOverTime([monthsBefore(2), monthsBefore(0)], 'ALL', NOW);
    expect(series).toHaveLength(3);
    expect(series[0]?.value).toBe(1);
  });

  it('returns nothing for ALL when there are no pods — the caller shows the empty state', () => {
    expect(buildPodsOverTime([], 'ALL', NOW)).toEqual([]);
  });

  it('ignores nulls and unparseable dates rather than charting NaN', () => {
    const series = buildPodsOverTime([null, undefined, 'not-a-date', monthsBefore(0)], 'PAST_3_MONTHS', NOW);
    expect(series.at(-1)?.value).toBe(1);
  });
});

describe('buildParticipantTrend', () => {
  const pod = (iso: string, attendees: number, hosts = 1) => ({
    pod_date_time: iso,
    pod_attendees: Array.from({ length: attendees }, (_, i) => `u${i}`),
    pod_hosts_id: Array.from({ length: hosts }, (_, i) => `h${i}`),
  });

  it('counts seats minus the host(s) — the basis the settlement is priced on', () => {
    const trend = buildParticipantTrend([pod(monthsBefore(0), 5)]);
    expect(trend[0]?.value).toBe(4);
  });

  it('never goes below zero when a pod holds only its hosts', () => {
    expect(buildParticipantTrend([pod(monthsBefore(0), 1, 2)])[0]?.value).toBe(0);
  });

  it('sorts by pod date without mutating the caller’s array', () => {
    const input = [pod(monthsBefore(0), 3), pod(monthsBefore(2), 5)];
    const first = input[0];
    const trend = buildParticipantTrend(input);
    expect(trend[0]?.value).toBe(4);
    expect(input[0]).toBe(first);
  });

  it('drops pods with no date or an unparseable one', () => {
    expect(buildParticipantTrend([{ pod_date_time: null }, { pod_date_time: 'nope' }])).toEqual([]);
  });

  it('treats a missing host list as no hosts to subtract', () => {
    expect(buildParticipantTrend([{ pod_date_time: monthsBefore(0), pod_attendees: ['a', 'b'] }])[0]?.value).toBe(2);
  });
});

describe('buildStatusSlices', () => {
  const counts = { upcoming: 3, ongoing: 1, completed: 8, cancelled: 2 };

  it('maps each state onto the injected palette, in donut order', () => {
    expect(buildStatusSlices(counts, palette, t)).toEqual([
      { label: 'mweb.hostDashboard.insights.statusUpcoming', value: 3, color: '#f59e0b' },
      { label: 'mweb.hostDashboard.insights.statusOngoing', value: 1, color: '#22c55e' },
      { label: 'mweb.hostDashboard.insights.statusCompleted', value: 8, color: '#3b82f6' },
      { label: 'mweb.hostDashboard.insights.statusCancelled', value: 2, color: '#ef4444' },
    ]);
  });

  it('takes the palette from the caller, so the two surfaces cannot drift on colour', () => {
    const other = { warning: '#000', success: '#111', info: '#222', error: '#333' };
    expect(buildStatusSlices(counts, other, t).map((s) => s.color)).toEqual([
      '#000',
      '#111',
      '#222',
      '#333',
    ]);
  });
});

describe('buildEarningsBars', () => {
  it('labels each bucket by short month name', () => {
    expect(
      buildEarningsBars([
        { month: '2026-08', total: 4200 },
        { month: '2026-09', total: 0 },
      ]),
    ).toEqual([
      { label: 'Aug', value: 4200 },
      { label: 'Sep', value: 0 },
    ]);
  });

  it('survives a malformed bucket rather than charting NaN', () => {
    expect(buildEarningsBars([{ month: 'nonsense', total: 10 }])[0]?.value).toBe(10);
  });
});

describe('allZero', () => {
  it('is what drives the empty state', () => {
    expect(allZero([{ value: 0 }, { value: 0 }])).toBe(true);
    expect(allZero([{ value: 0 }, { value: 1 }])).toBe(false);
    expect(allZero([])).toBe(true);
  });
});
