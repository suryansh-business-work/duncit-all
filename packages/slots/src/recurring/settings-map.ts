import type { VenueSettingsLike } from './types';

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

export interface VenueSettingsView extends VenueSettingsLike {
  rules: VenueRulesForm;
  auto_extend: VenueAutoExtendForm;
}

export const DEFAULT_VENUE_RULES: VenueRulesForm = {
  buffer_minutes: 0,
  min_notice_minutes: 0,
  max_advance_days: 60,
  max_bookings_per_slot: 1,
  allow_instant_booking: true,
  allow_waitlist: false,
  booking_approval_required: false,
  allow_multiple_bookings: false,
};

export const DEFAULT_AUTO_EXTEND: VenueAutoExtendForm = {
  enabled: false,
  template_id: null,
  horizon_days: 30,
  until: '',
};

/** A venue's GraphQL `settings` as it arrives: every part optional, because a
 *  venue registered before settings existed carries none of them. */
interface RawVenueSettings {
  operating_hours?: { open?: string | null; close?: string | null } | null;
  weekly_off_days?: number[] | null;
  holidays?: string[] | null;
  rules?: Partial<VenueRulesForm> | null;
  auto_extend?: Partial<VenueAutoExtendForm> | null;
}

/** Normalises a venue's `settings` (possibly undefined for old venues) into a
 * complete object the dialog + generator can rely on. */
export function readVenueSettings(settings: unknown): VenueSettingsView {
  const raw = (settings ?? {}) as RawVenueSettings;
  return {
    operating_hours: {
      open: raw.operating_hours?.open ?? '09:00',
      close: raw.operating_hours?.close ?? '23:00',
    },
    weekly_off_days: raw.weekly_off_days ?? [],
    holidays: raw.holidays ?? [],
    rules: { ...DEFAULT_VENUE_RULES, ...raw.rules },
    auto_extend: { ...DEFAULT_AUTO_EXTEND, ...raw.auto_extend },
  };
}

/** 'HH:mm' → hours + minutes. Anything unparseable reads as midnight, so a
 *  blank template time never becomes an Invalid Date. */
export function parseHHMM(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(':');
  return { hours: Number(h) || 0, minutes: Number(m) || 0 };
}

/** 'HH:mm' (24h) from a Date, or '' for none / an invalid one. */
export function timeToHHMM(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** A Date carrying just the 'HH:mm' time (today's date), for a time picker. */
export function hhmmToDate(hhmm: string): Date {
  const { hours, minutes } = parseHHMM(hhmm);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// Slot creation is capped per venue by settings.rules.max_advance_days (default
// 60, and a venue may schedule availability at most 60 days ahead — the server
// honors the same cap). The dialog must never promise beyond it, so the
// effective window clamps the rule to a sane [1, 60] range.
export const MAX_ADVANCE_DAYS_CAP = 60;
export const effectiveMaxAdvance = (maxAdvanceDays: number): number =>
  Math.min(Math.max(1, Math.round(maxAdvanceDays) || 60), MAX_ADVANCE_DAYS_CAP);
