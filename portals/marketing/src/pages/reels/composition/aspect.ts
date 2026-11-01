import type { ReelAspect, ReelSpec } from '../types';

/**
 * The frame each aspect is cut for. The server stores the same numbers on the
 * spec; the composition reads the aspect rather than the stored width so a
 * reel re-cut for another network redraws at once, before the save lands.
 */
export const FRAME: Readonly<Record<ReelAspect, { width: number; height: number }>> = {
  PORTRAIT: { width: 1080, height: 1920 },
  SQUARE: { width: 1080, height: 1080 },
  LANDSCAPE: { width: 1920, height: 1080 },
};

export const ASPECTS: readonly ReelAspect[] = ['PORTRAIT', 'SQUARE', 'LANDSCAPE'];

/** The frame a spec draws in — its aspect's, or the stored size for a spec saved before aspects existed. */
export function frameOf(spec: Pick<ReelSpec, 'aspect' | 'width' | 'height'>): { width: number; height: number } {
  return FRAME[spec.aspect] ?? { width: spec.width, height: spec.height };
}

/**
 * The bands a portrait network's own interface covers once the reel is posted:
 * the account name and sound above, the caption and buttons below. Drawn as
 * guides over the preview, and the same insets the text layer keeps clear of.
 */
export const SAFE_ZONE = { topPct: 15, bottomPct: 20 } as const;
