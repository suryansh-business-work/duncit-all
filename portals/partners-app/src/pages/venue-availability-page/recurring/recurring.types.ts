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
  rules: { max_advance_days: number };
}

export interface RecurringConfig {
  startDate: Date | null;
  endDate: Date | null;
  weekdays: number[]; // selected 0..6
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  defaultPrice: number;
  perDayPrice: Record<number, number>; // weekday -> price override
  skipWeeklyOff: boolean;
  skipHolidays: boolean;
}

export interface GeneratedSlot {
  start_at: string; // ISO
  end_at: string; // ISO
  price: number;
  notes: string;
  weekday: number;
}

export interface WeekdayBucket {
  count: number;
  price: number;
}

export interface PreviewSummary {
  total: number;
  byWeekday: Record<number, WeekdayBucket>;
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
