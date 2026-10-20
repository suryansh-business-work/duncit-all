/**
 * Gives every venue its pricing from the slots it already published, so a
 * venue that was bookable before instant booking stays bookable after it.
 *
 * - Latest slot priced per person → PER_PAX at that rate.
 * - Latest slot priced per hour   → PER_HOUR at that rate, hourly steps.
 * - Otherwise (flat slots)        → PER_SLOT: each distinct window + price,
 *   repeated on the weekdays it was published on.
 * Opening hours come from the venue's existing settings. A venue with no slot
 * at all cannot be inferred: it is left unset (not bookable) and reported so
 * someone sets it up by hand. Existing slots, blocks, holidays and bookings
 * are not touched — open slots stay bookable exactly as before.
 *
 * Idempotent: only venues whose pricing model is still unset are looked at.
 * Gated by the deploy (RUN_VENUE_PRICING_BACKFILL) like the other data migrations.
 */
import { logs } from '@observability/log';
import { getAppTimeZone } from '@utils/app-time';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { localParts } from './venuePricing.time';
import type { DayHours, PricingSlot, VenuePricing } from './venuePricing.types';

const RECENT_SLOTS = 300;
const MAX_SLOT_ROWS = 50;

type SlotRow = { start_at: Date; end_at: Date; price: number; pricing_mode?: string; capacity?: number };

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

function slotRows(slots: SlotRow[], timeZone: string): PricingSlot[] {
  const byWindow = new Map<string, PricingSlot>();
  for (const s of slots) {
    const start = localParts(s.start_at, timeZone);
    const end = localParts(s.end_at, timeZone);
    // A window that crosses midnight is not a repeatable daily slot.
    if (end.ymd !== start.ymd && end.minutes !== 0) continue;
    const endMinutes = end.ymd === start.ymd ? end.minutes : 24 * 60;
    if (endMinutes <= start.minutes) continue;
    const key = `${start.minutes}-${endMinutes}`;
    const row = byWindow.get(key) ?? {
      start_time: hhmm(start.minutes),
      end_time: hhmm(endMinutes),
      // Newest first, so the first price seen for a window is its latest.
      price: Number(s.price) || 0,
      days_of_week: [],
    };
    if (!row.days_of_week.includes(start.weekday)) row.days_of_week.push(start.weekday);
    byWindow.set(key, row);
  }
  return [...byWindow.values()].slice(0, MAX_SLOT_ROWS).map((r) => ({ ...r, days_of_week: r.days_of_week.sort() }));
}

type HoursSettings = {
  operating_hours?: { open?: string | null; close?: string | null } | null;
  weekly_off_days?: number[] | null;
} | null | undefined;

function hoursFromSettings(settings: HoursSettings): DayHours[] {
  const open = settings?.operating_hours?.open || '09:00';
  const close = settings?.operating_hours?.close || '23:00';
  const off = new Set<number>(settings?.weekly_off_days ?? []);
  return [0, 1, 2, 3, 4, 5, 6].filter((d) => !off.has(d)).map((day) => ({ day, open, close }));
}

/** The pricing a venue's own slots imply, or null when it published none. */
export function inferPricing(slots: SlotRow[], settings: HoursSettings, timeZone: string): Partial<VenuePricing> | null {
  if (slots.length === 0) return null;
  const latest = slots[0];
  const operating_hours = hoursFromSettings(settings);
  const rate = Number(latest.price) || 0;
  if (latest.pricing_mode === 'PER_PAX') {
    const maxPax = Math.max(0, ...slots.map((s) => Number(s.capacity) || 0));
    return { model: 'PER_PAX', base_rate: rate, min_pax: 1, max_pax: maxPax, operating_hours };
  }
  if (latest.pricing_mode === 'HOURLY') {
    return { model: 'PER_HOUR', base_rate: rate, min_hours: 1, max_hours: 0, booking_increment_minutes: 60, operating_hours };
  }
  const rows = slotRows(slots.filter((s) => (s.pricing_mode ?? 'FLAT') === 'FLAT'), timeZone);
  return rows.length ? { model: 'PER_SLOT', slots: rows, operating_hours } : null;
}

export async function backfillVenuePricing(): Promise<{ configured: number; manual: { venue_id: string; venue_no: string | null; venue_name: string }[] }> {
  const timeZone = getAppTimeZone();
  const venues = await VenueModel.find({ $or: [{ 'pricing.model': null }, { pricing: { $exists: false } }] })
    .select('_id venue_no venue_name settings')
    .lean();
  let configured = 0;
  const manual: { venue_id: string; venue_no: string | null; venue_name: string }[] = [];
  for (const venue of venues) {
    try {
      const slots = await VenueSlotModel.find({
        venue_id: venue._id,
        requested_by_host: { $ne: true },
        status: { $ne: 'BLOCKED' },
      })
        .sort({ start_at: -1 })
        .limit(RECENT_SLOTS)
        .select('start_at end_at price pricing_mode capacity')
        .lean<SlotRow[]>();
      const pricing = inferPricing(slots, venue.settings, timeZone);
      if (!pricing) {
        manual.push({ venue_id: String(venue._id), venue_no: venue.venue_no ?? null, venue_name: venue.venue_name ?? '' });
        continue;
      }
      const set = Object.fromEntries(Object.entries(pricing).map(([k, v]) => [`pricing.${k}`, v]));
      await VenueModel.updateOne({ _id: venue._id, 'pricing.model': null }, { $set: set });
      configured += 1;
    } catch (error) {
      logs.server.error('venuePricing', 'backfillVenuePricing', { venue_id: String(venue._id), error });
    }
  }
  logs.server.info('venuePricing', 'backfillVenuePricing', { configured, manual_count: manual.length, manual });
  return { configured, manual };
}
