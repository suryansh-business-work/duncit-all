import type { DateFormatter } from '@duncit/datetime';

/**
 * The one slot shape every picker renders. Venue availability and onboarding
 * meeting slots both normalise into this, so a single calendar serves both.
 */
export interface CalendarSlot {
  /**
   * Stable identity. Venue slots have a real id; a meeting slot has none, so its
   * `start_at` is its identity — hence a string rather than an opaque id type.
   */
  id: string;
  start_at: string;
  /** Absent for meeting slots, which are a start time with an implied length. */
  end_at?: string | null;
  /** Omitted where the surface has no pricing (meetings are free to book). */
  price?: number | null;
  /** Second line on the tile — the venue space, or a note like "Currently booked". */
  caption?: string | null;
  /** Rendered but not selectable: a meeting slot the server marked unavailable. */
  disabled?: boolean;
}

/** One calendar day's worth of slots. `key` is a 'yyyy-MM-dd' day key. */
export interface SlotDay<T extends CalendarSlot = CalendarSlot> {
  key: string;
  slots: T[];
}

/**
 * The formatter slice the slot helpers need. Taking the slice rather than the
 * whole `DateFormatter` keeps the helpers callable from a test or a surface that
 * only has partial settings.
 */
export type SlotFormatter = Pick<DateFormatter, 'dayKey' | 'formatDate' | 'formatTime' | 'clock'>;

/**
 * Every user-visible string the pickers render. Required, never defaulted inside
 * the package: rule 38 forbids shipping English literals in shared UI, so each
 * surface passes its own translated copy.
 */
export interface SlotLabels {
  /** Heading above the calendar. */
  date: string;
  /** Caption under the heading. */
  hint: string;
  /** Heading above the time tiles. */
  availableSlots: string;
  /** Shown on a tile whose price is zero. */
  free: string;
  today: string;
  tomorrow: string;
  loading: string;
  /** No slots at all. */
  empty: string;
  /** A day is selected but it holds no slots. */
  emptyDay: string;
  previousMonth: string;
  nextMonth: string;
  /** Shown where a venue must be chosen before any slot exists. */
  pickVenueFirst: string;
  /** Caption on the slot an edited pod already holds. */
  currentlyBooked: string;
  /** Caption for a slot with no named space. */
  wholeVenue: string;
}
