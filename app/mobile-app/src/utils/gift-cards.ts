import { GiftCardStatus, type GiftCardScopeType } from '@/generated/graphql/graphql';
import type { GiftCardDeliveryMode } from '@duncit/forms/schemas';
import { POD_WEB_BASE } from '@/utils/pod-format';

/**
 * What the buy page hands the gift-card checkout: the default design (a display
 * snapshot — the server freezes its own copy on payment success), the amount
 * of one card, how many, how they travel and who they are for. Twin of mWeb's.
 */
export interface GiftCardSelection {
  design_id: string;
  design_name: string;
  front_url: string;
  back_url: string;
  /** Face value of one card, within the configured min/max. */
  amount: number;
  quantity: number;
  delivery_mode: GiftCardDeliveryMode;
  /** Charged once on a printed order; 0 for email. */
  shipping_fee: number;
  /** Digital only: sent to someone else. */
  gift: boolean;
  /** Empty strings mean nobody is named (a card kept for yourself). */
  recipient_email: string;
  recipient_name: string;
  message: string;
}

/** The theme fields every card shape (server card or local selection) carries —
 * what the visual needs to pick its colors. */
export interface GiftCardTheme {
  scope_type: GiftCardScopeType;
  scope_category_id?: string | null;
  scope_name: string;
  /** The catalogue design's name — the card's title when set. */
  design_name?: string | null;
}

const DEFAULT_GRADIENT: readonly [string, string] = ['#7b4397', '#dc2430'];

/** Fixed palette of tasteful gradient pairs. Design constants (like the app's
 * backdrop gradients), not business data — the theme decides WHICH pair. */
const GIFT_CARD_GRADIENTS: readonly (readonly [string, string])[] = [
  DEFAULT_GRADIENT,
  ['#1a2980', '#26d0ce'],
  ['#134e5e', '#71b280'],
  ['#c33764', '#1d2671'],
  ['#42275a', '#734b6d'],
  ['#0f2027', '#2c5364'],
  ['#ff512f', '#dd2476'],
  ['#4b6cb7', '#182848'],
];

/** Deterministic palette pick: hash the category id (falling back to the name,
 * then the scope type) so one category always renders the same card. */
export function giftCardGradient(theme: GiftCardTheme): readonly [string, string] {
  const seed = theme.scope_category_id || theme.scope_name || theme.scope_type;
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 9973;
  return GIFT_CARD_GRADIENTS[hash % GIFT_CARD_GRADIENTS.length] ?? DEFAULT_GRADIENT;
}

/** The mWeb claim link a card travels as (twin of the emailed link). */
export function giftCardShareLink(code: string): string {
  return `${POD_WEB_BASE}/gift-card/${code}`;
}

/** Status → its localized chip label key (full literals — never composed). */
export const GIFT_CARD_STATUS_KEYS: Record<GiftCardStatus, string> = {
  [GiftCardStatus.Active]: 'mweb.giftCards.statusActive',
  [GiftCardStatus.Redeemed]: 'mweb.giftCards.statusRedeemed',
  [GiftCardStatus.Expired]: 'mweb.giftCards.statusExpired',
};
