/**
 * Instant venue booking — the host side of Create Pod, shared by mWeb and the
 * native app (rules 29 + 56).
 *
 * A host books a venue at the venue's OWN pricing (Venue Pricing Module). The
 * server owns every rule: `venueBookingCalendar` says which days and times are
 * open, `venuePriceQuote` prices a window, and the booking write re-checks
 * both. This module only turns those answers into what the pickers offer and
 * what the price card lists — it never computes a price.
 *
 * Times are ISO instants. The booking grid is counted from local midnight in
 * the admin time zone, exactly as the server checks `booking_increment_minutes`.
 */
import { startOfDayInZone } from './pod-series';

export type VenueBookingModel = 'PER_PAX' | 'PER_SLOT' | 'PER_HOUR' | 'FLAT';

/** What a pod sends as `venue_booking` (CreatePodInput / PodSeriesPlanInput). */
export interface InstantBooking {
  start_at: string;
  end_at: string;
  pax?: number | null;
  pets?: boolean | null;
  space_label?: string | null;
}

/** The fields of a `venueBookingCalendar` day the pickers read. */
export interface BookingCalendarDay {
  date: string;
  closed_reason?: string | null;
  open?: string | null;
  close?: string | null;
  busy: readonly { start: string; end: string }[];
  slots: readonly { start: string; end: string; price: number; available: boolean }[];
}

/** How each pricing model is named to the host. */
export const VENUE_BOOKING_MODEL_KEY: Readonly<Record<VenueBookingModel, string>> = {
  PER_PAX: 'mweb.createPod.bookingModel.perPax',
  PER_SLOT: 'mweb.createPod.bookingModel.perSlot',
  PER_HOUR: 'mweb.createPod.bookingModel.perHour',
  FLAT: 'mweb.createPod.bookingModel.flat',
};

const isBookingModel = (model: string | null | undefined): model is VenueBookingModel =>
  !!model && model in VENUE_BOOKING_MODEL_KEY;

/** The model's label key, or '' for a model this client does not know. Takes a
 * plain string so either app's generated enum passes straight in. */
export const venueBookingModelKey = (model: string | null | undefined): string =>
  isBookingModel(model) ? VENUE_BOOKING_MODEL_KEY[model] : '';

/** The venue's booking limits (from `venuePricing` or `venueBookingCalendar`). */
export interface BookingRules {
  /** A VenueBookingModel; a plain string so either app's generated enum fits. */
  model?: string | null;
  booking_increment_minutes: number;
  min_hours: number;
  max_hours: number;
  /** From `venueBookingCalendar`: the gap the venue keeps around every booking. */
  buffer_minutes?: number | null;
  /** From `venueBookingCalendar`: the earliest a booking may start from now. */
  min_notice_minutes?: number | null;
}

/** One pickable time: a PER_SLOT slot, or a start time for the other models.
 * Shaped like `@duncit/slots`' CalendarSlot so both apps' calendars render it. */
export interface BookingTile {
  id: string;
  start_at: string;
  end_at: string | null;
  price: number | null;
}

/**
 * What both apps hand their `SlotCalendar` for an instant booking: the tiles,
 * the picked one, a pick that resolves the calendar's tile back to its booking
 * tile, and the fixed flags (a window is required; the price card, not the
 * calendar, shows money).
 */
export function bookingCalendarProps(args: {
  tiles: BookingTile[];
  loading: boolean;
  error?: string;
  selectedId: string;
  onPick: (tile: BookingTile) => void;
}) {
  return {
    slots: args.tiles,
    loading: args.loading,
    error: args.error,
    selectedSlotId: args.selectedId,
    onPick: (tile: { id: string }) => {
      const picked = args.tiles.find((item) => item.id === tile.id);
      if (picked) args.onPick(picked);
    },
    required: true,
    showPrice: false,
  };
}

/** The most days one `venueBookingCalendar` call may ask for (server cap). */
export const MAX_BOOKING_CALENDAR_DAYS = 62;

/** Grid step when the venue sets none — also the shortest pod (Create Pod's 30 min). */
export const DEFAULT_BOOKING_STEP_MINUTES = 30;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const addDaysYmd = (ymd: string, days: number): string =>
  new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** The `from`/`to` days of a calendar read starting on `fromYmd` — never more than the server cap. */
export function bookingCalendarRange(fromYmd: string, days = MAX_BOOKING_CALENDAR_DAYS): { from: string; to: string } {
  const span = Math.min(Math.max(1, Math.floor(days)), MAX_BOOKING_CALENDAR_DAYS);
  return { from: fromYmd, to: addDaysYmd(fromYmd, span - 1) };
}

