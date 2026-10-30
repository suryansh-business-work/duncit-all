import { keyframes } from '@mui/material';
import type { Theme } from '@mui/material/styles';

/** The gradient drifts across its box, slowly — alive, not a banner ad. */
const drift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

export const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

/**
 * The animated brand gradient the Earn with Duncit surfaces wear — the Home
 * card and the sidebar's Earn tile — from the theme's own palette. The motion
 * stops for people who ask for less (WCAG 2.2.2).
 */
export const ANIMATED_BRAND_GRADIENT_SX = {
  color: 'primary.contrastText',
  backgroundImage: (theme: Theme) =>
    `linear-gradient(120deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.dark})`,
  backgroundSize: '300% 300%',
  animation: `${drift} 10s ease infinite`,
  [REDUCED_MOTION]: { animation: 'none' },
} as const;
