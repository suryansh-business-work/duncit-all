/**
 * Venue booking calendars and price cards, shared by mWeb and the native app
 * (rules 29 + 56).
 *
 * The server owns every rule: a venue's calendar says which days and times are
 * open and free, and its quote prices a booking (a host's offer —
 * venue-offer.ts). This module only turns those answers into what the pickers
 * offer and what the price card lists — it never prices a booking.
 *
 * Times are ISO instants. The booking grid is counted from local midnight in
 * the admin time zone, exactly as the server checks `booking_increment_minutes`.
 */
import { startOfDayInZone } from './zone-day';
import { dayRate, dayRateParts, priceRuleChange, type PriceRuleLike } from './venue-price-rules';

export type VenueBookingModel = 'PER_PAX' | 'PER_SLOT' | 'PER_HOUR' | 'FLAT';

/** The fields of a `venueBookingCalendar` day the pickers read. */
export interface BookingCalendarDay {
  date: string;
  closed_reason?: string | null;
  open?: string | null;
  close?: string | null;
  busy: readonly { start: string; end: string }[];
  slots: readonly { start: string; end: string; price: number; available: boolean }[];
}

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
  /** From `venuePricing`: the per-unit rate the tiles show (PER_PAX/PER_HOUR/FLAT). */
  base_rate?: number | null;
  /** From `venuePricing`: the owner's price rules, applied to each tile's day. */
  price_rules?: readonly PriceRuleLike[] | null;
}

/** One pickable time: a PER_SLOT slot, or a start time for the other models.
 * Shaped like `@duncit/slots`' CalendarSlot so both apps' calendars render it. */
export interface BookingTile {
  id: string;
  start_at: string;
  end_at: string | null;
  /** The day's rate after its price rules: the slot's price (PER_SLOT), the
   * booking's (FLAT), or the rate per guest / hour. Null when not known. */
  price: number | null;
  /** PER_PAX / PER_HOUR: the day's FLAT rules, added once to the booking. */
  price_extra?: number;
  /** A day the venue closed itself (holiday or blocked): shown, never pickable. */
  closed_reason?: string | null;
  whole_day?: boolean;
  disabled?: boolean;
}

/** The `t` either app passes in (both apps' translators fit it). */
export type BookingTranslate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

const CLOSED_KEY: Record<string, string> = {
  HOLIDAY: 'mweb.createPod.venueTerms.closedHoliday',
  BLOCKED: 'mweb.createPod.venueTerms.closedBlocked',
};

/** The rate with its unit: "₹300 / guest", "₹1,000 / hour", or just the price. */
export function bookingRateText(
  model: string | null | undefined,
  rate: number,
  t: BookingTranslate,
  money: (value: number) => string
): string {
  const price = money(rate);
  if (model === 'PER_PAX') return t('mweb.createPod.venueTerms.ratePerGuest', { vars: { price } });
  if (model === 'PER_HOUR') return t('mweb.createPod.venueTerms.ratePerHour', { vars: { price } });
  return price;
}

/** A tile's second line: why a closed day is shut, else its price (with any
 * flat change the day adds to the booking), else nothing. */
export function bookingTileCaption(
  tile: Readonly<BookingTile>,
  model: string | null | undefined,
  t: BookingTranslate,
  money: (value: number) => string
): string {
  const closedKey = tile.closed_reason ? CLOSED_KEY[tile.closed_reason] : undefined;
  if (closedKey) return t(closedKey);
  if (tile.price === null) return '';
  const rate = bookingRateText(model, tile.price, t, money);
  if (!tile.price_extra) return rate;
  const extra = priceRuleChange('FLAT', tile.price_extra, money);
  return t('mweb.createPod.venueTerms.rateWithExtra', { vars: { rate, extra } });
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
  /** The venue's model, the app's `t` and money format write each tile's price line. */
  model: string | null | undefined;
  t: BookingTranslate;
  money: (value: number) => string;
}) {
  return {
    slots: args.tiles.map((tile) => ({ ...tile, caption: bookingTileCaption(tile, args.model, args.t, args.money) })),
    loading: args.loading,
    error: args.error,
    selectedSlotId: args.selectedId,
    onPick: (tile: { id: string }) => {
      const picked = args.tiles.find((item) => item.id === tile.id);
      if (picked) args.onPick(picked);
    },
    required: true,
    // The price is each tile's caption: the calendar's own price line has no unit.
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
  const priceRules = rules.price_rules ?? [];
  if (rules.model === 'PER_SLOT') {
    return days.flatMap((day) =>
      day.closed_reason
        ? []
        : day.slots
            .filter((slot) => slot.available)
            .map((slot) => ({
              id: bookingSlotId(slot.start, slot.end),
              start_at: slot.start,
              end_at: slot.end,
              price: dayRate(slot.price, priceRules, day.date),
            }))
    );
  }
  return days.flatMap((day) => {
    const price = dayPrice(rules, priceRules, day.date);
    return bookingStartOptions(day, rules, timeZone, nowMs).map((start) => ({ id: start, start_at: start, end_at: null, ...price }));
  });
}

/** A start tile's price for its day: FLAT folds every rule into the one
 * booking price; per guest / hour keeps the flat changes apart. */
function dayPrice(
  rules: Readonly<BookingRules>,
  priceRules: NonNullable<BookingRules['price_rules']>,
  date: string
): Pick<BookingTile, 'price' | 'price_extra'> {
  if (rules.base_rate === null || rules.base_rate === undefined) return { price: null };
  if (rules.model === 'FLAT') return { price: dayRate(rules.base_rate, priceRules, date) };
  const { rate, flat } = dayRateParts(rules.base_rate, priceRules, date);
  return flat ? { price: rate, price_extra: flat } : { price: rate };
}

/** One disabled tile on each day the venue closed itself (a holiday or a
 * blocked date), so the calendar labels the day closed instead of hiding it. */
export function bookingClosedTiles(days: readonly BookingCalendarDay[], timeZone: string): BookingTile[] {
  return days.flatMap((day) => {
    const reason = day.closed_reason;
    const midnight = startOfDayInZone(day.date, timeZone);
    if (!reason || !CLOSED_KEY[reason] || Number.isNaN(midnight)) return [];
    return [
      {
        id: `closed|${day.date}`,
        start_at: new Date(midnight).toISOString(),
        end_at: null,
        price: null,
        closed_reason: reason,
        whole_day: true,
        disabled: true,
      },
    ];
  });
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

const isBookingModel = (model: string | null | undefined): model is VenueBookingModel =>
  !!model && model in BASE_KEY;

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
