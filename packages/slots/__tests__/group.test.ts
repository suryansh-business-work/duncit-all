import { describe, expect, it } from 'vitest';

import {
  groupSlotsByDay,
  resolveSlotDay,
  slotDayBounds,
  slotDayKeys,
  slotDayLabel,
  slotPriceLabel,
  slotRangeLabel,
  slotSpanLabel,
  slotTileLines,
  slotTimeLabel,
  withCurrentSlot,
} from '../src/group';
import type { CalendarSlot, SlotFormatter } from '../src/types';

/**
 * A formatter fixed to UTC, standing in for `useDateFormat()`. The real one is
 * driven by the admin zone; what matters here is that the helpers ask it rather
 * than reading the device clock themselves.
 */
const NOW = Date.UTC(2026, 7, 10, 9, 0, 0); // 2026-08-10T09:00:00Z

const iso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  const text = String(value ?? '');
  // `slotDayLabel` hands the formatter `${dayKey}T00:00:00` with no zone marker.
  // Pin that to UTC so this UTC-fixed fixture answers the same on any machine —
  // parsed as device-local time it slips a day on every non-UTC box.
  return /T\d{2}:\d{2}:\d{2}$/.test(text) ? `${text}Z` : text;
};

const fmt: SlotFormatter = {
  dayKey: (input) => {
    const ms = new Date(iso(input)).getTime();
    return Number.isNaN(ms) ? '' : new Date(ms).toISOString().slice(0, 10);
  },
  formatDate: (input) => {
    const ms = new Date(iso(input)).getTime();
    return Number.isNaN(ms) ? '' : `D:${new Date(ms).toISOString().slice(0, 10)}`;
  },
  formatTime: (input) => {
    const ms = new Date(iso(input)).getTime();
    return Number.isNaN(ms) ? '' : `T:${new Date(ms).toISOString().slice(11, 16)}`;
  },
  clock: { nowMs: () => NOW },
};

const slot = (over: Partial<CalendarSlot> & { id: string; start_at: string }): CalendarSlot => ({ ...over });

describe('withCurrentSlot', () => {
  const a = slot({ id: 'a', start_at: '2026-08-10T10:00:00Z' });
  const b = slot({ id: 'b', start_at: '2026-08-10T12:00:00Z' });

  it('re-offers the pod’s own booked slot, so editing does not clear a valid choice', () => {
    expect(withCurrentSlot([a], b)).toEqual([b, a]);
  });

  it('does not duplicate a slot the venue still lists', () => {
    expect(withCurrentSlot([a, b], a)).toEqual([a, b]);
  });

  it('returns a copy of the available list when there is no current slot', () => {
    const available = [a, b];

    expect(withCurrentSlot(available, null)).toEqual(available);
    expect(withCurrentSlot(available, null)).not.toBe(available);
    expect(withCurrentSlot(available, undefined)).toEqual(available);
  });
});

describe('groupSlotsByDay', () => {
  const slots = [
    slot({ id: '3', start_at: '2026-08-11T09:00:00Z' }),
    slot({ id: '1', start_at: '2026-08-10T18:00:00Z' }),
    slot({ id: '2', start_at: '2026-08-10T08:00:00Z' }),
  ];

  it('buckets into ascending days with each day ordered by start time', () => {
    expect(groupSlotsByDay(slots, fmt)).toEqual([
      { key: '2026-08-10', slots: [slots[2], slots[1]] },
      { key: '2026-08-11', slots: [slots[0]] },
    ]);
  });

  it('drops a slot whose start_at cannot be parsed rather than creating a blank day', () => {
    const days = groupSlotsByDay([...slots, slot({ id: 'x', start_at: 'not-a-date' })], fmt);

    expect(days.map((d) => d.key)).toEqual(['2026-08-10', '2026-08-11']);
  });

  it('returns nothing for an empty list', () => {
    expect(groupSlotsByDay([], fmt)).toEqual([]);
  });
});

