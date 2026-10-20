/**
 * THE venue price calculation. The Create Pod preview, the Venue Pricing
 * Module preview and the booking itself all ask this one function (through
 * `venuePriceQuote` and the booking write) — a client never sends a price.
 *
 * Order: base by model → price rules → minimum-spend top-up → fees → GST on
 * the venue price → Duncit's venue commission ON TOP. All arithmetic is on
 * integer paise, rounded half-up once per line, so the lines always add up.
 *
 * Rule stacking: when a DATE_OVERRIDE matches the day, only date overrides
 * apply (it is the venue saying "this date is priced like this"). Otherwise
 * every matching WEEKDAY_SURCHARGE and DATE_RANGE applies, each computed on
 * the base (never compounded). The adjusted price never goes below zero.
 */
import type {
  AppliedRule,
  PriceRule,
  QuoteRequest,
  QuoteResult,
  VenuePricing,
  VenuePricingModel,
} from './venuePricing.types';
import { clockMinutes, localParts } from './venuePricing.time';

const toPaise = (rupees: number) => Math.round((Number(rupees) || 0) * 100);
const toRupees = (paise: number) => paise / 100;
const pctOf = (paise: number, pct: number) => Math.round((paise * pct) / 100);

type QuoteFailure = Exclude<QuoteResult, { ok: true }>;

const fail = (code: QuoteFailure['code'], message: string): QuoteFailure => ({
  ok: false,
  code,
  message,
});

/** True when the venue has finished its pricing setup and can be booked. */
export function isPricingConfigured(pricing: Partial<VenuePricing> | null | undefined): boolean {
  if (!pricing?.model) return false;
  if (pricing.model === 'PER_SLOT') return (pricing.slots ?? []).some((s) => (s.days_of_week ?? []).length > 0);
  return Number(pricing.base_rate) > 0;
}

function ruleMatches(rule: PriceRule, ymd: string, weekday: number): boolean {
  if (rule.type === 'WEEKDAY_SURCHARGE') return (rule.days ?? []).includes(weekday);
  if (rule.type === 'DATE_OVERRIDE') return (rule.dates ?? []).includes(ymd);
  return !!rule.from && !!rule.to && rule.from <= ymd && ymd <= rule.to;
}

const RULE_LABEL: Record<PriceRule['type'], string> = {
  WEEKDAY_SURCHARGE: 'Weekday surcharge',
  DATE_OVERRIDE: 'Date price',
  DATE_RANGE: 'Date range',
};

/** The rules that apply to this day, by the stacking rule above, priced on `basePaise`. */
export function applicableRules(
  rules: readonly PriceRule[],
  ymd: string,
  weekday: number,
  basePaise: number
): { applied: AppliedRule[]; totalPaise: number } {
  const matching = rules.filter((r) => ruleMatches(r, ymd, weekday));
  const overrides = matching.filter((r) => r.type === 'DATE_OVERRIDE');
  const used = overrides.length > 0 ? overrides : matching;
  let totalPaise = 0;
  const applied = used.map((rule) => {
    const amountPaise = rule.mode === 'PERCENT' ? pctOf(basePaise, Number(rule.value) || 0) : toPaise(rule.value);
    totalPaise += amountPaise;
    return {
      type: rule.type,
      label: rule.label?.trim() || RULE_LABEL[rule.type],
      mode: rule.mode,
      value: Number(rule.value) || 0,
      amount: toRupees(amountPaise),
    };
  });
  return { applied, totalPaise };
}

type BaseResult = { ok: true; ratePaise: number; basePaise: number; pax: number; hours: number } | QuoteFailure;

function basePerPax(p: VenuePricing, pax: number): BaseResult {
  if (pax < Math.max(1, p.min_pax || 0) || (p.max_pax > 0 && pax > p.max_pax)) {
    return fail('PAX_OUT_OF_RANGE', `Guests must be between ${Math.max(1, p.min_pax || 0)} and ${p.max_pax || 'any'}`);
  }
  const ratePaise = toPaise(p.base_rate);
  return { ok: true, ratePaise, basePaise: ratePaise * pax, pax, hours: 0 };
}

