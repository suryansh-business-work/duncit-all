/**
 * The alpha maths behind every state layer.
 *
 * MUI ships `alpha()` and Tamagui ships nothing, so this lived on one side of
 * the app only. It is four lines and it decides what a pressed control looks
 * like, which makes it exactly the kind of thing rule 34 wants in one place.
 */

const HEX_SHORT = 4;
const HEX_LONG = 7;

/** Clamp to the 0…1 an alpha channel is defined over. */
export const clampAlpha = (value: number): number => Math.min(Math.max(value, 0), 1);

/**
 * `#rgb`, `#rrggbb` and `#rrggbbaa` to `[r, g, b]`. Returns null for anything
 * else — a theme colour can arrive as `rgb()`, a CSS variable or a Tamagui
 * token, and guessing at those produces a wrong colour rather than an error.
 */
export function hexToRgb(hex: string): readonly [number, number, number] | null {
  if (!hex.startsWith('#')) {
    return null;
  }
  const body = hex.slice(1);
  const expanded =
    body.length === HEX_SHORT - 1
      ? body
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : body;
  if (expanded.length < HEX_LONG - 1) {
    return null;
  }
  const value = Number.parseInt(expanded.slice(0, 6), 16);
  if (Number.isNaN(value)) {
    return null;
  }
  // eslint-disable-next-line no-bitwise
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * A colour at a given alpha, as `rgba(...)`.
 *
 * Anything this cannot parse is handed back untouched: a state layer that
 * silently renders the wrong colour is worse than one that renders none, and
 * the caller's own colour is always a valid CSS value.
 */
export function withAlpha(color: string, alpha: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return color;
  }
  const [r, g, b] = rgb;
  return `rgba(${r}, ${g}, ${b}, ${clampAlpha(alpha)})`;
}