describe('resolveSlotDay', () => {
  const days = groupSlotsByDay(
    [
      slot({ id: 'a', start_at: '2026-08-10T08:00:00Z' }),
      slot({ id: 'b', start_at: '2026-08-12T08:00:00Z' }),
    ],
    fmt
  );

  it('lets an explicit tap win over everything else', () => {
    expect(resolveSlotDay(days, 'b', '2026-08-10').activeDay).toBe('2026-08-10');
  });

  it('falls back to the day of the current selection, so an edit form opens where the booking is', () => {
    const { activeDay, daySlots } = resolveSlotDay(days, 'b', null);

    expect(activeDay).toBe('2026-08-12');
    expect(daySlots.map((s) => s.id)).toEqual(['b']);
  });

  it('falls back to the first day with slots', () => {
    expect(resolveSlotDay(days, '', null).activeDay).toBe('2026-08-10');
  });

  it('falls back to the first day when the selected slot is no longer offered', () => {
    expect(resolveSlotDay(days, 'gone', null).activeDay).toBe('2026-08-10');
  });

  it('answers empty rather than crashing when there are no days at all', () => {
    expect(resolveSlotDay([], 'a', null)).toEqual({ activeDay: '', daySlots: [] });
  });

  it('answers no slots for a tapped day that holds none', () => {
    expect(resolveSlotDay(days, '', '2026-08-11').daySlots).toEqual([]);
  });
});

describe('slotDayKeys', () => {
  it('lists the days a calendar should enable', () => {
    const days = groupSlotsByDay([slot({ id: 'a', start_at: '2026-08-10T08:00:00Z' })], fmt);

    expect(slotDayKeys(days)).toEqual(new Set(['2026-08-10']));
    expect(slotDayKeys([])).toEqual(new Set());
  });
});

describe('slotDayBounds', () => {
  it('bounds the calendar by the data, so it cannot page into empty months', () => {
    const days = groupSlotsByDay(
      [
        slot({ id: 'a', start_at: '2026-08-10T08:00:00Z' }),
        slot({ id: 'b', start_at: '2026-10-01T08:00:00Z' }),
      ],
      fmt
    );

    expect(slotDayBounds(days)).toEqual({ first: '2026-08-10', last: '2026-10-01' });
  });

  it('stays correct for an unsorted list', () => {
    expect(
      slotDayBounds([
        { key: '2026-09-01', slots: [] },
        { key: '2026-12-01', slots: [] },
        { key: '2026-10-01', slots: [] },
      ])
    ).toEqual({ first: '2026-09-01', last: '2026-12-01' });
  });

  it('is null when there is nothing to bound', () => {
    expect(slotDayBounds([])).toBeNull();
  });
});

describe('slotDayLabel', () => {
  const labels = { today: 'Today', tomorrow: 'Tomorrow' };

  it('names today and tomorrow relative to the formatter clock, not the device', () => {
    expect(slotDayLabel('2026-08-10', fmt, labels)).toBe('Today');
    expect(slotDayLabel('2026-08-11', fmt, labels)).toBe('Tomorrow');
  });

  it('uses the admin date format for any other day', () => {
    expect(slotDayLabel('2026-08-14', fmt, labels)).toBe('D:2026-08-14');
  });

  it('renders nothing for an empty day key', () => {
    expect(slotDayLabel('', fmt, labels)).toBe('');
  });
});

describe('slotTimeLabel / slotRangeLabel', () => {
  it('formats a start time through the admin time format', () => {
    expect(slotTimeLabel('2026-08-10T10:00:00Z', fmt)).toBe('T:10:00');
  });

  it('joins start and end with an en dash', () => {
    expect(slotRangeLabel('2026-08-10T10:00:00Z', '2026-08-10T12:00:00Z', fmt)).toBe('T:10:00 – T:12:00');
  });

  it('shows just the start when the slot has no end', () => {
    expect(slotRangeLabel('2026-08-10T10:00:00Z', null, fmt)).toBe('T:10:00');
    expect(slotRangeLabel('2026-08-10T10:00:00Z', undefined, fmt)).toBe('T:10:00');
  });
});