function basePerHour(p: VenuePricing, minutes: number, startMinutes: number): BaseResult {
  const step = Math.max(0, Math.floor(p.booking_increment_minutes || 0));
  if (step > 0 && (minutes % step !== 0 || startMinutes % step !== 0)) {
    return fail('INCREMENT_MISMATCH', `Bookings go in steps of ${step} minutes`);
  }
  const hours = minutes / 60;
  if (hours < (p.min_hours || 0) || (p.max_hours > 0 && hours > p.max_hours)) {
    return fail('HOURS_OUT_OF_RANGE', `Book between ${p.min_hours || 0} and ${p.max_hours || 'any'} hours`);
  }
  const ratePaise = toPaise(p.base_rate);
  return { ok: true, ratePaise, basePaise: Math.round(ratePaise * hours), pax: 0, hours };
}

function basePerSlot(p: VenuePricing, weekday: number, startMinutes: number, endMinutes: number): BaseResult {
  const slot = (p.slots ?? []).find(
    (s) =>
      (s.days_of_week ?? []).includes(weekday) &&
      clockMinutes(s.start_time) === startMinutes &&
      clockMinutes(s.end_time) === endMinutes
  );
  if (!slot) return fail('NO_SUCH_SLOT', 'The venue has no slot at this time');
  const ratePaise = toPaise(slot.price);
  return { ok: true, ratePaise, basePaise: ratePaise, pax: 0, hours: (endMinutes - startMinutes) / 60 };
}

function baseFor(model: VenuePricingModel, p: VenuePricing, req: QuoteRequest, startMinutes: number, weekday: number): BaseResult {
  const minutes = Math.round((req.end.getTime() - req.start.getTime()) / 60_000);
  if (model === 'PER_PAX') return basePerPax(p, Math.floor(Number(req.pax) || 0));
  if (model === 'PER_HOUR') return basePerHour(p, minutes, startMinutes);
  if (model === 'PER_SLOT') return basePerSlot(p, weekday, startMinutes, startMinutes + minutes);
  const ratePaise = toPaise(p.base_rate);
  return { ok: true, ratePaise, basePaise: ratePaise, pax: 0, hours: minutes / 60 };
}

/** Prices one booking window at a venue. Pure: same inputs, same breakdown. */
export function quoteVenuePrice(pricing: VenuePricing | null | undefined, req: QuoteRequest): QuoteResult {
  if (!pricing || !isPricingConfigured(pricing) || !pricing.model) {
    return fail('NOT_CONFIGURED', 'This venue has not set up its pricing yet');
  }
  if (Number.isNaN(req.start.getTime()) || Number.isNaN(req.end.getTime()) || req.end <= req.start) {
    return fail('INVALID_WINDOW', 'Pick a start and an end time');
  }
  const { ymd, weekday, minutes: startMinutes } = localParts(req.start, req.timeZone);
  const base = baseFor(pricing.model, pricing, req, startMinutes, weekday);
  if (!base.ok) return base;

  const rules = applicableRules(pricing.price_rules ?? [], ymd, weekday, base.basePaise);
  const adjustedPaise = Math.max(0, base.basePaise + rules.totalPaise);
  const minSpendPaise = toPaise(pricing.min_spend);
  const topUpPaise = Math.max(0, minSpendPaise - adjustedPaise);
  const cleaningPaise = Math.max(0, toPaise(pricing.cleaning_fee));
  const petPaise = req.pets ? Math.max(0, toPaise(pricing.pet_fee)) : 0;
  const venuePricePaise = adjustedPaise + topUpPaise + cleaningPaise + petPaise;
  const gstPct = pricing.gst_enabled ? Math.max(0, Number(req.gstPct) || 0) : 0;
  const taxesPaise = pctOf(venuePricePaise, gstPct);
  const payoutPaise = venuePricePaise + taxesPaise;
  const feePct = Math.max(0, Number(req.commissionPct) || 0);
  const feePaise = pctOf(venuePricePaise, feePct);

  return {
    ok: true,
    breakdown: {
      model: pricing.model,
      rate: toRupees(base.ratePaise),
      pax: base.pax,
      hours: base.hours,
      date: ymd,
      base: toRupees(base.basePaise),
      rules: rules.applied,
      rules_total: toRupees(rules.totalPaise),
      min_spend_top_up: toRupees(topUpPaise),
      cleaning_fee: toRupees(cleaningPaise),
      pet_fee: toRupees(petPaise),
      venue_price: toRupees(venuePricePaise),
      gst_pct: gstPct,
      taxes: toRupees(taxesPaise),
      venue_payout: toRupees(payoutPaise),
      platform_fee_pct: feePct,
      platform_fee: toRupees(feePaise),
      total: toRupees(payoutPaise + feePaise),
      deposit: Math.max(0, Number(pricing.deposit) || 0),
    },
  };
}
