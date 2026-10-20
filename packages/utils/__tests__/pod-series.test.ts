import { describe, expect, it } from 'vitest';
import {
  POD_SERIES_FREQUENCIES,
  POD_SERIES_SKIP_REASON_KEY,
  buildPodSeriesPlan,
  groupSlotRequestsBySeries,
  endOfDayInZone,
  startOfDayInZone,
  customDateStart,
  ymdInZone,
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

describe('startOfDayInZone', () => {
  it('is local midnight of the day on the zone’s own clock, as epoch ms', () => {
    // 00:00 in Kolkata (UTC+5:30) is 18:30 UTC the day before.
    expect(startOfDayInZone('2026-11-05', 'Asia/Kolkata')).toBe(Date.parse('2026-11-04T18:30:00.000Z'));
    // A zone behind UTC (EDT, UTC-4) starts its day later on the UTC clock.
    expect(startOfDayInZone('2026-07-01', 'America/New_York')).toBe(Date.parse('2026-07-01T04:00:00.000Z'));
    expect(startOfDayInZone(' 2026-11-05 ', 'UTC')).toBe(Date.parse('2026-11-05T00:00:00.000Z'));
  });

  it('is NaN for anything that is not a calendar day', () => {
    expect(startOfDayInZone('05/11/2026', 'Asia/Kolkata')).toBeNaN();
    expect(startOfDayInZone('', 'Asia/Kolkata')).toBeNaN();
  });
});

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
      custom_dates: [],
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

  it('sends an instant venue booking for the first date in place of a slot', () => {
    const booking = { start_at: '2026-11-05T13:30:00.000Z', end_at: '2026-11-05T15:30:00.000Z', space_label: '' };
    const plan = buildPodSeriesPlan({ ...physical, venue_slot_id: '', venue_booking: booking }, 'UTC');
    expect(plan).toMatchObject({ venue_id: 'venue-1', venue_slot_id: null, venue_booking: booking, pod_date_time: null });
    // A picked slot wins: the booking is not sent beside it.
    expect(buildPodSeriesPlan({ ...physical, venue_booking: booking }, 'UTC')).not.toHaveProperty('venue_booking');
  });

  it('sends a physical pod with no venue picked as a null venue, not an empty id', () => {
    expect(buildPodSeriesPlan({ ...physical, venue_id: '' }, 'UTC')?.venue_id).toBeNull();
  });

  it('sends the calendar picks of a CUSTOM pod at the first date\'s time, and skips nothing', () => {
    const plan = buildPodSeriesPlan(
      { ...physical, repeat_frequency: 'CUSTOM', repeat_custom_days: ['2026-11-09', 'not-a-day', '2026-11-20'] },
      'Asia/Kolkata'
    );
    expect(plan?.custom_dates).toEqual(['2026-11-09T13:30:00.000Z', '2026-11-20T13:30:00.000Z']);
    expect(plan?.skip_dates).toEqual([]);
  });

  it('sends a CUSTOM pod with no days picked yet as no extra dates, and still skips nothing', () => {
    const plan = buildPodSeriesPlan({ ...physical, repeat_frequency: 'CUSTOM' }, 'UTC');
    expect(plan?.custom_dates).toEqual([]);
    expect(plan?.skip_dates).toEqual([]);
  });

  it('sends no custom dates while a physical CUSTOM pod has no first start yet, keeping its skips', () => {
    const plan = buildPodSeriesPlan(
      { ...physical, repeat_frequency: 'CUSTOM', pod_date_time: null, repeat_custom_days: ['2026-11-09'] },
      'UTC'
    );
    expect(plan?.custom_dates).toEqual([]);
    expect(plan?.skip_dates).toEqual(['2026-11-12T13:30:00.000Z']);
  });

  it('sends no custom dates for a stepping frequency', () => {
    const plan = buildPodSeriesPlan({ ...physical, repeat_custom_days: ['2026-11-09'] }, 'UTC');
    expect(plan?.custom_dates).toEqual([]);
  });
});

describe('ymdInZone', () => {
  it('reads the day on the zone\'s own clock, not UTC', () => {
    // 20:00 UTC on 4 Nov is already 5 Nov in Kolkata (+05:30).
    expect(ymdInZone('2026-11-04T20:00:00.000Z', 'Asia/Kolkata')).toBe('2026-11-05');
    expect(ymdInZone('2026-11-04T20:00:00.000Z', 'UTC')).toBe('2026-11-04');
  });

  it('refuses an instant that is not one', () => {
    expect(ymdInZone('soon', 'UTC')).toBeNull();
  });
});

describe('customDateStart', () => {
  it('keeps the first date\'s wall-clock time on the picked day', () => {
    // First date 7 PM IST on 5 Nov; 12 Dec at 7 PM IST.
    expect(customDateStart('2026-11-05T13:30:00.000Z', '2026-12-12', 'Asia/Kolkata')).toBe('2026-12-12T13:30:00.000Z');
  });

  it('counts days in the zone when the first date crosses UTC midnight', () => {
    // 2 AM IST on 6 Nov is 20:30 UTC on 5 Nov; the 8th is two days later.
    expect(customDateStart('2026-11-05T20:30:00.000Z', '2026-11-08', 'Asia/Kolkata')).toBe('2026-11-07T20:30:00.000Z');
  });

  it('refuses a day that is not a calendar day', () => {
    expect(customDateStart('2026-11-05T13:30:00.000Z', '12/12/2026', 'UTC')).toBeNull();
  });

  it('refuses a first date that is not an instant', () => {
    expect(customDateStart('soon', '2026-12-12', 'UTC')).toBeNull();
  });
});

describe('copy tables', () => {
  it('offers every frequency the server accepts, once each', () => {
    expect(POD_SERIES_FREQUENCIES.map((f) => f.value)).toEqual(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']);
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
