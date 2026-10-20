import { formatMoney } from '@duncit/utils';
import type { PriceRuleMode, PriceRuleType, Translate, VenueClosedReason, VenuePricingModel } from './types';

/** Rupees with paise when there are any — a quote is exact, so it is never rounded for display. */
export function rupees(value: number): string {
  const decimals = Number.isInteger(value) ? 0 : 2;
  return formatMoney(value, { decimals });
}

/** "+20%", "-₹500" — a rule's adjustment as the owner set it. */
export function ruleValueLabel(mode: PriceRuleMode, value: number): string {
  const sign = value < 0 ? '-' : '+';
  const magnitude = Math.abs(value);
  return mode === 'PERCENT' ? `${sign}${magnitude}%` : `${sign}${rupees(magnitude)}`;
}

/** Literal keys per model, so the translation gate sees each one. */
export function modelLabel(t: Translate, model: VenuePricingModel): string {
  const labels: Record<VenuePricingModel, string> = {
    PER_PAX: t('venuePricing.model.perPax'),
    PER_HOUR: t('venuePricing.model.perHour'),
    PER_SLOT: t('venuePricing.model.perSlot'),
    FLAT: t('venuePricing.model.flat'),
  };
  return labels[model];
}

export function modelHint(t: Translate, model: VenuePricingModel): string {
  const hints: Record<VenuePricingModel, string> = {
    PER_PAX: t('venuePricing.model.perPaxHint'),
    PER_HOUR: t('venuePricing.model.perHourHint'),
    PER_SLOT: t('venuePricing.model.perSlotHint'),
    FLAT: t('venuePricing.model.flatHint'),
  };
  return hints[model];
}

/** "₹300 / guest", "₹1,000 / hour", "₹5,000" — the base rate with its unit. */
export function rateLabel(t: Translate, model: VenuePricingModel, rate: number): string {
  const price = rupees(rate);
  if (model === 'PER_PAX') return t('venuePricing.rate.perGuest', { vars: { price } });
  if (model === 'PER_HOUR') return t('venuePricing.rate.perHour', { vars: { price } });
  return price;
}

export function ruleTypeLabel(t: Translate, type: PriceRuleType): string {
  const labels: Record<PriceRuleType, string> = {
    WEEKDAY_SURCHARGE: t('venuePricing.rules.typeWeekday'),
    DATE_OVERRIDE: t('venuePricing.rules.typeOverride'),
    DATE_RANGE: t('venuePricing.rules.typeRange'),
  };
  return labels[type];
}

export function ruleModeLabel(t: Translate, mode: PriceRuleMode): string {
  return mode === 'PERCENT' ? t('venuePricing.rules.modePercent') : t('venuePricing.rules.modeFlat');
}

export function closedReasonLabel(t: Translate, reason: VenueClosedReason): string {
  const labels: Record<VenueClosedReason, string> = {
    PAST: t('venuePricing.closed.past'),
    TOO_FAR: t('venuePricing.closed.tooFar'),
    HOLIDAY: t('venuePricing.closed.holiday'),
    BLOCKED: t('venuePricing.closed.blocked'),
    WEEKLY_OFF: t('venuePricing.closed.weeklyOff'),
    CLOSED: t('venuePricing.closed.closed'),
  };
  return labels[reason];
}

/** The message of a failed request — the server's BAD_USER_INPUT names the field. */
export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
