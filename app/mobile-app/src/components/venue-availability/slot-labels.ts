import { formatMoney } from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';

/** "₹399", or the word for a free slot. */
export const slotPriceLabel = (price: number, t: Translate): string =>
  price > 0 ? formatMoney(price) : t('availability.free');

/** "Court 1 · holds 4" — the capacity is what tells two courts apart. */
export function spaceOptionLabel(space: { label: string; capacity: number }, t: Translate): string {
  const label = space.label || t('availability.wholeVenue');
  if (space.capacity <= 0) return label;
  return t('availability.spaceHolds', { vars: { label, capacity: space.capacity } });
}
