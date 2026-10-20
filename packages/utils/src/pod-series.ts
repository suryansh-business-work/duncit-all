/**
 * Recurring pods — the rules both apps' Create Pod steppers share (rule 40).
 *
 * A host picks the first date (a venue slot, or a virtual window), how often it
 * repeats, the last day it may run and the multi-date booking discount. The
 * SERVER works out every date and its slot (`podSeriesPreview`) and publishes
 * ONE pod with those dates; this module only words the choices and builds the
 * plan the server is asked about. Booking it: pod-series-booking.ts.
 */
import type { MultiDateDiscountTier } from './pod-series-booking';
import type { InstantBooking } from './venue-booking';

export type PodSeriesFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';

export type PodSeriesSkipReason = 'NO_SLOT' | 'HOLIDAY' | 'TAKEN' | 'REMOVED_BY_HOST' | 'FAILED';

/** The repeat choices, in the order the picker offers them. */
export const POD_SERIES_FREQUENCIES: readonly { value: PodSeriesFrequency; labelKey: string }[] = [
  { value: 'DAILY', labelKey: 'mweb.podSeries.daily' },
  { value: 'WEEKLY', labelKey: 'mweb.podSeries.weekly' },
  { value: 'BIWEEKLY', labelKey: 'mweb.podSeries.biweekly' },
  { value: 'MONTHLY', labelKey: 'mweb.podSeries.monthly' },
  { value: 'CUSTOM', labelKey: 'mweb.podSeries.custom' },
];

/** Why a date cannot run, as the preview list says it. */
export const POD_SERIES_SKIP_REASON_KEY: Record<PodSeriesSkipReason, string> = {
  NO_SLOT: 'mweb.podSeries.reasonNoSlot',
  HOLIDAY: 'mweb.podSeries.reasonHoliday',
  TAKEN: 'mweb.podSeries.reasonTaken',
  REMOVED_BY_HOST: 'mweb.podSeries.reasonRemoved',
  FAILED: 'mweb.podSeries.reasonFailed',
};

const isClockPart = <K extends string>(type: string, parts: Record<K, number>): type is K => type in parts;

/** How far `timeZone` is ahead of UTC at `at`, in ms. An unknown zone (the
 * admin's box is free text) reads as UTC rather than throwing. */
function zoneOffsetMs(at: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(at);
    const p = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
    for (const part of parts) if (isClockPart(part.type, p)) p[part.type] = Number(part.value);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(at.getTime() / 1000) * 1000;
  } catch {
    return 0;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The calendar day (`yyyy-MM-dd`) an instant falls on in `timeZone` — how a
 * date of the series is marked on the host's calendar. Null for a bad instant. */
export function ymdInZone(iso: string, timeZone: string): string | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return new Date(at.getTime() + zoneOffsetMs(at, timeZone)).toISOString().slice(0, 10);
}

/**
 * The start of a CUSTOM date the host tapped on the calendar: the first date's
 * time of day on calendar day `ymd` (in `timeZone`), as an ISO instant — a
 * whole number of days after the first date, which is what the server accepts.
 * Null when either side is not a real day.
 */
export function customDateStart(firstStartIso: string, ymd: string, timeZone: string): string | null {
  const firstDay = ymdInZone(firstStartIso, timeZone);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? Date.parse(`${ymd}T00:00:00Z`) : Number.NaN;
  if (!firstDay || Number.isNaN(day)) return null;
  const days = Math.round((day - Date.parse(`${firstDay}T00:00:00Z`)) / DAY_MS);
  return new Date(new Date(firstStartIso).getTime() + days * DAY_MS).toISOString();
}

/**
 * The last moment of calendar day `ymd` (`yyyy-MM-dd`) in `timeZone`, as an ISO
 * instant — what the server reads as "the series may run until this day".
 * Null for a value that is not a calendar day.
 */
