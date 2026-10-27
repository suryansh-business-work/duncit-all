import { useDateFormat } from '@duncit/app-settings';

interface Timed {
  start_at: string;
  end_at: string;
  timezone: string;
}

export interface EventTime {
  /** The start date in the console's date format. */
  date: string;
  /** The start time in the console's time format. */
  time: string;
  /** Start – end; the end's date is added when it falls on another day. */
  range: string;
  /** "Today", "Yesterday", or else the start date (the same text as `date`). */
  day: string;
  sameDay: boolean;
}

/**
 * An event's times in ITS zone (the zone the host picked), in the console's
 * date and time formats — the one place a card, row or page turns an event's
 * instants into words, so no screen hand-writes a format.
 */
export function useEventTime(event: Timed): EventTime {
  const { formatDate, formatTime, dayLabel, dayKey } = useDateFormat({ timeZone: event.timezone || undefined, timeZoneAware: true });
  const sameDay = dayKey(event.start_at) === dayKey(event.end_at);
  const endText = sameDay ? formatTime(event.end_at) : `${formatDate(event.end_at)} ${formatTime(event.end_at)}`;
  return {
    date: formatDate(event.start_at),
    time: formatTime(event.start_at),
    range: `${formatTime(event.start_at)} – ${endText}`,
    day: dayLabel(event.start_at),
    sameDay,
  };
}
