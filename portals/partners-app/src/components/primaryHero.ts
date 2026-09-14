import { darken, type Theme } from '@mui/material/styles';

/**
 * The accent banner the brand, product, venue-registration and host pages open
 * with — white text on the accent.
 *
 * It paints `primary.dark`, never `primary.main`. In dark mode the portal theme
 * LIGHTENS `primary.main` so it reads as text on the dark page, which made the
 * old `primary.dark -> primary.main` gradient a light red under light text
 * (about 2:1). `primary.dark` is the pressed fill, which the theme keeps at
 * 4.5:1 under white in both modes (WCAG 1.4.3), and the darker start only
 * raises that.
 *
 * Text on it stays at full white: an opacity below 1 on the accent drops the
 * lighter end of the gradient under 4.5:1.
 */
export const primaryHeroBackground = (theme: Theme): string =>
  `linear-gradient(135deg, ${darken(theme.palette.primary.dark, 0.3)} 0%, ${theme.palette.primary.dark} 100%)`;
