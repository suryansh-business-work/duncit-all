import { formatMoney } from '@duncit/utils';
import { SLOT_PRICE_UNIT_KEY, slotPricingModeOf } from '@duncit/slots';

import type { Translate } from '@/i18n/fallback';

/**
 * The colour of each slot status — the day-cell badges, the legend pills and
 * the day sheet's status pill all read it, so the three cannot disagree. The
 * same hues the MUI calendar in @duncit/availability-calendar paints (success,
 * info, warning, grey), so a status reads alike on both apps (rule 27). Every
 * one is a mode-aware theme key, so the text stays AA in dark mode too.
 */
export const SLOT_STATUS_TONE = {
  AVAILABLE: '$success',
  PENDING: '$info',
  BOOKED: '$warning',
  BLOCKED: '$muted',
} as const;

const TONE_BY_STATUS: Readonly<Record<string, string>> = SLOT_STATUS_TONE;

/** The tone of any status the server sends — muted for one this build predates. */
export const slotStatusTone = (status: string): string => TONE_BY_STATUS[status] ?? '$muted';

/** "₹399", or the word for a free slot. */
/** The slot's price as its mode reads it (per slot, per hour, per guest), plus any overtime rate. */
export const slotPriceLabel = (
  slot: { price: number; pricing_mode?: unknown; overtime_rate?: number | null },
  t: Translate,
): string => {
  if (slot.price <= 0) return t('availability.free');
  const base = t(SLOT_PRICE_UNIT_KEY[slotPricingModeOf(String(slot.pricing_mode))], {
    vars: { price: formatMoney(slot.price) },
  });
  const overtime = slot.overtime_rate ?? 0;
  return overtime > 0
    ? `${base} ${t('availability.overtimeLabel', { vars: { price: formatMoney(overtime) } })}`
    : base;
};

/** "Court 1 · holds 4" — the capacity is what tells two courts apart. */
export function spaceOptionLabel(space: { label: string; capacity: number }, t: Translate): string {
  const label = space.label || t('availability.wholeVenue');
  if (space.capacity <= 0) return label;
  return t('availability.spaceHolds', { vars: { label, capacity: space.capacity } });
}
