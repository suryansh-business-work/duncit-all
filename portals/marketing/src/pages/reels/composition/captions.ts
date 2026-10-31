import type { CSSProperties } from 'react';
import type { ReelCaptionStyle, ReelText } from '../types';

/**
 * How a reel's words are dressed, per caption style. Pure, so the text layer
 * is one lookup and each style is provable without a frame being drawn.
 */

/** Without a pill behind them, words need an edge to stay readable over footage. */
const LEGIBILITY_SHADOW = '0 2px 12px rgba(0, 0, 0, 0.75)';
const PILL_PADDING = '18px 34px';
const PILL_RADIUS = 26;

const HEX = /^#[\da-f]{6}$/i;

/** Black or white, whichever reads on `hex`. Anything that is not a colour gets white, the reel's usual ink. */
export function contrastOn(hex: string): string {
  if (!HEX.test(hex)) return '#FFFFFF';
  const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#000000' : '#FFFFFF';
}

/**
 * The pill a BOX caption sits on: the brand colour when there is one, else the
 * text's own pill, else the text's ink — in which case the words are drawn in
 * the contrasting ink so they do not vanish into it.
 */
export function boxColours(text: Pick<ReelText, 'color' | 'background'>, accent: string): { pill: string; ink: string } {
  const pill = accent || text.background || text.color;
  const ink = pill.toUpperCase() === text.color.toUpperCase() ? contrastOn(pill) : text.color;
  return { pill, ink };
}

/** The block the words sit in, for the style the reel is captioned in. */
export function captionBlockStyle(style: ReelCaptionStyle, text: Pick<ReelText, 'color' | 'background'>, accent: string): CSSProperties {
  if (style === 'BOX') {
    const { pill, ink } = boxColours(text, accent);
    return { color: ink, backgroundColor: pill, padding: PILL_PADDING, borderRadius: PILL_RADIUS, textShadow: 'none' };
  }
  const hasPill = text.background !== '';
  return {
    color: text.color,
    backgroundColor: hasPill ? text.background : 'transparent',
    padding: hasPill ? PILL_PADDING : 0,
    borderRadius: PILL_RADIUS,
    textShadow: hasPill ? 'none' : LEGIBILITY_SHADOW,
  };
}

/** The word a HIGHLIGHT caption is on at `frame` of its `frames` on screen — spread evenly across them. */
export function highlightedWordIndex(wordCount: number, frame: number, frames: number): number {
  if (wordCount <= 0) return -1;
  const share = frames <= 0 ? 0 : Math.max(0, frame) / frames;
  return Math.min(wordCount - 1, Math.floor(share * wordCount));
}

/** The emphasis on the word being said: the accent (or the ink) behind it, the contrasting ink on it. */
export function highlightStyle(text: Pick<ReelText, 'color'>, accent: string): CSSProperties {
  const pill = accent || text.color;
  return { backgroundColor: pill, color: contrastOn(pill), borderRadius: 14, padding: '0 0.25em' };
}
