import type { VenueSettingsLike } from './recurring.types';

const DEFAULT_RULES = {
  buffer_minutes: 0,
  min_notice_minutes: 0,
  max_advance_days: 60,
  max_bookings_per_slot: 1,
  allow_instant_booking: true,
  allow_waitlist: false,
  booking_approval_required: false,
  allow_multiple_bookings: false,
};

export interface VenueRulesForm {
  buffer_minutes: number;
  min_notice_minutes: number;
  max_advance_days: number;
  max_bookings_per_slot: number;
  allow_instant_booking: boolean;
  allow_waitlist: boolean;
  booking_approval_required: boolean;
  allow_multiple_bookings: boolean;
}

export interface VenueAutoExtendForm {
  enabled: boolean;
  template_id: string | null;
  horizon_days: number;
  until: string; // 'YYYY-MM-DD' or ''
}

const DEFAULT_AUTO_EXTEND: VenueAutoExtendForm = {
  enabled: false,
  template_id: null,
  horizon_days: 30,
  until: '',
};

export interface VenueSettingsView extends VenueSettingsLike {
  rules: VenueRulesForm;
  auto_extend: VenueAutoExtendForm;
}

/** Normalises a venue's GraphQL `settings` (possibly undefined for old venues)
 * into a complete object the dialog + generator can rely on. */
export function readVenueSettings(settings: any): VenueSettingsView {
  return {
    operating_hours: {
      open: settings?.operating_hours?.open ?? '09:00',
      close: settings?.operating_hours?.close ?? '23:00',
    },
    weekly_off_days: settings?.weekly_off_days ?? [],
    holidays: settings?.holidays ?? [],
    rules: { ...DEFAULT_RULES, ...settings?.rules },
    auto_extend: { ...DEFAULT_AUTO_EXTEND, ...settings?.auto_extend },
  };
}

/** 'HH:mm' (24h) from a Date, or null. */
export function timeToHHMM(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** A Date carrying just the 'HH:mm' time (today's date), for MUI TimePicker. */
export function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Slot creation is capped per venue by settings.rules.max_advance_days (default
// 60, and a venue may schedule availability at most 60 days ahead — the server
// honors the same cap). The dialog must never promise beyond it, so the
// effective window clamps the rule to a sane [1, 60] range.
export const MAX_ADVANCE_DAYS_CAP = 60;
export const effectiveMaxAdvance = (maxAdvanceDays: number) =>
  Math.min(Math.max(1, Math.round(maxAdvanceDays) || 60), MAX_ADVANCE_DAYS_CAP);
