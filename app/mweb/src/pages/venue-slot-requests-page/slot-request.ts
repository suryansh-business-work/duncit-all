import { format } from 'date-fns';
import type { SlotRequestRow } from './queries';

/**
 * The derivations both this page and its native twin render.
 *
 * Kept out of the components so the two apps can stay identical (rule 27)
 * without either of them owning the wording: MUI and Tamagui differ, what a
 * slot window READS like must not.
 */

/** "Fri, 8 Aug 2026 · 6:00 PM – 8:00 PM" */
export const slotWindow = (row: Pick<SlotRequestRow, 'start_at' | 'end_at'>): string =>
  `${format(new Date(row.start_at), 'EEE, d MMM yyyy · h:mm a')} – ${format(new Date(row.end_at), 'h:mm a')}`;

/** When the host asked, in the same shape as everything else on the card. */
export const requestedAt = (iso: string): string => format(new Date(iso), 'd MMM yyyy, h:mm a');

/** A free slot says so rather than showing a zero. */
export const slotPrice = (price: number): string =>
  price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Free';

/** One line of context under the pod title, or an honest blank. */
export const podSummary = (row: Pick<SlotRequestRow, 'pod_description'>): string =>
  row.pod_description || 'No description provided.';
