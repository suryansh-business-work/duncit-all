/**
 * The venue's terms as Create Pod shows them before a time is picked — what
 * the venue owner set in the Venue Pricing Module, read-only: how it prices,
 * its limits, its price rules, its fees and its open hours. mWeb's MUI card
 * and the native Tamagui card both render these rows, so the two never differ
 * (rules 29 + 56). The exact price of a window stays the server's quote.
 */
import { bookingRateText, venueBookingModelKey, type BookingTranslate } from './venue-booking';
import { priceRuleChange, type PriceRuleLike } from './venue-price-rules';

/** The `venuePricing` fields the summary reads (VENUE_BOOKING_PRICING_SDL). */
export interface VenueTermsSource {
  model?: string | null;
  base_rate: number;
  min_pax: number;
  max_pax: number;
  min_hours: number;
  max_hours: number;
  booking_increment_minutes: number;
  min_spend: number;
  slots: readonly { price: number; days_of_week: readonly number[] }[];
  /** 'HH:mm' wall times per weekday (0 = Sunday). */
  operating_hours: readonly { day: number; open: string; close: string }[];
  price_rules: readonly PriceRuleLike[];
  deposit: number;
  cleaning_fee: number;
  pet_fee: number;
  gst_enabled: boolean;
}

/** How each app writes the values, in the admin's own formats. */
export interface VenueTermsFormat {
  t: BookingTranslate;
  money: (rupees: number) => string;
  /** An 'HH:mm' wall time. */
  clock: (hhmm: string) => string;
  /** A 'YYYY-MM-DD' day. */
  date: (ymd: string) => string;
  /** A weekday's short name, 0 = Sunday. */
  weekday: (day: number) => string;
  /** Today, 'YYYY-MM-DD' in the admin zone — rules wholly in the past are left out. */
  today: string;
}

export interface VenueTermsRow {
  id: string;
  label: string;
  value: string;
}

export interface VenueTermsSection {
  id: 'booking' | 'rules' | 'fees' | 'hours';
  title: string;
  rows: VenueTermsRow[];
}

/** How many dates a date rule lists before "and N more". */
export const TERMS_DATES_SHOWN = 3;

const row = (id: string, label: string, value: string): VenueTermsRow[] => (value ? [{ id, label, value }] : []);

/** Monday first, Sunday last — the order the week reads in. */
const weekOrder = (day: number) => (day + 6) % 7;
const byWeek = (a: number, b: number) => weekOrder(a) - weekOrder(b);

function rateRow(src: Readonly<VenueTermsSource>, f: Readonly<VenueTermsFormat>): VenueTermsRow[] {
  if (src.model !== 'PER_SLOT') {
    return row('rate', f.t('mweb.createPod.venueTerms.rate'), bookingRateText(src.model, src.base_rate, f.t, f.money));
  }
  const prices = src.slots.filter((slot) => slot.days_of_week.length > 0).map((slot) => slot.price);
  if (prices.length === 0) return [];
  const low = Math.min(...prices);
  const value =
    low === Math.max(...prices) ? f.money(low) : f.t('mweb.createPod.venueTerms.slotsFrom', { vars: { price: f.money(low) } });
  return row('rate', f.t('mweb.createPod.venueTerms.slotPrice'), value);
}

function guestsRow(src: Readonly<VenueTermsSource>, f: Readonly<VenueTermsFormat>): VenueTermsRow[] {
  if (src.model !== 'PER_PAX') return [];
  const min = Math.max(1, src.min_pax);
  const value =
    src.max_pax > 0
      ? f.t('mweb.createPod.bookingGuestsRange', { vars: { min, max: src.max_pax } })
      : f.t('mweb.createPod.bookingGuestsMin', { vars: { min } });
  return row('guests', f.t('mweb.createPod.venueTerms.guests'), value);
}

function hoursLimitRow(src: Readonly<VenueTermsSource>, f: Readonly<VenueTermsFormat>): VenueTermsRow[] {
  if (src.model !== 'PER_HOUR') return [];
  const { min_hours: min, max_hours: max } = src;
  let value = '';
  if (min > 0 && max > 0) value = f.t('mweb.createPod.venueTerms.hoursRange', { vars: { min, max } });
  else if (min > 0) value = f.t('mweb.createPod.venueTerms.hoursMin', { vars: { min } });
  else if (max > 0) value = f.t('mweb.createPod.venueTerms.hoursMax', { vars: { max } });
  return row('hours', f.t('mweb.createPod.venueTerms.bookingLength'), value);
}

function stepRow(src: Readonly<VenueTermsSource>, f: Readonly<VenueTermsFormat>): VenueTermsRow[] {
  const minutes = Math.floor(Number(src.booking_increment_minutes) || 0);
  if (src.model === 'PER_SLOT' || minutes <= 0) return [];
  return row('step', f.t('mweb.createPod.venueTerms.step'), f.t('mweb.createPod.venueTerms.stepMinutes', { vars: { minutes } }));
}

const RULE_KEY: Record<string, string> = {
  WEEKDAY_SURCHARGE: 'mweb.createPod.quote.ruleWeekday',
  DATE_OVERRIDE: 'mweb.createPod.quote.ruleDate',
  DATE_RANGE: 'mweb.createPod.quote.ruleRange',
};