export function endOfDayInZone(ymd: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const wall = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
  return new Date(wall - zoneOffsetMs(new Date(wall), timeZone)).toISOString();
}

/**
 * The first moment (local midnight) of calendar day `ymd` in `timeZone`, as
 * epoch ms — what a venue's booking grid counts its minutes from. NaN for a
 * value that is not a calendar day.
 */
export function startOfDayInZone(ymd: string, timeZone: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return Number.NaN;
  const wall = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return wall - zoneOffsetMs(new Date(wall), timeZone);
}

/** What `podSeriesPreview` and `publishPodDraftSeries` are asked about. */
export interface PodSeriesPlan {
  pod_mode: string;
  venue_id: string | null;
  venue_slot_id: string | null;
  /** Instant booking of the FIRST date at the venue's own pricing (no slot id). */
  venue_booking?: InstantBooking | null;
  pod_date_time: string | null;
  pod_end_date_time: string | null;
  frequency: PodSeriesFrequency;
  ends_on: string;
  /** CUSTOM only: the ISO start of every date after the first. */
  custom_dates: string[];
  skip_dates: string[];
  /** Percent off a booking of several dates ([] for none). */
  multi_date_discount_tiers: MultiDateDiscountTier[];
}

export interface PodSeriesPlanSource {
  repeat_enabled: boolean;
  repeat_frequency: PodSeriesFrequency;
  /** The last day the series may run, `yyyy-MM-dd`. */
  repeat_ends_on: string;
  repeat_skip_dates: readonly string[];
  /** CUSTOM only: the days (`yyyy-MM-dd`) the host picked on the calendar. */
  repeat_custom_days?: readonly string[];
  /** The multi-date discount the host set; empty when switched off. */
  repeat_discount_tiers: readonly MultiDateDiscountTier[];
  pod_mode: string;
  venue_id: string;
  venue_slot_id: string;
  /** The first date booked instantly at the venue's pricing — when there is no slot id. */
  venue_booking?: InstantBooking | null;
  pod_date_time: string | null;
  pod_end_date_time: string | null;
}

/** Where and when the series runs: a venue (slot or instant booking) for a physical pod, times for a virtual one. */
function whereAndWhen(
  source: PodSeriesPlanSource,
  physical: boolean,
  booking: InstantBooking | null
): Pick<PodSeriesPlan, 'pod_mode' | 'venue_id' | 'venue_slot_id' | 'venue_booking' | 'pod_date_time' | 'pod_end_date_time'> {
  if (!physical) {
    return {
      pod_mode: 'VIRTUAL',
      venue_id: null,
      venue_slot_id: null,
      pod_date_time: source.pod_date_time,
      pod_end_date_time: source.pod_end_date_time,
    };
  }
  return {
    pod_mode: 'PHYSICAL',
    venue_id: source.venue_id || null,
    venue_slot_id: source.venue_slot_id || null,
    ...(booking ? { venue_booking: booking } : {}),
    pod_date_time: null,
    pod_end_date_time: null,
  };
}

/**
 * The plan for a form, or null while there is none to ask about: repeat is
 * off, the end day is missing, or the first date is not chosen yet (a slot or
 * an instant booking for a physical pod, a start for a virtual one).
 */
export function buildPodSeriesPlan(source: PodSeriesPlanSource, timeZone: string): PodSeriesPlan | null {
  if (!source.repeat_enabled) return null;
  const endsOn = endOfDayInZone(source.repeat_ends_on, timeZone);
  if (!endsOn) return null;
  const physical = source.pod_mode !== 'VIRTUAL';
  const booking = physical && !source.venue_slot_id ? (source.venue_booking ?? null) : null;
  if (physical ? !source.venue_slot_id && !booking : !source.pod_date_time) return null;
  const firstStart = source.repeat_frequency === 'CUSTOM' ? source.pod_date_time : null;
  return {
    ...whereAndWhen(source, physical, booking),
    frequency: source.repeat_frequency,
    ends_on: endsOn,
    // Hand-picked dates are the plan itself, so nothing is skipped from them.
    custom_dates: firstStart
      ? (source.repeat_custom_days ?? []).flatMap((ymd) => customDateStart(firstStart, ymd, timeZone) ?? [])
      : [],
    skip_dates: firstStart ? [] : [...source.repeat_skip_dates],
    multi_date_discount_tiers: source.repeat_discount_tiers.map((tier) => ({ ...tier })),
  };
}

