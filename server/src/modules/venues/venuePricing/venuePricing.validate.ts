/**
 * Turns what the Venue Pricing Module sends into a clean `VenuePricing`, or
 * says exactly which field is wrong. Pure, so the owner's live preview and the
 * save run the same checks.
 */
import {
  PRICE_RULE_MODES,
  PRICE_RULE_TYPES,
  VENUE_PRICING_MODELS,
  type DayHours,
  type PriceRule,
  type PricingSlot,
  type VenuePricing,
} from './venuePricing.types';
import { clockMinutes, isYmd } from './venuePricing.time';

export class PricingInputError extends Error {}

const MAX_RUPEES = 1_000_000;
const MAX_SLOTS = 50;
const MAX_RULES = 100;
const MAX_BLOCKED = 366;

/** An input object's fields, read without trusting their types. */
type Raw = Record<string, unknown>;
const rec = (value: unknown): Raw => (value && typeof value === 'object' ? (value as Raw) : {});

const bad = (message: string): never => {
  throw new PricingInputError(message);
};

function money(raw: unknown, what: string, min = 0): number {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n < min || n > MAX_RUPEES) bad(`${what} must be between ${min} and ${MAX_RUPEES}`);
  return Math.round(n * 100) / 100;
}

function count(raw: unknown, what: string, max: number): number {
  const n = Number(raw ?? 0);
  if (!Number.isInteger(n) || n < 0 || n > max) bad(`${what} must be a whole number from 0 to ${max}`);
  return n;
}

function weekdays(raw: unknown, what: string): number[] {
  const days = Array.isArray(raw) ? raw.map(Number) : [];
  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) bad(`${what}: days must be 0 (Sun) to 6 (Sat)`);
  return [...new Set(days)].sort((a, b) => a - b);
}

/** A string or a number as text; anything else (an object, null) as blank. */
function str(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function window(open: unknown, close: unknown, what: string): { from: number; to: number } {
  const from = clockMinutes(str(open));
  const to = clockMinutes(str(close));
  if (from === null || to === null) bad(`${what}: use HH:mm times`);
  if ((to as number) <= (from as number)) bad(`${what}: the end must be after the start`);
  return { from: from as number, to: to as number };
}

function cleanSlots(raw: unknown): PricingSlot[] {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length > MAX_SLOTS) bad(`At most ${MAX_SLOTS} slots`);
  const slots = list.map((item: unknown, i) => {
    const s = rec(item);
    window(s.start_time, s.end_time, `Slot ${i + 1}`);
    const days = weekdays(s.days_of_week, `Slot ${i + 1}`);
    if (days.length === 0) bad(`Slot ${i + 1}: pick at least one day`);
    return { start_time: String(s.start_time), end_time: String(s.end_time), price: money(s.price, `Slot ${i + 1} price`), days_of_week: days };
  });
  for (let d = 0; d < 7; d += 1) {
    const day = slots
      .filter((s) => s.days_of_week.includes(d))
      .map((s) => window(s.start_time, s.end_time, 'Slot'))
      .sort((a, b) => a.from - b.from);
    if (day.some((w, i) => i > 0 && w.from < day[i - 1].to)) bad('Two slots overlap on the same day');
  }
  return slots;
}

function cleanHours(raw: unknown): DayHours[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<number>();
  return list.map((item: unknown) => {
    const h = rec(item);
    const day = Number(h.day);
    if (!Number.isInteger(day) || day < 0 || day > 6 || seen.has(day)) bad('Opening hours: one row per day, 0 (Sun) to 6 (Sat)');
    seen.add(day);
    window(h.open, h.close, 'Opening hours');
    return { day, open: String(h.open), close: String(h.close) };
  });
}

function cleanRule(item: unknown, i: number): PriceRule {
  const r = rec(item);
  const what = `Rule ${i + 1}`;
  const type = PRICE_RULE_TYPES.find((t) => t === r.type) ?? bad(`${what}: unknown rule type`);
  const mode = PRICE_RULE_MODES.find((m) => m === r.mode) ?? bad(`${what}: choose percent or flat`);
  const value = Number(r.value);
  if (!Number.isFinite(value) || Math.abs(value) > MAX_RUPEES) bad(`${what}: enter a value`);
  if (mode === 'PERCENT' && (value < -100 || value > 1000)) bad(`${what}: percent must be between -100 and 1000`);
  const rule: PriceRule = { type, label: str(r.label).trim().slice(0, 80), mode, value, days: [], dates: [], from: null, to: null };
  applyRuleTarget(rule, r, what);
  return rule;
}