/** The minutes a booking moves in: the venue's increment, else the default. */
export function bookingStepMinutes(rules: Readonly<BookingRules>): number {
  const step = Math.floor(Number(rules.booking_increment_minutes) || 0);
  return step > 0 ? step : DEFAULT_BOOKING_STEP_MINUTES;
}

const roundUpTo = (value: number, step: number) => Math.ceil(value / step) * step;

/** Shortest window, in minutes, on the grid: PER_HOUR honours min_hours. */
export function bookingMinMinutes(rules: Readonly<BookingRules>): number {
  const step = bookingStepMinutes(rules);
  const minHours = rules.model === 'PER_HOUR' ? Math.max(0, Number(rules.min_hours) || 0) : 0;
  return roundUpTo(Math.max(minHours * 60, DEFAULT_BOOKING_STEP_MINUTES, step), step);
}

/** Longest window, in minutes, or null for no cap (only PER_HOUR caps it). */
export function bookingMaxMinutes(rules: Readonly<BookingRules>): number | null {
  const maxHours = rules.model === 'PER_HOUR' ? Number(rules.max_hours) || 0 : 0;
  return maxHours > 0 ? maxHours * 60 : null;
}

const minutesOf = (value: number | null | undefined) => Math.max(0, Math.floor(Number(value) || 0)) * MINUTE_MS;

/** Whether [start, end) touches a booked window, keeping the venue's buffer clear
 * on both sides — the server's own overlap rule. */
const overlapsBusy = (day: Readonly<BookingCalendarDay>, start: number, end: number, bufferMs: number) =>
  day.busy.some((b) => start < Date.parse(b.end) + bufferMs && Date.parse(b.start) < end + bufferMs);

interface DayWindow {
  midnight: number;
  open: number;
  close: number;
}

function openWindow(day: Readonly<BookingCalendarDay>, timeZone: string): DayWindow | null {
  if (day.closed_reason || !day.open || !day.close) return null;
  const open = Date.parse(day.open);
  const close = Date.parse(day.close);
  const midnight = startOfDayInZone(day.date, timeZone);
  if ([open, close, midnight].some(Number.isNaN) || close <= open) return null;
  return { midnight, open, close };
}

/** Every start time on `day` that leaves room for the shortest window before
 * closing without touching a booked window (or its buffer). Starts earlier than
 * `nowMs` + the venue's minimum notice are dropped. */
export function bookingStartOptions(
  day: Readonly<BookingCalendarDay>,
  rules: Readonly<BookingRules>,
  timeZone: string,
  nowMs: number
): string[] {
  const win = openWindow(day, timeZone);
  if (!win) return [];
  const stepMs = bookingStepMinutes(rules) * MINUTE_MS;
  const minMs = bookingMinMinutes(rules) * MINUTE_MS;
  const bufferMs = minutesOf(rules.buffer_minutes);
  const earliest = nowMs + minutesOf(rules.min_notice_minutes);
  const starts: string[] = [];
  let at = win.midnight + roundUpTo(win.open - win.midnight, stepMs);
  for (; at + minMs <= win.close; at += stepMs) {
    if (at >= earliest && !overlapsBusy(day, at, at + minMs, bufferMs)) starts.push(new Date(at).toISOString());
  }
  return starts;
}

/** Every end time for a window starting at `startIso`: on the grid, inside the
 * min/max length, before closing, and stopping short of the next booked window
 * and its buffer. */
export function bookingEndOptions(
  day: Readonly<BookingCalendarDay>,
  rules: Readonly<BookingRules>,
  startIso: string,
  timeZone: string
): string[] {
  const win = openWindow(day, timeZone);
  const start = Date.parse(startIso);
  if (!win || Number.isNaN(start)) return [];
  const stepMs = bookingStepMinutes(rules) * MINUTE_MS;
  const maxMinutes = bookingMaxMinutes(rules);
  const last = Math.min(win.close, maxMinutes === null ? win.close : start + maxMinutes * MINUTE_MS);
  const bufferMs = minutesOf(rules.buffer_minutes);
  const ends: string[] = [];
  for (let end = start + bookingMinMinutes(rules) * MINUTE_MS; end <= last; end += stepMs) {
    if (overlapsBusy(day, start, end, bufferMs)) break;
    ends.push(new Date(end).toISOString());
  }
  return ends;
}

/** The id a slot tile carries — a slot is its window. */
export const bookingSlotId = (start: string, end: string) => `${start}|${end}`;

/** What the host can pick across the calendar: a PER_SLOT venue's free slots
 * (the server already applies buffer and notice to them, as `available`), or,
 * for the other models, every valid start time. Closed days yield nothing,
 * so the calendar leaves them disabled. */
