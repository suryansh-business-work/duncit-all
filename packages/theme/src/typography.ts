import type { ThemeOptions } from '@mui/material/styles';
import { tokens } from './tokens';

/**
 * Typography scale (headings + body + button) sourced entirely from tokens.
 *
 * A console scale, not a marketing one: the largest thing on a working page is
 * a KPI figure (h4), a page title is h5 and a section title h6. Headings share
 * one semibold, tightly-tracked treatment across every portal.
 */
export function buildTypography(): ThemeOptions['typography'] {
  const { weight, size, family } = tokens.font;
  const heading = (fontSize: string, letterSpacing: string) => ({
    fontSize,
    fontWeight: weight.semibold,
    letterSpacing,
    lineHeight: 1.25,
  });
  return {
    fontFamily: family,
    fontWeightRegular: weight.regular,
    fontWeightMedium: weight.medium,
    fontWeightBold: weight.bold,
    h1: { fontWeight: weight.bold, letterSpacing: '-0.025em' },
    h2: { fontWeight: weight.bold, letterSpacing: '-0.025em' },
    h3: heading(size.h3, '-0.022em'),
    h4: heading(size.h4, '-0.02em'),
    h5: heading(size.h5, '-0.015em'),
    h6: heading(size.h6, '-0.01em'),
    subtitle1: { fontSize: size.subtitle1, fontWeight: weight.semibold, lineHeight: 1.35 },
    subtitle2: { fontSize: size.subtitle2, fontWeight: weight.semibold, lineHeight: 1.35 },
    body1: { fontSize: size.body1, lineHeight: 1.5 },
    body2: { fontSize: size.body2, lineHeight: 1.45 },
    caption: { fontSize: size.caption, lineHeight: 1.4 },
    overline: { fontSize: size.overline, fontWeight: weight.semibold, letterSpacing: '0.06em', lineHeight: 1.6 },
    button: { fontSize: size.button, fontWeight: weight.medium, textTransform: 'none', letterSpacing: 0 },
  };
}
