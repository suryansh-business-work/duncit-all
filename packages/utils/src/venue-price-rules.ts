/**
 * The Venue Pricing Module's calendar arithmetic — framework-free, so the MUI
 * page and the Tamagui screen edit one date the same way.
 *
 * The booking price itself is only ever computed on the server
 * (`venuePriceQuote`). `dayRate` is the calendar's at-a-glance figure: the
 * per-unit rate of a day with the venue's price rules applied by the server's
 * own stacking rule — when a DATE_OVERRIDE names the day, only overrides
 * apply; otherwise every matching weekday surcharge and date range applies,
 * each on the base, never compounded, never below zero.
 *
 * Days are 'YYYY-MM-DD' keys; weekdays are 0 = Sunday … 6 = Saturday.
 */

/** A price rule as the server holds it; `type` / `mode` are the enum strings. */
export interface PriceRuleLike {
  type: string;
  label?: string | null;
  days?: readonly number[] | null;
  dates?: readonly string[] | null;
  from?: string | null;
  to?: string | null;
  mode: string;
  value: number;
}

export const DATE_OVERRIDE_RULE = 'DATE_OVERRIDE';
const WEEKDAY_RULE = 'WEEKDAY_SURCHARGE';
const PERCENT_MODE = 'PERCENT';

/** The weekday of a day key, independent of the device's zone. */
export function weekdayOfDay(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

/** True when the rule matches the day (by its own type). */
export function priceRuleMatches(rule: PriceRuleLike, day: string, weekday: number): boolean {
  if (rule.type === WEEKDAY_RULE) return (rule.days ?? []).includes(weekday);
  if (rule.type === DATE_OVERRIDE_RULE) return (rule.dates ?? []).includes(day);
  return !!rule.from && !!rule.to && rule.from <= day && day <= rule.to;
}

/** The DATE_OVERRIDE rule that prices this day, if any. */
export function dateOverrideOn<R extends PriceRuleLike>(rules: readonly R[], day: string): R | undefined {
  return rules.find((rule) => rule.type === DATE_OVERRIDE_RULE && (rule.dates ?? []).includes(day));
}

/**
 * The rules with this day taken out of every DATE_OVERRIDE. An override left
 * naming no date is dropped — the server refuses an override without dates.
 */
export function withoutDateOverride<R extends PriceRuleLike>(rules: readonly R[], day: string): R[] {
  const next: R[] = [];
  for (const rule of rules) {
    const dates = rule.dates ?? [];
    if (rule.type !== DATE_OVERRIDE_RULE || !dates.includes(day)) {
      next.push(rule);
      continue;
    }
    const rest = dates.filter((date) => date !== day);
    if (rest.length > 0) next.push({ ...rule, dates: rest });
  }
  return next;
}

/** The rules with `override` as this day's only DATE_OVERRIDE. */
export function withDateOverride<R extends PriceRuleLike>(rules: readonly R[], day: string, override: R): R[] {
  return [...withoutDateOverride(rules, day), { ...override, dates: [day] }];
}

/** Adds the day to a sorted day list, or takes it out when it is already there. */
export function toggleDayKey(days: readonly string[], day: string): string[] {
  const next = days.includes(day) ? days.filter((key) => key !== day) : [...days, day];
  return next.sort((a, b) => a.localeCompare(b));
}

const toPaise = (rupees: number) => Math.round((Number(rupees) || 0) * 100);

/** The day's per-unit rate after its price rules, in rupees (paise-rounded like the server). */
export function dayRate(baseRate: number, rules: readonly PriceRuleLike[], day: string): number {
  const weekday = weekdayOfDay(day);
  const basePaise = toPaise(baseRate);
  const matching = rules.filter((rule) => priceRuleMatches(rule, day, weekday));
  const overrides = matching.filter((rule) => rule.type === DATE_OVERRIDE_RULE);
  const used = overrides.length > 0 ? overrides : matching;
  const totalPaise = used.reduce(
    (sum, rule) =>
      sum +
      (rule.mode === PERCENT_MODE
        ? Math.round((basePaise * (Number(rule.value) || 0)) / 100)
        : toPaise(rule.value)),
    0,
  );
  return Math.max(0, basePaise + totalPaise) / 100;
}