export function bookingTiles(
  days: readonly BookingCalendarDay[],
  rules: Readonly<BookingRules>,
  timeZone: string,
  nowMs: number
): BookingTile[] {
  if (rules.model === 'PER_SLOT') {
    return days.flatMap((day) =>
      day.closed_reason
        ? []
        : day.slots
            .filter((slot) => slot.available)
            .map((slot) => ({ id: bookingSlotId(slot.start, slot.end), start_at: slot.start, end_at: slot.end, price: slot.price }))
    );
  }
  return days.flatMap((day) =>
    bookingStartOptions(day, rules, timeZone, nowMs).map((start) => ({ id: start, start_at: start, end_at: null, price: null }))
  );
}

/** The calendar day holding `startIso`, if it is in the loaded range. */
export function bookingDayOf(
  days: readonly BookingCalendarDay[],
  startIso: string,
  timeZone: string
): BookingCalendarDay | null {
  const start = Date.parse(startIso);
  if (Number.isNaN(start)) return null;
  return days.find((day) => {
    const midnight = startOfDayInZone(day.date, timeZone);
    return start >= midnight && start < midnight + DAY_MS;
  }) ?? null;
}

/** PER_PAX guests held inside the venue's min..max (max 0 = no cap). */
export function clampBookingPax(pax: number, minPax: number, maxPax: number): number {
  const floor = Math.max(1, Math.floor(minPax) || 0);
  const value = Math.max(floor, Math.floor(pax) || 0);
  return maxPax > 0 ? Math.min(value, Math.floor(maxPax)) : value;
}

/** The stored value of the "whole venue" space both apps offer when a venue
 * lists no capacity items. Kept in English because it identifies the space in
 * drafts; each app translates it where it is shown. */
export const WHOLE_VENUE_SPACE = 'Whole venue';

/** A venue space the host can book. `label` is what the host sees; `slotSpaceLabel`
 * is the space_label it books ('' = the whole venue). */
export type VenueSpace = { label: string; capacity: number; slotSpaceLabel: string };

/** The venue fields `venueSpaces` reads. */
export interface VenueSpaceSource {
  capacity?: number | null;
  capacity_items?: readonly { label: string; capacity: number }[] | null;
}

/**
 * The venue's bookable spaces: its named capacity items, else the whole venue
 * as one option — so a picked venue always has ≥1 and a space is always chosen
 * before times and prices show. The whole-venue `label` stays in English on
 * purpose: it is the value stored on the form (and in a draft), so translating
 * it would stop a draft resumed in another language from matching; it is
 * translated where it is displayed. mWeb and the native app both read this.
 */
export function venueSpaces(venue: Readonly<VenueSpaceSource> | null | undefined): VenueSpace[] {
  if (!venue) return [];
  const items = venue.capacity_items ?? [];
  if (items.length > 0) {
    return items.map((item) => ({ label: item.label, capacity: item.capacity, slotSpaceLabel: item.label }));
  }
  return [{ label: WHOLE_VENUE_SPACE, capacity: venue.capacity ?? 0, slotSpaceLabel: '' }];
}

/** The `space_label` a booking sends for the picked space: '' = the whole venue. */
export const bookingSpaceLabel = (spaceLabel: string): string =>
  spaceLabel === WHOLE_VENUE_SPACE ? '' : spaceLabel;

/** What the form holds for an instant booking. */
export interface InstantBookingSource {
  start: string | null;
  end: string | null;
  /** PER_PAX guests; 0 = not a per-guest booking (the server falls back to the spots). */
  pax: number;
  pets: boolean;
  /** The space picked on the form (`WHOLE_VENUE_SPACE` for the whole venue). */
  spaceLabel: string;
}

/** The `venue_booking` input, or null until a window is picked. */
export function instantBookingInput(source: Readonly<InstantBookingSource>): InstantBooking | null {
  if (!source.start || !source.end) return null;
  return {
    start_at: source.start,
    end_at: source.end,
    pax: source.pax > 0 ? Math.floor(source.pax) : null,
    pets: source.pets,
    space_label: bookingSpaceLabel(source.spaceLabel),
  };
}

/** The `venuePriceQuote` fields the price card reads. */
export interface VenueQuote {
  model: string;
  rate: number;
  pax: number;
  hours: number;
  base: number;
  rules: readonly { type: string; label?: string | null; amount: number }[];
  min_spend_top_up: number;
  cleaning_fee: number;
  pet_fee: number;
  gst_pct: number;
  taxes: number;
  platform_fee_pct: number;
  platform_fee: number;
  /** Exactly what the venue is paid (venue price + GST). */
  venue_payout: number;
  total: number;
  deposit: number;
}

