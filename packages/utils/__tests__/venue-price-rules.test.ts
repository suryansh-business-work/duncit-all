/**
 * The Venue Pricing Module calendar: which rules price a day, the day's
 * at-a-glance rate (the server's stacking rule — a DATE_OVERRIDE wins alone,
 * otherwise every match applies on the base, never compounded, never below 0),
 * and the edits the MUI page and the Tamagui screen make to one date.
 */
import { describe, expect, it } from 'vitest';

import {
  DATE_OVERRIDE_RULE,
  dateOverrideOn,
  dayRate,
  priceRuleMatches,
  toggleDayKey,
  weekdayOfDay,
  withDateOverride,
  withoutDateOverride,
  type PriceRuleLike,
} from '../src/venue-price-rules';

const SATURDAY = '2026-10-24';
const saturdayPlus20: PriceRuleLike = { type: 'WEEKDAY_SURCHARGE', days: [6], mode: 'PERCENT', value: 20 };
const diwaliRange: PriceRuleLike = { type: 'DATE_RANGE', from: '2026-10-20', to: '2026-10-24', mode: 'PERCENT', value: 10 };
const override = (dates: string[] | null, value: number, mode = 'FLAT'): PriceRuleLike => ({
  type: DATE_OVERRIDE_RULE,
  dates,
  mode,
  value,
});

describe('weekdayOfDay', () => {
  it('reads the weekday of the day key itself, 0 = Sunday', () => {
    expect(weekdayOfDay(SATURDAY)).toBe(6);
    expect(weekdayOfDay('2026-10-25')).toBe(0);
  });
});

describe('priceRuleMatches', () => {
  it('matches a weekday surcharge by weekday', () => {
    expect(priceRuleMatches(saturdayPlus20, SATURDAY, 6)).toBe(true);
    expect(priceRuleMatches(saturdayPlus20, '2026-10-23', 5)).toBe(false);
    expect(priceRuleMatches({ ...saturdayPlus20, days: null }, SATURDAY, 6)).toBe(false);
  });

  it('matches a date override by its dates', () => {
    expect(priceRuleMatches(override([SATURDAY], 100), SATURDAY, 6)).toBe(true);
    expect(priceRuleMatches(override(null, 100), SATURDAY, 6)).toBe(false);
  });

  it('matches a date range inclusively, and never when an end is missing', () => {
    expect(priceRuleMatches(diwaliRange, '2026-10-20', 2)).toBe(true);
    expect(priceRuleMatches(diwaliRange, '2026-10-24', 6)).toBe(true);
    expect(priceRuleMatches(diwaliRange, '2026-10-25', 0)).toBe(false);
    expect(priceRuleMatches({ ...diwaliRange, to: null }, '2026-10-21', 3)).toBe(false);
    expect(priceRuleMatches({ ...diwaliRange, from: '' }, '2026-10-21', 3)).toBe(false);
  });
});

describe('dayRate', () => {
  it('is the base rate on a day no rule names', () => {
    expect(dayRate(1000, [saturdayPlus20], '2026-10-23')).toBe(1000);
    expect(dayRate(1000, [], SATURDAY)).toBe(1000);
  });

  it('applies each matching surcharge to the base, never compounded', () => {
    expect(dayRate(1000, [saturdayPlus20], SATURDAY)).toBe(1200);
    // +20% and +10% of 1000, not 1000 × 1.2 × 1.1 = 1320.
    expect(dayRate(1000, [saturdayPlus20, diwaliRange], SATURDAY)).toBe(1300);
  });

  it('prices a day by its date override alone', () => {
    expect(dayRate(1000, [saturdayPlus20, diwaliRange, override([SATURDAY], -300)], SATURDAY)).toBe(700);
  });

  it('never drops below zero', () => {
    expect(dayRate(1000, [override([SATURDAY], -2000)], SATURDAY)).toBe(0);
  });

  it('rounds to the paisa like the server, reading unusable numbers as zero', () => {
    // 33% of ₹99.99 is 3299.67 paise → 3300.
    expect(dayRate(99.99, [{ ...saturdayPlus20, value: 33 }], SATURDAY)).toBe(132.99);
    expect(dayRate(500, [{ ...saturdayPlus20, value: Number.NaN }], SATURDAY)).toBe(500);
    expect(dayRate(500, [override([SATURDAY], Number.NaN)], SATURDAY)).toBe(500);
    expect(dayRate(Number.NaN, [override([SATURDAY], 250)], SATURDAY)).toBe(250);
  });
});

describe('date override edits', () => {
  const christmas = override(['2026-12-25', '2026-12-31'], 500);
  const rules: PriceRuleLike[] = [saturdayPlus20, christmas, override(null, 50)];

  it('finds the override that prices a day, if any', () => {
    expect(dateOverrideOn(rules, '2026-12-31')).toBe(christmas);
    expect(dateOverrideOn(rules, SATURDAY)).toBeUndefined();
  });

  it('takes the day out of its override, dropping an override left with no dates', () => {
    const once = withoutDateOverride(rules, '2026-12-25');
    expect(once).toEqual([saturdayPlus20, { ...christmas, dates: ['2026-12-31'] }, rules[2]]);
    expect(withoutDateOverride(once, '2026-12-31')).toEqual([saturdayPlus20, rules[2]]);
    // A day no override names leaves the rules as they were.
    expect(withoutDateOverride(rules, SATURDAY)).toEqual(rules);
  });

  it('makes the given override the day’s only one', () => {
    const next = withDateOverride(rules, '2026-12-25', override(['ignored'], 900));
    expect(next).toEqual([saturdayPlus20, { ...christmas, dates: ['2026-12-31'] }, rules[2], override(['2026-12-25'], 900)]);
    expect(dateOverrideOn(next, '2026-12-25')?.value).toBe(900);
  });
});

describe('toggleDayKey', () => {
  it('adds a day in sorted order, or takes it out when present', () => {
    expect(toggleDayKey(['2026-12-31', '2026-12-01'], '2026-12-25')).toEqual(['2026-12-01', '2026-12-25', '2026-12-31']);
    expect(toggleDayKey(['2026-12-01', '2026-12-25'], '2026-12-25')).toEqual(['2026-12-01']);
    expect(toggleDayKey([], '2026-12-25')).toEqual(['2026-12-25']);
  });
});
