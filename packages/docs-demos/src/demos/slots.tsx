import {
  groupSlotsByDay,
  slotPriceLabel,
  slotRangeLabel,
  slotSpanLabel,
  slotTileLines,
  type CalendarSlot,
  type SlotFormatter,
} from '@duncit/slots';
import { defineDemo, defineDemos } from '../types';

interface SlotsMock {
  time_zone: string;
  slots: CalendarSlot[];
}

/**
 * The formatter a surface injects. In an app it comes from `@duncit/datetime`,
 * carrying the admin's configured zone and format; here it is pinned so the
 * demo reads the same for everyone.
 */
const formatterFor = (timeZone: string): SlotFormatter => {
  const time = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', timeZone });
  const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone });
  const day = new Intl.DateTimeFormat('en-CA', { timeZone });
  return {
    dayKey: (input) => day.format(new Date(input as string)),
    formatDate: (input) => date.format(new Date(input as string)),
    formatTime: (input) => time.format(new Date(input as string)),
    clock: { nowMs: () => Date.parse('2026-09-14T06:00:00.000Z') },
  };
};

export default defineDemos('slots', [
  defineDemo<SlotsMock>({
    id: 'grouping',
    title: 'Venue slots, grouped into the days a picker shows',
    note:
      "Set whole_day true on a slot and its tile stops showing a clock time. Change time_zone to 'America/New_York' and slots move between days — which is exactly the bug the shared day key exists to stop.",
    mock: {
      time_zone: 'Asia/Kolkata',
      slots: [
        {
          id: 'slot-1',
          start_at: '2026-09-14T12:30:00.000Z',
          end_at: '2026-09-14T14:00:00.000Z',
          price: 1200,
          caption: 'Court 2',
        },
        {
          id: 'slot-2',
          start_at: '2026-09-14T15:00:00.000Z',
          end_at: '2026-09-14T16:30:00.000Z',
          price: 0,
          caption: 'Court 3',
        },
        {
          id: 'slot-3',
          start_at: '2026-09-15T03:30:00.000Z',
          end_at: '2026-09-15T18:30:00.000Z',
          whole_day: true,
          price: 8000,
          caption: 'Whole turf',
        },
      ],
    },
    compute: (mock) => {
      const fmt = formatterFor(mock.time_zone);
      const labels = { free: 'Free', wholeDay: 'Whole day' };
      const days = groupSlotsByDay(mock.slots, fmt);
      return {
        'Days rendered': days.map((day) => `${day.key} — ${day.slots.length} slot(s)`),
        'Tile lines': mock.slots.map((slot) => slotTileLines(slot, fmt, labels, true)),
        'Range label of the first slot': slotRangeLabel(
          mock.slots[0].start_at,
          mock.slots[0].end_at,
          fmt
        ),
        'Span label of the whole-day slot': slotSpanLabel(
          mock.slots[2].start_at,
          mock.slots[2].end_at ?? '',
          mock.slots[2].whole_day,
          fmt,
          labels.wholeDay
        ),
        'Prices': mock.slots.map((slot) => slotPriceLabel(slot.price, labels.free)),
      };
    },
  }),
]);
