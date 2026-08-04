import type { ThemePref } from '@/services/theme';

/**
 * Duncit Coin's gold accent — a direct port of mWeb's `theme/coinGold.ts`, so a
 * coin reads the same gold on web and native (rule 27).
 *
 * Two tones rather than one "gold": a literal #D4AF37 sits at ~1.9:1 on white,
 * which fails text contrast outright, so light mode uses a darkened gold and
 * dark mode a lightened one. The tint is the chip background behind the icon.
 */
export const COIN_GOLD_LIGHT = '#8C6D1F';
export const COIN_GOLD_DARK = '#E8C766';
export const COIN_GOLD_TINT = 'rgba(212,175,55,0.16)';

/** The readable gold per colour scheme — a map, so a lookup replaces a branch. */
export const COIN_GOLD: Record<ThemePref, string> = {
  light: COIN_GOLD_LIGHT,
  dark: COIN_GOLD_DARK,
};
