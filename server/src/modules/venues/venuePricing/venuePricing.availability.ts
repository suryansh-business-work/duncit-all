/**
 * Which days and times a venue can be booked, from its settings (opening
 * hours, weekly off, holidays, booking rules), its blocked dates and what is
 * already on its calendar. The host prices each booking (venueOffer), so the
 * venue's own pricing model no longer shapes availability. Pure — the service loads the inputs. The same
 * rules decide what Create Pod lets a host pick AND what the booking write
 * accepts, so a time the picker offered is a time the server will book.
 */
import type { VenuePricing } from './venuePricing.types';
import { clockMinutes, localInstant, localParts, weekdayOfYmd } from './venuePricing.time';

export type ClosedReason = 'PAST' | 'TOO_FAR' | 'HOLIDAY' | 'BLOCKED' | 'WEEKLY_OFF' | 'CLOSED';

export interface BusyWindow {
  start: Date;
  end: Date;
}

export interface AvailabilitySettings {
  operating_hours?: { open?: string | null; close?: string | null } | null;
  weekly_off_days?: number[] | null;
  holidays?: string[] | null;
  rules?: {
    buffer_minutes?: number | null;
    min_notice_minutes?: number | null;
    max_advance_days?: number | null;
  } | null;
}

export interface AvailabilityContext {
  pricing: VenuePricing;
  settings: AvailabilitySettings | null | undefined;
  busy: readonly BusyWindow[];
  now: Date;
  timeZone: string;
}

export interface DaySlot {
  start: Date;
  end: Date;
  price: number;
  available: boolean;
}

export interface DayAvailability {
  date: string;
  closed_reason: ClosedReason | null;
  /** Opening window, null when closed. */
  open: Date | null;
  close: Date | null;
  busy: BusyWindow[];
  slots: DaySlot[];
}

/** The day's opening hours in minutes (the venue's one daily window), or null when it does not open. */
export function hoursOn(settings: AvailabilitySettings | null | undefined, ymd: string) {
  if ((settings?.weekly_off_days ?? []).includes(weekdayOfYmd(ymd))) return null;
  const open = clockMinutes(settings?.operating_hours?.open ?? null);
  const close = clockMinutes(settings?.operating_hours?.close ?? null);
  if (open === null || close === null || close <= open) return null;
  return { open, close };
}

const overlaps = (a: BusyWindow, b: BusyWindow, bufferMs: number) =>
  a.start.getTime() < b.end.getTime() + bufferMs && b.start.getTime() < a.end.getTime() + bufferMs;

function closedReason(ctx: AvailabilityContext, ymd: string): ClosedReason | null {
  const today = localParts(ctx.now, ctx.timeZone).ymd;
  if (ymd < today) return 'PAST';
  const maxDays = Number(ctx.settings?.rules?.max_advance_days) || 0;
  if (maxDays > 0) {
    const limit = localParts(new Date(ctx.now.getTime() + maxDays * 86_400_000), ctx.timeZone).ymd;
    if (ymd > limit) return 'TOO_FAR';
  }
  if ((ctx.settings?.holidays ?? []).includes(ymd)) return 'HOLIDAY';
  if ((ctx.pricing.blocked_dates ?? []).includes(ymd)) return 'BLOCKED';
  if ((ctx.settings?.weekly_off_days ?? []).includes(weekdayOfYmd(ymd))) return 'WEEKLY_OFF';
  return null;
}

const earliestStart = (ctx: AvailabilityContext) =>
  ctx.now.getTime() + Math.max(0, Number(ctx.settings?.rules?.min_notice_minutes) || 0) * 60_000;

/** One day of the venue's calendar as a host sees it. */
export function dayAvailability(ctx: AvailabilityContext, ymd: string): DayAvailability {
  const dayStart = localInstant(ymd, 0, ctx.timeZone);
  const dayEnd = localInstant(ymd, 24 * 60, ctx.timeZone);
  const busy = ctx.busy.filter((b) => b.start < dayEnd && b.end > dayStart);
  const closed = closedReason(ctx, ymd);
  const empty = { date: ymd, open: null, close: null, busy, slots: [] };
  if (closed) return { ...empty, closed_reason: closed };
  const hours = hoursOn(ctx.settings, ymd);
  if (!hours) return { ...empty, closed_reason: 'CLOSED' };
  return {
    ...empty,
    closed_reason: null,
    open: localInstant(ymd, hours.open, ctx.timeZone),
    close: localInstant(ymd, hours.close, ctx.timeZone),
  };
}

export type BookableCheck = { ok: true } | { ok: false; message: string };

/** Whether a window can be booked right now — the server's last word before it writes. */
export function checkBookable(ctx: AvailabilityContext, start: Date, end: Date): BookableCheck {
  const ymd = localParts(start, ctx.timeZone).ymd;
  const day = dayAvailability(ctx, ymd);
  if (day.closed_reason) return { ok: false, message: `The venue is not open for bookings on this date (${day.closed_reason})` };
  if (start.getTime() < earliestStart(ctx)) return { ok: false, message: 'This time is too soon for the venue to accept' };
  const win = { start, end };
  if (!day.open || !day.close || start < day.open || end > day.close) {
    return { ok: false, message: 'Pick a time inside the venue opening hours' };
  }
  const bufferMs = Math.max(0, Number(ctx.settings?.rules?.buffer_minutes) || 0) * 60_000;
  if (ctx.busy.some((b) => overlaps(win, b, bufferMs))) {
    return { ok: false, message: 'The venue is already booked at this time' };
  }
  return { ok: true };
}
