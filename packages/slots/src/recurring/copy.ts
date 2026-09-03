import type { Translate } from '../slot-draft';
import type { RecurringErrorCode, VenueSettingsLike } from './types';

/**
 * The one place a recurring-run code becomes a sentence. Literal keys, because
 * the localization gate reads them statically (rule 38); the venue settings
 * supply the numbers the sentence names (its hours, its buffer).
 */
export function recurringErrorMessage(
  code: RecurringErrorCode,
  t: Translate,
  settings: VenueSettingsLike,
): string {
  const { open, close } = settings.operating_hours;
  const buffer = Math.max(0, Math.round(settings.rules.buffer_minutes ?? 0));
  switch (code) {
    case 'pickDates':
      return t('availability.recurring.pickDates');
    case 'endDateAfterStart':
      return t('availability.recurring.endDateAfterStart');
    case 'pickWeekday':
      return t('availability.recurring.pickWeekday');
    case 'addTimeSlot':
      return t('availability.recurring.addTimeSlot');
    case 'invalidTime':
      return t('availability.recurring.invalidTime');
    case 'endAfterStart':
      return t('availability.recurring.endAfterStart');
    case 'beforeOpen':
      return t('availability.recurring.beforeOpen', { vars: { open } });
    case 'afterClose':
      return t('availability.recurring.afterClose', { vars: { close } });
    case 'overlap':
      return t('availability.recurring.overlap');
    case 'bufferGap':
      return t('availability.recurring.bufferGap', { vars: { buffer } });
    case 'addSpace':
      return t('availability.recurring.addSpace');
    default:
      return t('availability.recurring.negativePrice');
  }
}

/** Seven labels, Sunday first — the order `Date#getDay` counts in. */
export type WeekdayLabelRow = readonly [string, string, string, string, string, string, string];

export interface WeekdayLabels {
  /** "Sun" … "Sat", for the day-of-week checkboxes. */
  short: WeekdayLabelRow;
  /** "Sunday" … "Saturday", for what a screen reader announces. */
  full: WeekdayLabelRow;
}

/** The weekday names a repeat picker shows, from the surface's translator. */
export function weekdayLabels(t: Translate): WeekdayLabels {
  return {
    short: [
      t('availability.weekday.sun'),
      t('availability.weekday.mon'),
      t('availability.weekday.tue'),
      t('availability.weekday.wed'),
      t('availability.weekday.thu'),
      t('availability.weekday.fri'),
      t('availability.weekday.sat'),
    ],
    full: [
      t('availability.weekdayFull.sunday'),
      t('availability.weekdayFull.monday'),
      t('availability.weekdayFull.tuesday'),
      t('availability.weekdayFull.wednesday'),
      t('availability.weekdayFull.thursday'),
      t('availability.weekdayFull.friday'),
      t('availability.weekdayFull.saturday'),
    ],
  };
}
