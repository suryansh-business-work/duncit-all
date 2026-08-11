import { format } from 'date-fns';
import type { SlotRequestRow } from './queries';

/**
 * The derivations both this page and its native twin render.
 *
 * Kept out of the components so the two apps can stay identical (rule 27)
 * without either of them owning the wording: MUI and Tamagui differ, what a
 * slot window READS like must not.
 */

/** "Fri, 8 Aug 2026 · 6:00 PM – 8:00 PM", both dates when the booking spans
 * days, or the whole-day variants. The end instant is exclusive, so a slot
 * ending exactly at midnight claims no extra day. */
export const slotWindow = (
  row: Pick<SlotRequestRow, 'start_at' | 'end_at' | 'whole_day'>,
): string => {
  const start = new Date(row.start_at);
  const end = new Date(row.end_at);
  const multiDay =
    format(start, 'yyyy-MM-dd') !== format(new Date(end.getTime() - 1), 'yyyy-MM-dd');
  if (row.whole_day) {
    const days = multiDay
      ? `${format(start, 'EEE, d MMM yyyy')} – ${format(end, 'EEE, d MMM yyyy')}`
      : format(start, 'EEE, d MMM yyyy');
    return `Whole day · ${days}`;
  }
  if (multiDay) {
    return `${format(start, 'EEE, d MMM yyyy · h:mm a')} – ${format(end, 'EEE, d MMM yyyy · h:mm a')}`;
  }
  return `${format(start, 'EEE, d MMM yyyy · h:mm a')} – ${format(end, 'h:mm a')}`;
};

/** When the host asked, in the same shape as everything else on the card. */
export const requestedAt = (iso: string): string => format(new Date(iso), 'd MMM yyyy, h:mm a');

/** A free slot says so rather than showing a zero. */
export const slotPrice = (price: number): string =>
  price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Free';

/** One line of context under the pod title, or an honest blank. */
export const podSummary = (row: Pick<SlotRequestRow, 'pod_description'>): string =>
  row.pod_description || 'No description provided.';
