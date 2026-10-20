import {
  dateOverrideOn,
  dayRate,
  toggleDayKey,
  withDateOverride,
  type PriceRuleLike,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface PriceRulesMock {
  baseRate: number;
  /** A +% surcharge on Saturdays and Sundays. */
  weekendPercent: number;
  /** The day the calendar sheet is open on, YYYY-MM-DD. */
  day: string;
  /** That day's own flat price change (the DATE_OVERRIDE); 0 = none. */
  overrideFlat: number;
}

export const venuePriceRulesDemos: PackageDemo[] = [
  defineDemo<PriceRulesMock>({
    id: 'venue-price-rules',
    title: 'venue-price-rules — one calendar date of a venue pricing',
    note:
      'Pick a Saturday (2026-10-24) or a weekday. With overrideFlat 0 the weekend surcharge applies; any other value becomes the day override and, by the server stacking rule, the only rule that prices that day. The booking price itself always comes from venuePriceQuote.',
    mock: { baseRate: 1000, weekendPercent: 20, day: '2026-10-24', overrideFlat: 0 },
    compute: ({ baseRate, weekendPercent, day, overrideFlat }) => {
      const weekend: PriceRuleLike = { type: 'WEEKDAY_SURCHARGE', mode: 'PERCENT', value: weekendPercent, days: [0, 6] };
      const rules =
        overrideFlat === 0
          ? [weekend]
          : withDateOverride([weekend], day, { type: 'DATE_OVERRIDE', mode: 'FLAT', value: overrideFlat });
      return {
        rate: dayRate(baseRate, rules, day),
        override: dateOverrideOn(rules, day) ?? null,
        blockedAfterToggle: toggleDayKey(['2026-12-31'], day),
      };
    },
  }),
];
