/**
 * Duncit Coin's gold accent.
 *
 * Two tones rather than one "gold": a literal #D4AF37 sits at ~1.9:1 on white,
 * which fails text contrast outright, so light mode uses a darkened gold and
 * dark mode a lightened one. The tint is the chip background behind the icon —
 * the RN twin mirrors these exact values.
 */
export const COIN_GOLD_LIGHT = '#8C6D1F';
export const COIN_GOLD_DARK = '#E8C766';
export const COIN_GOLD_TINT = 'rgba(212,175,55,0.16)';

/** The readable gold for a colour mode. */
export const coinGold = (mode: string) => (mode === 'dark' ? COIN_GOLD_DARK : COIN_GOLD_LIGHT);
