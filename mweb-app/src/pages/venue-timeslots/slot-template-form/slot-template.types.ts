export type RecurrenceKind = 'WEEKLY' | 'MONTHLY' | 'SPECIFIC_DATES';

export interface MonthNthWeekday {
  nth: number;
  weekday: number;
}

export interface SlotTemplateFormValues {
  label: string;
  duration_minutes: number;
  capacity: number;
  start_time: string;
  end_time: string;
  recurrence_kind: RecurrenceKind;
  weekdays: number[];
  month_days: number[];
  month_nth_weekday: MonthNthWeekday | null;
  specific_dates: string[];
  valid_from: string;
  valid_until: string;
  timezone: string;
  is_active: boolean;
}

export interface VenueTimeslotTemplateInput {
  label: string;
  duration_minutes: number;
  capacity: number;
  start_time: string;
  end_time: string;
  recurrence_kind: RecurrenceKind;
  weekdays: number[];
  month_days: number[];
  month_nth_weekday: MonthNthWeekday | null;
  specific_dates: string[];
  valid_from: string | null;
  valid_until: string | null;
  timezone: string;
  is_active: boolean;
}
