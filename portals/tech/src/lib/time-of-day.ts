import { dateToTimeOfDay, timeOfDayToDate } from '@duncit/app-settings';

/**
 * `HH:mm` onto a Date the MUI TimePicker can hold, and back again, for this
 * portal's nightly schedules (the database backup and the e2e run). The
 * conversion itself is shared with every other console's schedules in
 * `@duncit/datetime`; this file only fixes the default hour.
 */

/** The quiet hour a nightly job defaults to when nothing has been configured. */
const DEFAULT_TIME = '03:00';

export const timeToDate = (value: string): Date => timeOfDayToDate(value, DEFAULT_TIME);

export const dateToTime = (date: Date | null): string => dateToTimeOfDay(date, DEFAULT_TIME);
