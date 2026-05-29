import type { Theme } from '@mui/material/styles';

/**
 * Frosted-glass surface: translucent background + blur + a 1px light border,
 * adapting opacity to the active light/dark palette mode. Shared by the login
 * card and the promo card so both read consistently over the foggy backdrop.
 */
export function glass(theme: Theme) {
  const dark = theme.palette.mode === 'dark';
  return {
    background: dark ? 'rgba(18,18,22,0.55)' : 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)'}`,
    boxShadow: dark
      ? '0 20px 60px rgba(0,0,0,0.55)'
      : '0 20px 60px rgba(15,23,42,0.18)',
  } as const;
}
