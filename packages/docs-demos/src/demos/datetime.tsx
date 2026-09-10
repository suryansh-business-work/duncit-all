import {
  createDateFormatter,
  formatDate,
  formatDateTime,
  formatDay,
  formatTime,
  hourChips,
  keyboardPattern,
  meridiemOf,
  patternPlaceholder,
  setAmbientDateSettings,
  twelveHourLabel,
  usesTwelveHourClock,
  withMeridiem,
} from '@duncit/datetime';
import { defineDemo, defineDemos } from '../types';

/** Exactly the four fields an admin sets in Admin > Settings > Date & time. */
interface ClockMock {
  dateFormat: string;
  timeFormat: string;
  timeZone: string;
  timeZoneAware: boolean;
  /** An ISO instant from the API, and a stored calendar day. */
  instant: string;
  day: string;
}

export default defineDemos('datetime', [
  defineDemo<ClockMock>({
    id: 'ambient',
    title: 'One admin setting, every date on the platform',
    note:
      "Change dateFormat to 'yyyy-MM-dd' or timeZone to 'America/New_York' — every line below moves, because no surface formats a date of its own. Try 'EEE, dd MMM yyyy' too: what is DISPLAYED keeps the weekday and the month name, what is TYPED drops both.",
    mock: {
      dateFormat: 'dd MMM yyyy',
      timeFormat: 'hh:mm a',
      timeZone: 'Asia/Kolkata',
      timeZoneAware: true,
      instant: '2026-09-14T18:30:00.000Z',
      day: '2026-09-14',
    },
    compute: (mock) => {
      setAmbientDateSettings({
        dateFormat: mock.dateFormat,
        timeFormat: mock.timeFormat,
        timeZone: mock.timeZone,
        timeZoneAware: mock.timeZoneAware,
      });
      return {
        'formatDate(instant)': formatDate(mock.instant),
        'formatTime(instant)': formatTime(mock.instant),
        'formatDateTime(instant)': formatDateTime(mock.instant),
        'formatDay(day)': formatDay(mock.day),
        'Why formatDay is separate':
          'A stored calendar day is not an instant — putting it through a time zone moves a pod to the day before.',
        'keyboardPattern(dateFormat) — what a date BOX asks for': keyboardPattern(
          mock.dateFormat,
        ),
        'the signup box placeholder': patternPlaceholder(keyboardPattern(mock.dateFormat)),
        'Why the box differs': mock.dateFormat.includes('MMM')
          ? 'A month NAME is read, never typed: MUI labels that section "MMMM" and the member is asked to spell it. Displayed as written, typed in digits.'
          : 'This pattern is already typeable, so the box asks for it unchanged.',
      };
    },
  }),
  defineDemo<ClockMock>({
    id: 'hour-cycle',
    title: 'The clock a native picker draws',
    note:
      "Set timeFormat to 'HH:mm' and the strip becomes 00…23 with no AM/PM row; set it back to 'hh:mm a' and hour 15 is written 3 in the PM half. The stored hour never changes — only what it is called.",
    mock: {
      dateFormat: 'dd MMM yyyy',
      timeFormat: 'hh:mm a',
      timeZone: 'Asia/Kolkata',
      timeZoneAware: true,
      instant: '2026-09-14T18:30:00.000Z',
      day: '2026-09-14',
    },
    compute: (mock) => {
      const twelveHour = usesTwelveHourClock(mock.timeFormat);
      const half = meridiemOf(15);
      return {
        'usesTwelveHourClock(timeFormat)': twelveHour,
        'hour strip': hourChips(twelveHour, half)
          .map((chip) => chip.label)
          .join('  '),
        'meridiemOf(15)': half,
        'twelveHourLabel(15)': twelveHourLabel(15),
        'withMeridiem(15, AM)': withMeridiem(15, 'AM'),
        'formatClock("09:00") — venue opening hour': createDateFormatter({
          timeFormat: mock.timeFormat,
          timeZone: mock.timeZone,
          timeZoneAware: mock.timeZoneAware,
        }).formatClock('09:00'),
        'Why formatClock is separate':
          "A venue opens at nine on the venue's own clock. Reading that through a time zone would move it for anyone standing elsewhere.",
      };
    },
  }),
]);