/**
 * The preview and publish documents, as SDL strings — mWeb wraps them with
 * Apollo's `gql`; the native app re-declares them inline for its codegen.
 */
export const POD_SERIES_PREVIEW_SDL = `
  query PodSeriesPreview($input: PodSeriesPlanInput!) {
    podSeriesPreview(input: $input) {
      frequency
      max_occurrences
      max_span_days
      max_discount_pct
      default_multi_date_discount_tiers {
        min_dates
        discount_pct
      }
      dates {
        start_at
        end_at
        slot_id
        price
        available
        reason
        on_request
      }
    }
  }
`;

/** The Pod Settings a plan is held to — read before there is a plan, to bound the end day. */
export const POD_SERIES_LIMITS_SDL = `
  query PodSeriesLimits {
    podSeriesLimits {
      max_occurrences
      max_span_days
      max_discount_pct
      default_multi_date_discount_tiers {
        min_dates
        discount_pct
      }
    }
  }
`;

export const PUBLISH_POD_DRAFT_SERIES_SDL = `
  mutation PublishPodDraftSeries($draft_id: ID!, $input: CreatePodInput!, $plan: PodSeriesPlanInput!) {
    publishPodDraftSeries(draft_id: $draft_id, input: $input, plan: $plan) {
      series_id
      parent_pod_id
      created_count
      skipped {
        date
        reason
      }
    }
  }
`;

/** Venue owner: accept or decline every still-pending date of a series. */
export const VENUE_DECIDE_POD_SERIES_SDL = `
  mutation VenueDecidePodSeries($series_id: ID!, $approve: Boolean!, $reason: String) {
    venueDecidePodSeries(series_id: $series_id, approve: $approve, reason: $reason) {
      decided
      failed
    }
  }
`;

/** A venue request row, as far as grouping needs it. */
export interface SeriesGroupable {
  series_id?: string | null;
  start_at: string;
}

export type SlotRequestGroup<T extends SeriesGroupable> =
  | { kind: 'SINGLE'; key: string; row: T }
  | { kind: 'SERIES'; key: string; seriesId: string; rows: T[] };

/**
 * A venue's pending requests with every recurring series folded into one
 * group (its dates in order), so the venue can answer the whole series at once
 * or each date on its own. A series with a single pending date left reads as
 * an ordinary request. Groups keep the position of their first row.
 */
export function groupSlotRequestsBySeries<T extends SeriesGroupable>(
  rows: readonly T[],
  keyOf: (row: T) => string
): SlotRequestGroup<T>[] {
  const bySeries = new Map<string, T[]>();
  for (const row of rows) {
    if (row.series_id) bySeries.set(row.series_id, [...(bySeries.get(row.series_id) ?? []), row]);
  }
  const out: SlotRequestGroup<T>[] = [];
  const placed = new Set<string>();
  for (const row of rows) {
    const seriesRows = bySeries.get(row.series_id ?? '') ?? [];
    if (seriesRows.length < 2) {
      out.push({ kind: 'SINGLE', key: keyOf(row), row });
      continue;
    }
    const seriesId = String(row.series_id);
    if (placed.has(seriesId)) continue;
    placed.add(seriesId);
    const ordered = [...seriesRows].sort((x, y) => x.start_at.localeCompare(y.start_at));
    out.push({ kind: 'SERIES', key: `series-${seriesId}`, seriesId, rows: ordered });
  }
  return out;
}
