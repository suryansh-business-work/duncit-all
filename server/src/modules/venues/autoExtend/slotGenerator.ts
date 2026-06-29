import type { ISlotTemplateConfig } from '@modules/venues/slotTemplate/slotTemplate.model';

/** Wall-clock timezone the venue's template HH:mm are interpreted in. The
 * partner portal creates slots in the browser's local time, which for this
 * India-only platform is IST (Asia/Kolkata, UTC+5:30, no DST). The auto-extend
 * job runs server-side (UTC), so it must project the same wall-clock times.
 * If a per-venue timezone is ever added, read it here instead of this constant. */
const VENUE_TZ_OFFSET_MINUTES = 330;
const TZ_OFFSET_MS = VENUE_TZ_OFFSET_MINUTES * 60 * 1000;

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Calendar parts of an instant as seen on the venue's wall clock. */
function venueParts(d: Date) {
  const t = new Date(d.getTime() + TZ_OFFSET_MS);
  return {
    y: t.getUTCFullYear(),
    mo: t.getUTCMonth(),
    day: t.getUTCDate(),
    weekday: t.getUTCDay(),
  };
}

/** The UTC instant for a venue-wall-clock Y-M-D HH:mm. */
function venueWallToUtc(y: number, mo: number, day: number, hh: number, mm: number): Date {
  return new Date(Date.UTC(y, mo, day, hh, mm, 0, 0) - TZ_OFFSET_MS);
}

/** End-of-day UTC instant for an inclusive 'YYYY-MM-DD' venue date (or null). */
export function venueDateEndUtc(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, mo, d] = ymd.split('-').map(Number);
  return venueWallToUtc(y, mo - 1, d, 23, 59);
}

export interface ServerSettingsLike {
  weekly_off_days: number[];
  holidays: string[];
}

export interface GeneratedSlot {
  start_at: string;
  end_at: string;
  price: number;
}

/** Server mirror of the client's recurring generator. Walks every venue-local
 * day in [from, to], keeps the template's weekdays, skips weekly-off/holiday
 * (when configured) and past, applies the per-day price, and returns the slots.
 * Overlap/cap filtering is the caller's job (createSkippingOverlaps). */
export function buildRecurringSlots(
  config: ISlotTemplateConfig,
  settings: ServerSettingsLike,
  from: Date,
  to: Date,
  now: Date,
): GeneratedSlot[] {
  if (!HHMM_RE.test(config.start_time) || !HHMM_RE.test(config.end_time)) return [];
  if (!config.weekdays?.length || to <= from) return [];

  const [sh, sm] = config.start_time.split(':').map(Number);
  const [eh, em] = config.end_time.split(':').map(Number);
  if (eh * 60 + em <= sh * 60 + sm) return [];

  const weekdays = new Set(config.weekdays);
  const weeklyOff = new Set(settings.weekly_off_days ?? []);
  const holidays = new Set(settings.holidays ?? []);
  const perDay = new Map<number, number>(
    (config.per_day_price ?? []).map((p) => [p.weekday, Math.max(0, Math.round(p.price))]),
  );
  const defaultPrice = Math.max(0, Math.round(config.default_price ?? 0));

  const slots: GeneratedSlot[] = [];
  // Iterate venue-local calendar days. Start a day early so a `from` mid-day
  // doesn't skip that day's slot if it is still in the future.
  let cursor = new Date(from.getTime() - 24 * 60 * 60 * 1000);
  const guardEnd = to.getTime();
  while (cursor.getTime() <= guardEnd) {
    const { y, mo, day, weekday } = venueParts(cursor);
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    if (!weekdays.has(weekday)) continue;
    if (config.skip_weekly_off && weeklyOff.has(weekday)) continue;
    const ymd = `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (config.skip_holidays && holidays.has(ymd)) continue;

    const start = venueWallToUtc(y, mo, day, sh, sm);
    const end = venueWallToUtc(y, mo, day, eh, em);
    if (start.getTime() <= now.getTime() || start.getTime() > to.getTime()) continue;

    slots.push({
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      price: perDay.get(weekday) ?? defaultPrice,
    });
  }
  return slots;
}
