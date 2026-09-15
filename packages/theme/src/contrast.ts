/**
 * WCAG 2.x contrast maths for the portal accent.
 *
 * A portal passes whatever brand accent it likes, and 12 of the 21 shipped
 * accents failed white text (sky, teal, emerald and orange read at 2–3.5:1).
 * Rather than ask every portal to pick an accessible hex, the theme derives one:
 * the accent is mixed toward black (a fill under white text) or white (text on a
 * dark page) in small steps until it clears the threshold, and is returned
 * untouched when it already does.
 *
 * `scripts/verify-contrast.mjs` carries the same luminance formula for the
 * token files, because a plain node script cannot import this TypeScript.
 */

import { tokens } from './tokens';

/** WCAG AA minimum for normal-size text. */
export const AA_TEXT = 4.5;

const { black: BLACK, white: WHITE } = tokens.common;
const MIX_STEP = 0.02;
/** How much darker a hover/pressed fill is when the portal's own step was not darker. */
const STATE_STEP = 0.1;
/** A portal's own state colour must shed at least 5% of the rest fill's luminance to read as a step. */
const STATE_LUMINANCE = 0.95;

/** `#rgb` or `#rrggbb` to its three 0–255 channels. */
function channels(hex: string): number[] {
  const body = hex.slice(1);
  const full = body.length === 3 ? [...body].map((ch) => ch + ch).join('') : body;
  return [0, 2, 4].map((at) => Number.parseInt(full.slice(at, at + 2), 16));
}

const toHex = (rgb: readonly number[]): string =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

const linear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `from` mixed toward `to` by `weight` (0–1), as `#rrggbb`. */
export function mix(from: string, to: string, weight: number): string {
  const target = channels(to);
  return toHex(channels(from).map((v, i) => v + (target[i] - v) * weight));
}

const clears = (color: string, grounds: readonly string[]): boolean =>
  grounds.every((ground) => contrastRatio(color, ground) >= AA_TEXT);

/**
 * `color` mixed toward `toward` until it reaches 4.5:1 against every ground.
 * Returned unchanged when it already does — a portal that chose an accessible
 * accent keeps its exact hex.
 */
export function ensureContrast(color: string, toward: string, grounds: readonly string[]): string {
  let result = color;
  let weight = 0;
  while (weight < 1 && !clears(result, grounds)) {
    weight = Math.min(1, weight + MIX_STEP);
    result = mix(color, toward, weight);
  }
  return result;
}

/** A fill that white text clears 4.5:1 on. */
export const fillForWhite = (color: string): string => ensureContrast(color, BLACK, [WHITE]);

/**
 * A hover/pressed fill: the portal's own step when it is visibly darker than
 * `rest`, otherwise `rest` one step darker. A state that lightens a fill would
 * drop the white label under 4.5:1, so it never does.
 */
export function darkerThan(candidate: string, rest: string): string {
  const own = fillForWhite(candidate);
  return luminance(own) <= luminance(rest) * STATE_LUMINANCE ? own : mix(rest, BLACK, STATE_STEP);
}

/** White when it clears 4.5:1 on `fill`, otherwise the dark `ink`. */
export const textOn = (fill: string, ink: string): string =>
  contrastRatio(WHITE, fill) >= AA_TEXT ? WHITE : ink;