/** One row of the price card: translate `labelKey` with `vars`, unless the
 * venue named the rule itself (`label`), and show `amount` as money. */
export interface VenueQuoteLine {
  id: string;
  labelKey: string;
  label?: string;
  vars?: Record<string, string | number>;
  amount: number;
}

const BASE_KEY: Record<VenueBookingModel, string> = {
  PER_PAX: 'mweb.createPod.quote.basePax',
  PER_HOUR: 'mweb.createPod.quote.baseHour',
  PER_SLOT: 'mweb.createPod.quote.baseSlot',
  FLAT: 'mweb.createPod.quote.baseFlat',
};

const RULE_KEY: Record<string, string> = {
  WEEKDAY_SURCHARGE: 'mweb.createPod.quote.ruleWeekday',
  DATE_OVERRIDE: 'mweb.createPod.quote.ruleDate',
  DATE_RANGE: 'mweb.createPod.quote.ruleRange',
};

const optionalLine = (id: string, labelKey: string, amount: number, vars?: VenueQuoteLine['vars']) =>
  amount > 0 ? [{ id, labelKey, amount, ...(vars ? { vars } : {}) }] : [];

/**
 * The price card's rows, in the order the server adds them up: base, each rule
 * applied, the min-spend top-up, fees, taxes and Duncit's fee on top. `money`
 * formats the rate shown inside the base row. The total and the refundable
 * deposit (paid at the venue, never in the total) are returned beside them.
 */
export function venueQuoteLines(
  quote: Readonly<VenueQuote>,
  money: (value: number) => string
): { lines: VenueQuoteLine[]; total: number; deposit: number } {
  const base: VenueQuoteLine = {
    id: 'base',
    labelKey: isBookingModel(quote.model) ? BASE_KEY[quote.model] : BASE_KEY.FLAT,
    vars: { rate: money(quote.rate), pax: quote.pax, hours: quote.hours },
    amount: quote.base,
  };
  const rules = quote.rules.map((rule, index): VenueQuoteLine => ({
    id: `rule-${index}`,
    labelKey: RULE_KEY[rule.type] ?? 'mweb.createPod.quote.ruleDate',
    ...(rule.label ? { label: rule.label } : {}),
    amount: rule.amount,
  }));
  return {
    lines: [
      base,
      ...rules,
      ...optionalLine('min-spend', 'mweb.createPod.quote.minSpend', quote.min_spend_top_up),
      ...optionalLine('cleaning', 'mweb.createPod.quote.cleaning', quote.cleaning_fee),
      ...optionalLine('pets', 'mweb.createPod.quote.pets', quote.pet_fee),
      ...optionalLine('taxes', 'mweb.createPod.quote.taxes', quote.taxes, { pct: quote.gst_pct }),
      ...optionalLine('duncit-fee', 'mweb.createPod.quote.duncitFee', quote.platform_fee, { pct: quote.platform_fee_pct }),
    ],
    total: quote.total,
    deposit: quote.deposit,
  };
}

/** The `venuePriceQuote` document, as an SDL string — mWeb wraps it with `gql`;
 * the native app re-declares it for its codegen. */
export const VENUE_PRICE_QUOTE_SDL = `
  query VenuePriceQuote($venue_id: ID!, $booking: InstantBookingInput!) {
    venuePriceQuote(venue_id: $venue_id, booking: $booking) {
      model
      rate
      pax
      hours
      base
      rules {
        type
        label
        amount
      }
      min_spend_top_up
      cleaning_fee
      pet_fee
      gst_pct
      taxes
      platform_fee_pct
      platform_fee
      venue_payout
      total
      deposit
    }
  }
`;

/** The venue's pricing gate and limits for the host's pickers. */
export const VENUE_BOOKING_PRICING_SDL = `
  query VenueBookingPricing($venue_id: ID!) {
    venuePricing(venue_id: $venue_id) {
      model
      configured
      min_pax
      max_pax
      min_hours
      max_hours
      booking_increment_minutes
      pet_fee
    }
  }
`;

/** Day-by-day availability, at most MAX_BOOKING_CALENDAR_DAYS at a time. */
export const VENUE_BOOKING_CALENDAR_SDL = `
  query VenueBookingCalendar($venue_id: ID!, $from: String!, $to: String!, $space_label: String) {
    venueBookingCalendar(venue_id: $venue_id, from: $from, to: $to, space_label: $space_label) {
      buffer_minutes
      min_notice_minutes
      days {
        date
        closed_reason
        open
        close
        busy {
          start
          end
        }
        slots {
          start
          end
          price
          available
        }
      }
    }
  }
`;
