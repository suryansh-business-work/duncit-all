import { semantic } from '@duncit/auth-tokens';
import { formatMoney } from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';

/**
 * The colour of each slot status — the day-cell badges, the legend pills and
 * the day sheet's status pill all read it, so the three cannot disagree. The
 * same hues the MUI calendar in @duncit/availability-calendar paints (success,
 * info, warning, grey), so a status reads alike on both apps (rule 27). Info
 * has no theme key, so it is the shared token, as `club-admin/tone` reads it.
 */
export const SLOT_STATUS_TONE = {
  AVAILABLE: '$success',
  PENDING: semantic.info,
  BOOKED: '$warning',
  BLOCKED: '$muted',
} as const;

const TONE_BY_STATUS: Readonly<Record<string, string>> = SLOT_STATUS_TONE;

/** The tone of any status the server sends — muted for one this build predates. */
export const slotStatusTone = (status: string): string => TONE_BY_STATUS[status] ?? '$muted';

/** "₹399", or the word for a free slot. */
export const slotPriceLabel = (price: number, t: Translate): string =>
  price > 0 ? formatMoney(price) : t('availability.free');

/** "Court 1 · holds 4" — the capacity is what tells two courts apart. */
export function spaceOptionLabel(space: { label: string; capacity: number }, t: Translate): string {
  const label = space.label || t('availability.wholeVenue');
  if (space.capacity <= 0) return label;
  return t('availability.spaceHolds', { vars: { label, capacity: space.capacity } });
}
