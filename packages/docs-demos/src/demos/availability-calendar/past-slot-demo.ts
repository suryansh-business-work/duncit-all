import { checkSlotDraft, isDraftIncomplete, minEndTime, minTimeOn } from '@duncit/availability-calendar';
import { defineDemo } from '../../types';

interface DraftMock {
  slot_date: string;
  start_time: string;
  end_time: string;
  /** "Now", injected so every reader judges the draft against the same clock. */
  now: string;
  whole_day: boolean;
}

/** The `past-slot` demo: a draft judged against an injected clock. */
export const pastSlotDemo = defineDemo<DraftMock>({
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
});
