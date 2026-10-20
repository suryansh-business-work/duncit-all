import type { PriceRuleMode, PricingRule } from '../../types';

/** One date's price change, as the drawer's form holds it. */
export interface DayOverrideValues {
  mode: PriceRuleMode;
  /** Percent or rupees on the base; negative = discount. NaN while emptied. */
  value: number;
  label: string;
}

/** The date's current override as form values, or a +10% starting point. */
export function dayOverrideValues(rule: PricingRule | null): DayOverrideValues {
  return { mode: rule?.mode ?? 'PERCENT', value: rule?.value ?? 10, label: rule?.label ?? '' };
}
