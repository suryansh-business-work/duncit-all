import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

/**
 * Frosted-glass surface: translucent background + blur + a 1px light border,
 * adapting opacity to the active light/dark palette mode. Shared by the login
 * card and the promo card so both read consistently over the foggy backdrop.
 */
export function glass(theme: Theme) {
  const dark = theme.palette.mode === 'dark';
  const { black, white } = theme.palette.common;
  return {
    background: dark ? alpha(black, 0.55) : alpha(white, 0.55),
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${dark ? alpha(white, 0.12) : alpha(white, 0.6)}`,
    boxShadow: `0 20px 60px ${alpha(black, dark ? 0.55 : 0.18)}`,
  } as const;
}

/**
 * The login screen's fixed "ink" CTA treatment (submit button, tagline badge,
 * promo card button) — a deliberately mode-invariant near-black-on-white
 * accent, kept in one place so the login form, promo card and screen shell
 * can't drift from each other.
 */
export const inkCta = {
  bgcolor: '#0b0b0f',
  color: '#fff',
  hoverBgcolor: '#000',
} as const;
