import { describe, expect, it } from 'vitest';
import {
  POD_SERIES_FREQUENCIES,
  POD_SERIES_SKIP_REASON_KEY,
  buildPodSeriesPlan,
  groupSlotRequestsBySeries,
  endOfDayInZone,
  type PodSeriesPlanSource,
} from '../src/pod-series';

const physical: PodSeriesPlanSource = {
  repeat_enabled: true,
  repeat_frequency: 'WEEKLY',
  repeat_ends_on: '2026-12-31',
  repeat_skip_dates: ['2026-11-12T13:30:00.000Z'],
  repeat_discount_tiers: [{ min_dates: 3, discount_pct: 10 }],
  pod_mode: 'PHYSICAL',
  venue_id: 'venue-1',
  venue_slot_id: 'slot-1',
  pod_date_time: '2026-11-05T13:30:00.000Z',
  pod_end_date_time: '2026-11-05T15:30:00.000Z',
};

describe('endOfDayInZone', () => {
  it('is the last millisecond of the day on the zone’s own clock', () => {
    // 23:59:59.999 in Kolkata (UTC+5:30) is 18:29:59.999 UTC the same day.
    expect(endOfDayInZone('2026-12-31', 'Asia/Kolkata')).toBe('2026-12-31T18:29:59.999Z');
    // And a zone behind UTC lands on the next UTC day.
    expect(endOfDayInZone('2026-07-01', 'America/New_York')).toBe('2026-07-02T03:59:59.999Z');
  });

  it('reads an unknown zone as UTC instead of throwing', () => {
    expect(endOfDayInZone('2026-12-31', 'Not/AZone')).toBe('2026-12-31T23:59:59.999Z');
  });

  it('refuses anything that is not a calendar day', () => {
    expect(endOfDayInZone('31/12/2026', 'Asia/Kolkata')).toBeNull();
    expect(endOfDayInZone('', 'Asia/Kolkata')).toBeNull();
  });
});

describe('buildPodSeriesPlan', () => {
  it('asks about the first slot for a physical pod and leaves its times to the slot', () => {
    expect(buildPodSeriesPlan(physical, 'Asia/Kolkata')).toEqual({
      pod_mode: 'PHYSICAL',
      venue_id: 'venue-1',
      venue_slot_id: 'slot-1',
      pod_date_time: null,
      pod_end_date_time: null,
      frequency: 'WEEKLY',
      ends_on: '2026-12-31T18:29:59.999Z',
      skip_dates: ['2026-11-12T13:30:00.000Z'],
      multi_date_discount_tiers: [{ min_dates: 3, discount_pct: 10 }],
    });
  });

  it('sends no multi-date discount when the host switched it off', () => {
    expect(buildPodSeriesPlan({ ...physical, repeat_discount_tiers: [] }, 'UTC')?.multi_date_discount_tiers).toEqual(
      []
    );
  });

  it('asks about the first window for a virtual pod and sends no venue', () => {
    const plan = buildPodSeriesPlan({ ...physical, pod_mode: 'VIRTUAL', venue_slot_id: '' }, 'UTC');
    expect(plan).toMatchObject({
      pod_mode: 'VIRTUAL',
      venue_id: null,
      venue_slot_id: null,
      pod_date_time: '2026-11-05T13:30:00.000Z',
      pod_end_date_time: '2026-11-05T15:30:00.000Z',
    });
  });

  it('has no plan while repeat is off or the plan is incomplete', () => {
    expect(buildPodSeriesPlan({ ...physical, repeat_enabled: false }, 'UTC')).toBeNull();
    expect(buildPodSeriesPlan({ ...physical, repeat_ends_on: '' }, 'UTC')).toBeNull();
    expect(buildPodSeriesPlan({ ...physical, venue_slot_id: '' }, 'UTC')).toBeNull();
    expect(buildPodSeriesPlan({ ...physical, pod_mode: 'VIRTUAL', pod_date_time: null }, 'UTC')).toBeNull();
  });

  it('sends a physical pod with no venue picked as a null venue, not an empty id', () => {
    expect(buildPodSeriesPlan({ ...physical, venue_id: '' }, 'UTC')?.venue_id).toBeNull();
  });
});

describe('copy tables', () => {
  it('offers every frequency the server accepts, once each', () => {
    expect(POD_SERIES_FREQUENCIES.map((f) => f.value)).toEqual(['DAILY', 'WEEKLY', 'BIWEEKLY']);
  });

  it('names every reason a date can be skipped', () => {
    expect(Object.keys(POD_SERIES_SKIP_REASON_KEY).sort()).toEqual(
      ['FAILED', 'HOLIDAY', 'NO_SLOT', 'REMOVED_BY_HOST', 'TAKEN'].sort()
    );
  });
});

describe('groupSlotRequestsBySeries', () => {
  const row = (slot_id: string, start_at: string, series_id: string | null = null) => ({ slot_id, start_at, series_id });
  const key = (r: { slot_id: string }) => r.slot_id;

  it('folds a series into one group, its dates in order, where its first row sat', () => {
    const groups = groupSlotRequestsBySeries(
      [
        row('a', '2026-11-03T10:00:00.000Z'),
        row('s2', '2026-11-12T13:30:00.000Z', 'S'),
        row('b', '2026-11-04T10:00:00.000Z'),
        row('s1', '2026-11-05T13:30:00.000Z', 'S'),
      ],
      key
    );
    expect(groups.map((g) => g.key)).toEqual(['a', 'series-S', 'b']);
    const series = groups[1];
    expect(series.kind).toBe('SERIES');
    if (series.kind === 'SERIES') {
      expect(series.seriesId).toBe('S');
      expect(series.rows.map((r) => r.slot_id)).toEqual(['s1', 's2']);
    }
  });

  it('shows a series with one pending date left as an ordinary request', () => {
    const groups = groupSlotRequestsBySeries([row('s1', '2026-11-05T13:30:00.000Z', 'S')], key);
    expect(groups).toEqual([{ kind: 'SINGLE', key: 's1', row: row('s1', '2026-11-05T13:30:00.000Z', 'S') }]);
  });

  it('keeps two different series apart', () => {
    const groups = groupSlotRequestsBySeries(
      [
        row('x1', '2026-11-01T10:00:00.000Z', 'X'),
        row('y1', '2026-11-01T12:00:00.000Z', 'Y'),
        row('x2', '2026-11-08T10:00:00.000Z', 'X'),
        row('y2', '2026-11-08T12:00:00.000Z', 'Y'),
      ],
      key
    );
    expect(groups.map((g) => g.key)).toEqual(['series-X', 'series-Y']);
  });
});