/** When the rule applies, or '' when it never will again. */
function ruleWhen(rule: Readonly<PriceRuleLike>, f: Readonly<VenueTermsFormat>, change: string): string {
  if (rule.type === 'WEEKDAY_SURCHARGE') {
    const days = [...(rule.days ?? [])].sort(byWeek);
    if (days.length === 0) return '';
    return f.t('mweb.createPod.venueTerms.ruleOn', { vars: { change, when: days.map((day) => f.weekday(day)).join(', ') } });
  }
  if (rule.type === 'DATE_OVERRIDE') {
    const dates = (rule.dates ?? []).filter((ymd) => ymd >= f.today).sort((a, b) => a.localeCompare(b));
    if (dates.length === 0) return '';
    const when = dates.slice(0, TERMS_DATES_SHOWN).map((ymd) => f.date(ymd)).join(', ');
    const count = dates.length - TERMS_DATES_SHOWN;
    return count > 0
      ? f.t('mweb.createPod.venueTerms.ruleOnMore', { vars: { change, when, count } })
      : f.t('mweb.createPod.venueTerms.ruleOn', { vars: { change, when } });
  }
  if (!rule.from || !rule.to || rule.to < f.today) return '';
  return f.t('mweb.createPod.venueTerms.ruleBetween', { vars: { change, from: f.date(rule.from), to: f.date(rule.to) } });
}

function ruleRows(src: Readonly<VenueTermsSource>, f: Readonly<VenueTermsFormat>): VenueTermsRow[] {
  return src.price_rules.flatMap((rule, index) => {
    const label = rule.label ? rule.label : f.t(RULE_KEY[rule.type] ?? 'mweb.createPod.quote.ruleDate');
    return row(`rule-${index}`, label, ruleWhen(rule, f, priceRuleChange(rule.mode, rule.value, f.money)));
  });
}

const moneyRow = (id: string, label: string, amount: number, value: string) => (amount > 0 ? row(id, label, value) : []);

function feeRows(src: Readonly<VenueTermsSource>, f: Readonly<VenueTermsFormat>): VenueTermsRow[] {
  const { t, money } = f;
  return [
    ...moneyRow('min-spend', t('mweb.createPod.venueTerms.minSpend'), src.min_spend, money(src.min_spend)),
    ...moneyRow('cleaning', t('mweb.createPod.quote.cleaning'), src.cleaning_fee, money(src.cleaning_fee)),
    ...moneyRow(
      'pets',
      t('mweb.createPod.quote.pets'),
      src.pet_fee,
      t('mweb.createPod.venueTerms.petFeeValue', { vars: { amount: money(src.pet_fee) } })
    ),
    ...(src.gst_enabled ? row('gst', t('mweb.createPod.venueTerms.gst'), t('mweb.createPod.venueTerms.gstValue')) : []),
    ...moneyRow(
      'deposit',
      t('mweb.createPod.venueTerms.deposit'),
      src.deposit,
      t('mweb.createPod.venueTerms.depositValue', { vars: { amount: money(src.deposit) } })
    ),
  ];
}

/** Weekdays sharing one window read as one row; the days it never opens, as a
 * "Closed" row. A PER_SLOT venue's slots are its hours, so it has none. */
function hoursRows(src: Readonly<VenueTermsSource>, f: Readonly<VenueTermsFormat>): VenueTermsRow[] {
  if (src.model === 'PER_SLOT' || src.operating_hours.length === 0) return [];
  const spans = new Map<string, number[]>();
  for (const hours of [...src.operating_hours].sort((a, b) => byWeek(a.day, b.day))) {
    const span = f.t('mweb.createPod.venueTerms.hoursWindow', { vars: { open: f.clock(hours.open), close: f.clock(hours.close) } });
    spans.set(span, [...(spans.get(span) ?? []), hours.day]);
  }
  const open = new Set(src.operating_hours.map((hours) => hours.day));
  const shut = [0, 1, 2, 3, 4, 5, 6].filter((day) => !open.has(day)).sort(byWeek);
  return [
    ...[...spans].map(([span, days]) => ({ id: `hours-${days.join('')}`, label: days.map((day) => f.weekday(day)).join(', '), value: span })),
    ...(shut.length ? row('hours-closed', shut.map((day) => f.weekday(day)).join(', '), f.t('mweb.createPod.venueTerms.closed')) : []),
  ];
}

/**
 * The summary card's sections, in reading order — booking (model, rate,
 * limits, step), price changes still to come, fees and deposit, open hours.
 * Empty sections are left out.
 */
export function venuePricingTerms(src: Readonly<VenueTermsSource>, f: Readonly<VenueTermsFormat>): VenueTermsSection[] {
  const modelKey = venueBookingModelKey(src.model);
  const sections: VenueTermsSection[] = [
    {
      id: 'booking',
      title: f.t('mweb.createPod.venueTerms.sectionBooking'),
      rows: [
        ...(modelKey ? row('model', f.t('mweb.createPod.venueTerms.model'), f.t(modelKey)) : []),
        ...rateRow(src, f),
        ...guestsRow(src, f),
        ...hoursLimitRow(src, f),
        ...stepRow(src, f),
      ],
    },
    { id: 'rules', title: f.t('mweb.createPod.venueTerms.sectionRules'), rows: ruleRows(src, f) },
    { id: 'fees', title: f.t('mweb.createPod.venueTerms.sectionFees'), rows: feeRows(src, f) },
    { id: 'hours', title: f.t('mweb.createPod.venueTerms.sectionHours'), rows: hoursRows(src, f) },
  ];
  return sections.filter((section) => section.rows.length > 0);
}