/** When a rule applies: its weekdays, its dates, or its date range — by type. */
function applyRuleTarget(rule: PriceRule, r: Record<string, unknown>, what: string): void {
  if (rule.type === 'WEEKDAY_SURCHARGE') {
    rule.days = weekdays(r.days, what);
    if (rule.days.length === 0) bad(`${what}: pick at least one day`);
    return;
  }
  if (rule.type === 'DATE_OVERRIDE') {
    const dates = Array.isArray(r.dates) ? r.dates.map(String) : [];
    if (dates.length === 0 || dates.some((d: string) => !isYmd(d))) bad(`${what}: pick valid dates`);
    rule.dates = [...new Set<string>(dates)].sort((a, b) => a.localeCompare(b));
    return;
  }
  const from = typeof r.from === 'string' ? r.from : null;
  const to = typeof r.to === 'string' ? r.to : null;
  if (!isYmd(from) || !isYmd(to) || from > to) bad(`${what}: pick a valid date range`);
  rule.from = from;
  rule.to = to;
}

function checkModelLimits(p: VenuePricing) {
  if (p.model && p.model !== 'PER_SLOT' && p.base_rate <= 0) bad('Enter the rate');
  if (p.model === 'PER_SLOT' && p.slots.length === 0) bad('Add at least one slot');
  if (p.model === 'PER_PAX' && p.min_pax < 1) bad('Minimum guests must be at least 1');
  if (p.max_pax > 0 && p.max_pax < p.min_pax) bad('Maximum guests must be at least the minimum');
  if (p.max_hours > 0 && p.max_hours < p.min_hours) bad('Maximum hours must be at least the minimum');
  if (p.model === 'PER_HOUR' && (p.booking_increment_minutes < 15 || p.booking_increment_minutes % 15 !== 0)) {
    bad('Booking steps must be a multiple of 15 minutes');
  }
}

/** Validates and normalises a pricing input. Throws PricingInputError with a field-level message. */
export function cleanVenuePricing(input: unknown): VenuePricing {
  const raw = rec(input);
  const model = raw.model == null ? null : (VENUE_PRICING_MODELS.find((m) => m === raw.model) ?? bad('Choose a pricing model'));
  const rules = Array.isArray(raw.price_rules) ? raw.price_rules : [];
  if (rules.length > MAX_RULES) bad(`At most ${MAX_RULES} price rules`);
  const blocked = Array.isArray(raw.blocked_dates) ? raw.blocked_dates.map(String) : [];
  if (blocked.length > MAX_BLOCKED || blocked.some((d: string) => !isYmd(d))) bad('Blocked dates must be valid dates');
  const minHours = Number(raw.min_hours ?? 0);
  const maxHours = Number(raw.max_hours ?? 0);
  if (![minHours, maxHours].every((h) => Number.isFinite(h) && h >= 0 && h <= 24)) bad('Hours must be between 0 and 24');
  const pricing: VenuePricing = {
    model,
    base_rate: money(raw.base_rate, 'Rate'),
    min_pax: count(raw.min_pax, 'Minimum guests', 100_000),
    max_pax: count(raw.max_pax, 'Maximum guests', 100_000),
    min_hours: minHours,
    max_hours: maxHours,
    booking_increment_minutes: count(raw.booking_increment_minutes ?? 60, 'Booking step', 1440),
    min_spend: money(raw.min_spend, 'Minimum spend'),
    slots: cleanSlots(raw.slots),
    operating_hours: cleanHours(raw.operating_hours),
    price_rules: rules.map((item, i) => cleanRule(item, i)),
    deposit: money(raw.deposit, 'Deposit'),
    cleaning_fee: money(raw.cleaning_fee, 'Cleaning fee'),
    pet_fee: money(raw.pet_fee, 'Pet fee'),
    gst_enabled: !!raw.gst_enabled,
    blocked_dates: [...new Set<string>(blocked)].sort((a, b) => a.localeCompare(b)),
  };
  checkModelLimits(pricing);
  return pricing;
}
