import type { ThemeOptions } from '@mui/material/styles';
import { tokens } from './tokens';

/**
 * Typography scale (headings + body + button) sourced entirely from tokens.
 * Headings share the bold, tightly-tracked treatment across every portal.
 */
export function buildTypography(): ThemeOptions['typography'] {
  const { weight, size, family } = tokens.font;
  return {
    fontFamily: family,
    h1: { fontWeight: weight.bold, letterSpacing: '-0.02em' },
    h2: { fontWeight: weight.bold, letterSpacing: '-0.02em' },
    h3: { fontWeight: weight.semibold, letterSpacing: '-0.02em' },
    h4: { fontWeight: weight.semibold, letterSpacing: '-0.015em' },
    h5: { fontWeight: weight.semibold, letterSpacing: '-0.01em' },
    h6: { fontWeight: weight.semibold, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: weight.medium, lineHeight: 1.3 },
    subtitle2: { fontWeight: weight.medium, lineHeight: 1.3 },
    button: { fontWeight: weight.medium, textTransform: 'none', letterSpacing: 0 },
    body1: { fontSize: size.body1, lineHeight: 1.4 },
    body2: { fontSize: size.body2, lineHeight: 1.4 },
    caption: { fontSize: size.caption, lineHeight: 1.35 },
  };
}
