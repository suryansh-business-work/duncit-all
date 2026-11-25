import { alpha } from '@mui/material/styles';
import { tokens } from './tokens';
import { modeColors } from './mode-colors';
import type { AccentColors, ColorMode, ElevationShadows, ThemeCtx } from './types';

/**
 * The three floating-layer shadows for a mode. A dark layer vanishes into a
 * dark page on shadow alone, so in dark mode each also carries a faint inner
 * edge — the hairline that tells a menu apart from the panel under it.
 */
function shadowsFor(isDark: boolean): ElevationShadows {
  const { shadow, common } = tokens;
  const color = alpha(common.black, isDark ? shadow.alpha.dark : shadow.alpha.light);
  const edge = isDark ? `, inset 0 0 0 1px ${alpha(common.white, 0.06)}` : '';
  return {
    raised: `${shadow.raised} ${alpha(common.black, isDark ? 0.4 : 0.05)}`,
    overlay: `${shadow.overlay} ${color}${edge}`,
    dialog: `${shadow.dialog} ${color}${edge}`,
  };
}

/** `prop 180ms <ease>, …` on the system's one easing curve. */
const transition = (props: readonly string[], ms: number = tokens.motion.base): string =>
  props.map((prop) => `${prop} ${ms}ms ${tokens.motion.ease}`).join(', ');

/**
 * Build the derived theme context from the mode + brand accent. Everything the
 * component overrides need (ink, border, surfaces, states, shadows) is computed
 * here from `tokens` so no override file hardcodes a value.
 *
 * The accent is made WCAG AA-safe whatever a portal passes: `primary` is the
 * accent as text (darkened on the light grounds, lightened on the dark ones)
 * and `primaryFill` is the accent under white text, with hover and pressed
 * steps that only ever get darker.
 */
export function buildThemeCtx(mode: ColorMode, accent: AccentColors): ThemeCtx {
  const isDark = mode === 'dark';
  const colors = modeColors(mode, accent);
  return {
    mode,
    isDark,
    accent,
    ...colors,
    hover: alpha(colors.ink, tokens.state.hover),
    selected: alpha(colors.ink, tokens.state.selected),
    shadow: shadowsFor(isDark),
    transition,
    t: tokens,
  };
}
