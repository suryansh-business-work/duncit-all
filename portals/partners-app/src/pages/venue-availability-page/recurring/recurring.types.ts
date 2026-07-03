// Pure types for the Recurring Availability engine. The generator below is the
// single source of truth: the live preview, the "Create N Slots" label and the
// actual bulk-create payload all derive from one call, so they can never drift.

export interface VenueOperatingHours {
  open: string; // 'HH:mm' (24h)
  close: string;
}

export interface VenueSettingsLike {
  operating_hours: VenueOperatingHours;
  weekly_off_days: number[]; // 0..6 (Sun..Sat)
  holidays: string[]; // 'YYYY-MM-DD'
  rules: { max_advance_days: number; buffer_minutes?: number };
}

/** One time window within a day, in venue-local 'HH:mm' (24h). */
export interface TimeRange {
  start: string;
  end: string;
}

/** A venue space (capacity item) with the price its slots are created at. */
export interface SpacePrice {
  label: string; // '' = whole venue
  capacity: number;
  price: number;
}

export interface RecurringConfig {
  startDate: Date | null;
  endDate: Date | null;
  weekdays: number[]; // selected 0..6
  timeSlots: TimeRange[]; // one slot generated per range, per space, per day
  spaces: SpacePrice[]; // one slot generated per space
  bufferMinutes: number; // enforced gap between adjacent time ranges
  skipWeeklyOff: boolean;
  skipHolidays: boolean;
}

export interface GeneratedSlot {
  start_at: string; // ISO
  end_at: string; // ISO
  price: number;
  space_label: string;
  capacity: number;
  notes: string;
  weekday: number;
}

export interface SpaceBucket {
  count: number;
  price: number;
  capacity: number;
}

export interface PreviewSummary {
  total: number;
  bySpace: Record<string, SpaceBucket>;
  estimatedRevenue: number;
  skippedWeeklyOff: number;
  skippedHolidays: number;
  skippedPast: number;
  skippedBeyondCap: number;
}

export interface GenerateResult {
  slots: GeneratedSlot[];
  summary: PreviewSummary;
  errors: string[];
}
