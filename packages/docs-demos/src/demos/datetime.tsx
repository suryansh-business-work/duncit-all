import {
  formatDate,
  formatDateTime,
  formatDay,
  formatTime,
  setAmbientDateSettings,
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
      "Change dateFormat to 'yyyy-MM-dd' or timeZone to 'America/New_York' — every line below moves, because no surface formats a date of its own.",
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
      };
    },
  }),
]);
