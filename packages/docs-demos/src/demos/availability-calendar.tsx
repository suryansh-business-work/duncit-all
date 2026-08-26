import {
  checkSlotDraft,
  isDraftIncomplete,
  isSlotConflictError,
  minEndTime,
  minTimeOn,
  slotCoveredDays,
  slotCoversDay,
  wholeDayWindow,
} from '@duncit/availability-calendar';
import { defineDemo, defineDemos } from '../types';

interface SlotMock {
  start_at: string;
  end_at: string;
  /** The day a calendar cell is asking about. */
  day: string;
}

interface DraftMock {
  slot_date: string;
  start_time: string;
  end_time: string;
  /** "Now", injected so every reader judges the draft against the same clock. */
  now: string;
  whole_day: boolean;
}

interface WholeDayMock {
  start_date: string;
  end_date: string;
  /** "Now", injected so the clamp below is the same for every reader. */
  now: string;
}

export default defineDemos('availability-calendar', [
  defineDemo<SlotMock>({
    id: 'multi-day',
    title: 'Which calendar cells one slot has to appear in',
    note:
      'Push end_at to the 17th: the slot shows on every day it covers. The end is EXCLUSIVE, so a block ending at midnight does not light up the next day.',
    mock: {
      start_at: '2026-09-14T03:30:00.000Z',
      end_at: '2026-09-16T18:30:00.000Z',
      day: '2026-09-15',
    },
    compute: (mock) => {
      const slot = { start_at: mock.start_at, end_at: mock.end_at };
      return {
        'Days this slot covers': slotCoveredDays(slot).map((day) => day.toDateString()),
        'slotCoversDay(slot, day)': slotCoversDay(slot, new Date(mock.day)),
        'Why the end is exclusive':
          'A block that ends at midnight belongs to the day it ran through, not to the one that just started.',
      };
    },
  }),

  defineDemo<WholeDayMock>({
    id: 'whole-day',
    title: 'A whole-day block that starts today cannot start in the past',
    note:
      "Set start_date to today's date: the window opens five minutes from now instead of at midnight, because a slot the venue could never have offered is not availability.",
    mock: {
      start_date: '2026-09-14T00:00:00.000Z',
      end_date: '2026-09-16T00:00:00.000Z',
      now: '2026-09-14T09:20:00.000Z',
    },
    compute: (mock) => {
      const window = wholeDayWindow(
        new Date(mock.start_date),
        new Date(mock.end_date),
        new Date(mock.now)
      );
      return {
        'Window start': window.start.toISOString(),
        'Window end': window.end.toISOString(),
        'Clamped away from the past': window.start.getTime() > new Date(mock.start_date).getTime(),
      };
    },
  }),

  defineDemo<{ error: { graphQLErrors: { message: string; extensions?: { code?: string } }[] } }>({
    id: 'conflict',
    title: 'Telling an overlap apart from every other failure',
    note:
      "Change the code to BAD_USER_INPUT — the dialog then shows an ordinary error instead of offering to skip or replace the clashing slot.",
    mock: {
      error: {
        graphQLErrors: [
          {
            message: 'That time already has a slot on this space.',
            extensions: { code: 'CONFLICT' },
          },
        ],
      },
    },
    compute: (mock) => ({
      'isSlotConflictError(error)': isSlotConflictError(mock.error),
      'What the caller does with it':
        'Only a CONFLICT gets the skip / replace choice; anything else is reported as it came.',
    }),
  }),

  defineDemo<DraftMock>({
    id: 'past-slot',
    title: 'A slot the venue could never have offered',
    note:
      "Move start_time back to 09:00 with now at 14:30 and the draft stops being addable — the picker will not even offer it. Set end_time equal to start_time for the same-time refusal, and earlier for the ordering one.",
    mock: {
      slot_date: '2026-09-14',
      start_time: '18:00',
      end_time: '20:00',
      now: '2026-09-14T14:30:00',
      whole_day: false,
    },
    compute: (mock) => {
      const day = new Date(`${mock.slot_date}T00:00:00`);
      const now = new Date(mock.now);
      const draft = {
        wholeDay: mock.whole_day,
        startDate: day,
        endDate: day,
        startTime: new Date(`${mock.slot_date}T${mock.start_time}:00`),
        endTime: new Date(`${mock.slot_date}T${mock.end_time}:00`),
        price: '1500',
        notes: '',
        spaceLabel: 'Court 1',
      };
      const checked = checkSlotDraft(draft, now);
      const rejected = typeof checked === 'string';
      return {
        'Verdict': rejected ? checked : 'addable',
        'Is it merely unfinished?': rejected ? isDraftIncomplete(checked) : false,
        'Earliest time the start picker offers':
          minTimeOn(draft.startDate, now)?.toTimeString().slice(0, 5) ?? 'any time',
        'Earliest time the end picker offers':
          minEndTime(draft, now)?.toTimeString().slice(0, 5) ?? 'any time',
        'Why the pickers are bounded too':
          'An hour that has already gone by is not a value to reject after the click — it is one that should never have been offered.',
      };
    },
  }),
]);
