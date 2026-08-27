import { withAlpha } from './color';

/** Brand colours the app already has, in the shape `@duncit/auth-tokens` ships them. */
export interface BrandColorsInput {
  primary: string;
  primaryActive: string;
  danger: string;
  success: string;
}

/**
 * The theme keys the button tones read that a plain palette does not carry.
 *
 * `soft` fills are the tone at low alpha — a tonal button. Native has no
 * `alpha()`, so without this every tonal surface in the app was a hand-typed
 * `rgba(255, 87, 87, 0.12)`, which is how the app ended up with four different
 * "light red" backgrounds. `*Press` are the pressed fills for the tones that
 * had no darker step at all.
 */
export const SOFT_ALPHA = 0.12;

export interface PressThemeKeys {
  primarySoft: string;
  dangerSoft: string;
  successSoft: string;
  dangerPress: string;
  successPress: string;
}

/** How far a pressed fill darkens when the palette has no darker step for it. */
const PRESS_DARKEN = 0.86;

/** Multiply a hex colour's channels — the native stand-in for `brightness()`. */
function darken(color: string, factor: number): string {
  const rgba = withAlpha(color, 1);
  const channels = /rgba\((\d+), (\d+), (\d+)/.exec(rgba);
  if (!channels) {
    return color;
  }
  const scaled = channels
    .slice(1, 4)
    .map((value) => Math.round(Number.parseInt(value, 10) * factor))
    .join(', ');
  return `rgb(${scaled})`;
}

/** Build the extra brand theme entries from the palette the app already has. */
export function pressThemeKeys(input: Readonly<BrandColorsInput>): PressThemeKeys {
  return {
    primarySoft: withAlpha(input.primary, SOFT_ALPHA),
    dangerSoft: withAlpha(input.danger, SOFT_ALPHA),
    successSoft: withAlpha(input.success, SOFT_ALPHA),
    dangerPress: darken(input.danger, PRESS_DARKEN),
    successPress: darken(input.success, PRESS_DARKEN),
  };
}
