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
  /** A whole-day (or whole-date-range) booking — the tile shows the wholeDay
   * label instead of a clock time. */
  whole_day?: boolean;
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

/** What a formatter accepts — mirrors `DateInput` in @duncit/datetime. */
export type SlotDateInput = string | number | Date | null | undefined;

/**
 * The formatter slice the slot helpers need. `@duncit/datetime`'s `DateFormatter`
 * satisfies it structurally, so `useDateFormat()` is passed straight in.
 *
 * Described structurally rather than imported ON PURPOSE. The native app
 * typechecks and bundles this package from its own SOURCE, and module resolution
 * then walks up from `packages/slots/` — which finds nothing in CI or Docker,
 * where only `app/mobile-app` is installed. An `import type` from another
 * @duncit package compiles locally (pnpm leaves a node_modules here) and fails
 * there. No other native-consumed package imports a sibling for the same reason.
 */
export interface SlotFormatter {
  /** 'yyyy-MM-dd' calendar-day key in the admin-configured zone. */
  dayKey: (input: SlotDateInput) => string;
  formatDate: (input: SlotDateInput) => string;
  formatTime: (input: SlotDateInput) => string;
  clock: { nowMs: () => number };
}

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
  /** Headline on a whole-day / whole-date-range slot tile. */
  wholeDay: string;
}
