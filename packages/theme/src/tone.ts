import { ensureContrast, mix } from './contrast';
import type { ThemeCtx } from './types';

/** A colour as a quiet wash: its fill, its readable text and its edge. */
export interface SoftTone {
  bg: string;
  fg: string;
  border: string;
}

/**
 * A status colour as a soft tint — the chip and alert treatment.
 *
 * The wash is OPAQUE (the colour mixed into the content surface), not an alpha,
 * so the chip is the same colour whether it lands on a card, the sidebar or a
 * table header, and its text contrast can be proven once. The text is the
 * colour itself, darkened in light mode or lightened in dark mode only as far
 * as it takes to clear 4.5:1 on that wash.
 */
export function softTone(c: ThemeCtx, color: string): SoftTone {
  const { tint, tintBorder } = c.t.state;
  const bg = mix(c.surface, color, c.isDark ? tint.dark : tint.light);
  const toward = c.isDark ? c.white : c.t.common.black;
  return {
    bg,
    fg: ensureContrast(color, toward, [bg]),
    border: mix(c.surface, color, c.isDark ? tintBorder.dark : tintBorder.light),
  };
}
