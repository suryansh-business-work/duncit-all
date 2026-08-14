/**
 * The gift card gradient palette — a fixed set of tasteful, dark-enough pairs
 * that white copy stays readable on every one. A card's colors are picked
 * DETERMINISTICALLY from its scope (category id, else name, else the SHOP
 * scope), so a category always wears the same gradient wherever it renders —
 * picker preview, my-cards tile, checkout, claim page and the email alike.
 */
export interface GiftCardGradient {
  from: string;
  to: string;
}

export const GIFT_CARD_GRADIENTS: readonly GiftCardGradient[] = [
  { from: '#4527a0', to: '#7b1fa2' }, // deep violet
  { from: '#0d47a1', to: '#00838f' }, // ocean
  { from: '#880e4f', to: '#d81b60' }, // raspberry
  { from: '#1b5e20', to: '#00897b' }, // forest
  { from: '#bf360c', to: '#f57c00' }, // ember
  { from: '#263238', to: '#546e7a' }, // slate
  { from: '#4a148c', to: '#c2185b' }, // orchid
  { from: '#01579b', to: '#5e35b1' }, // twilight
];

/** Stable string hash → palette slot; same seed, same gradient, everywhere. */
export function giftCardGradient(seed: string): GiftCardGradient {
  let hash = 0;
  for (const ch of seed) {
    hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 100003;
  }
  return GIFT_CARD_GRADIENTS[hash % GIFT_CARD_GRADIENTS.length];
}
