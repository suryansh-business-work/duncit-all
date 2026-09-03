import {
  generateRecurringSlots,
  groupSlotsByDay,
  readVenueSettings,
  recurringErrorMessage,
  slotPriceLabel,
  slotRangeLabel,
  slotSpanLabel,
  slotTileLines,
  weekdayLabels,
  type CalendarSlot,
  type SlotFormatter,
  type SpacePrice,
  type TimeRange,
} from '@duncit/slots';
import { AVAILABILITY_BUNDLE, createTranslator, flattenCatalogue } from '@duncit/i18n';
import { defineDemo, defineDemos } from '../types';

interface SlotsMock {
  time_zone: string;
  slots: CalendarSlot[];
}

interface RecurringMock {
  /** "Now", injected so the past/beyond-cap skips read the same for everyone. */
  now: string;
  start_date: string;
  end_date: string;
  /** 0 = Sunday … 6 = Saturday. */
  weekdays: number[];
  time_slots: TimeRange[];
  spaces: SpacePrice[];
  settings: {
    operating_hours: { open: string; close: string };
    weekly_off_days: number[];
    holidays: string[];
    rules: { max_advance_days: number; buffer_minutes: number };
  };
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

/** The real availability copy, so the sentences below are the ones a partner reads. */
const { t } = createTranslator({ locale: 'en-IN', fallback: flattenCatalogue(AVAILABILITY_BUNDLE) });

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

  defineDemo<RecurringMock>({
    id: 'recurring',
    title: 'What a recurring run creates for a Koramangala turf',
    note:
      "Two courts at ₹399 and ₹599, weekdays only, two evening windows, Wednesday the 16th a holiday. Add a Saturday to weekdays, or set buffer_minutes to 30 and the back-to-back windows are refused — the refusal is the sentence the dialog shows.",
    mock: {
      now: '2026-09-14T06:00:00',
      start_date: '2026-09-14T00:00:00',
      end_date: '2026-09-18T00:00:00',
      weekdays: [1, 2, 3, 4, 5],
      time_slots: [
        { start: '18:00', end: '20:00' },
        { start: '20:00', end: '22:00' },
      ],
      spaces: [
        { label: 'Court 1', capacity: 10, price: 399 },
        { label: 'Court 2', capacity: 10, price: 599 },
      ],
      settings: {
        operating_hours: { open: '06:00', close: '23:00' },
        weekly_off_days: [],
        holidays: ['2026-09-16'],
        rules: { max_advance_days: 60, buffer_minutes: 0 },
      },
    },
    compute: (mock) => {
      const settings = readVenueSettings(mock.settings);
      const result = generateRecurringSlots(
        {
          startDate: new Date(mock.start_date),
          endDate: new Date(mock.end_date),
          weekdays: mock.weekdays,
          wholeDay: false,
          timeSlots: mock.time_slots,
          spaces: mock.spaces,
          bufferMinutes: settings.rules.buffer_minutes,
          skipWeeklyOff: true,
          skipHolidays: true,
        },
        settings,
        new Date(mock.now)
      );
      const days = weekdayLabels(t).short;
      return {
        'Slots to be created': result.summary.total,
        'Estimated revenue (₹)': result.summary.estimatedRevenue,
        'Per space': Object.entries(result.summary.bySpace).map(
          ([label, bucket]) => `${label || 'Whole venue'} — ${bucket.count} slot(s) at ₹${bucket.price}`
        ),
        'Auto-skipped': {
          holidays: result.summary.skippedHolidays,
          weeklyOff: result.summary.skippedWeeklyOff,
          past: result.summary.skippedPast,
          beyondCap: result.summary.skippedBeyondCap,
        },
        'First three slots': result.slots.slice(0, 3).map(
          (slot) => `${days[slot.weekday]} ${slot.start_at.slice(0, 16)} · ${slot.space_label} · ₹${slot.price}`
        ),
        'Why it was refused': result.errors.map((code) => recurringErrorMessage(code, t, settings)),
      };
    },
  }),
]);