describe('slotSpanLabel', () => {
  it('reads as one day when start and end share a day', () => {
    expect(slotSpanLabel('2026-08-10T10:00:00Z', '2026-08-10T18:00:00Z', false, fmt, 'Whole day')).toBe(
      'D:2026-08-10, T:10:00 – T:18:00'
    );
  });

  it('names both dates when the slot spans days', () => {
    expect(slotSpanLabel('2026-08-10T10:00:00Z', '2026-08-12T18:00:00Z', false, fmt, 'Whole day')).toBe(
      'D:2026-08-10, T:10:00 – D:2026-08-12, T:18:00'
    );
  });

  it('treats an end exactly at midnight as claiming no extra day', () => {
    expect(slotSpanLabel('2026-08-10T10:00:00Z', '2026-08-11T00:00:00Z', false, fmt, 'Whole day')).toBe(
      'D:2026-08-10, T:10:00 – T:00:00'
    );
  });

  it('drops the clock times for a whole-day booking', () => {
    expect(slotSpanLabel('2026-08-10T00:00:00Z', '2026-08-11T00:00:00Z', true, fmt, 'Whole day')).toBe(
      'Whole day · D:2026-08-10'
    );
    expect(slotSpanLabel('2026-08-10T00:00:00Z', '2026-08-13T00:00:00Z', true, fmt, 'Whole day')).toBe(
      'Whole day · D:2026-08-10 – D:2026-08-13'
    );
  });

  it('still names the start when the end date is unparseable, rather than throwing', () => {
    // An unparseable end has no day key, so it cannot match the start's — the
    // label degrades to the multi-day form with the unknown half left blank.
    expect(slotSpanLabel('2026-08-10T10:00:00Z', 'nonsense', undefined, fmt, 'Whole day')).toBe(
      'D:2026-08-10, T:10:00 – , '
    );
  });
});

describe('slotTileLines', () => {
  const labels = { free: 'Free', wholeDay: 'Whole day' };

  it('leads with the start time and shows the price', () => {
    expect(
      slotTileLines(slot({ id: 'a', start_at: '2026-08-10T10:00:00Z', price: 250 }), fmt, labels, true)
    ).toEqual({ headline: 'T:10:00', secondary: '₹250' });
  });

  it('leads with the whole-day label instead of a clock time', () => {
    expect(
      slotTileLines(slot({ id: 'a', start_at: '2026-08-10T00:00:00Z', whole_day: true }), fmt, labels, false)
    ).toEqual({ headline: 'Whole day', secondary: '' });
  });

  it('adds the date range on the second line for a multi-day slot', () => {
    const lines = slotTileLines(
      slot({ id: 'a', start_at: '2026-08-10T10:00:00Z', end_at: '2026-08-12T18:00:00Z', caption: 'Court 2' }),
      fmt,
      labels,
      false
    );

    expect(lines.secondary).toBe('D:2026-08-10 – D:2026-08-12 · Court 2');
  });

  it('shows the caption when there is no price to show', () => {
    expect(
      slotTileLines(slot({ id: 'a', start_at: '2026-08-10T10:00:00Z', caption: 'Currently booked' }), fmt, labels, false)
        .secondary
    ).toBe('Currently booked');
  });

  it('prefers the price over the caption when prices are shown', () => {
    expect(
      slotTileLines(
        slot({ id: 'a', start_at: '2026-08-10T10:00:00Z', price: 100, caption: 'Court 2' }),
        fmt,
        labels,
        true
      ).secondary
    ).toBe('₹100');
  });

  it('shows the free label for a zero-price slot', () => {
    expect(
      slotTileLines(slot({ id: 'a', start_at: '2026-08-10T10:00:00Z', price: 0 }), fmt, labels, true).secondary
    ).toBe('Free');
  });

  it('ignores an unparseable end instead of claiming a span', () => {
    expect(
      slotTileLines(slot({ id: 'a', start_at: '2026-08-10T10:00:00Z', end_at: 'nope' }), fmt, labels, false).secondary
    ).toBe('');
  });
});

describe('slotPriceLabel', () => {
  it('groups in the Indian numbering system', () => {
    expect(slotPriceLabel(125_000, 'Free')).toBe('₹1,25,000');
  });

  it.each([[0], [null], [undefined], [-5]])('shows the injected free label for %j', (price) => {
    expect(slotPriceLabel(price, 'Free')).toBe('Free');
  });

  it('takes the currency symbol from the caller', () => {
    expect(slotPriceLabel(50, 'Free', '$')).toBe('$50');
  });
});
