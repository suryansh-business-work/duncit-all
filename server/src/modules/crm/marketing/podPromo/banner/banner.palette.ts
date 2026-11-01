import type { BannerFamily, BannerPalette } from './banner.theme';

/**
 * Pick the family palette that suits the cover photo: the one whose
 * background hue sits nearest the photo's dominant colour. A photo with no
 * real colour (grey, black, washed out) keeps the family's first palette.
 */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Below this saturation a colour is treated as grey: its hue means nothing. */
const GREY_SATURATION = 0.18;

export function hexToRgb(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

/** Hue in degrees (0–360) and saturation (0–1) of a colour. */
export function hueOf({ r, g, b }: Rgb): { hue: number; saturation: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const light = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));
  if (delta === 0) return { hue: 0, saturation: 0 };
  let hue: number;
  if (max === rn) hue = ((gn - bn) / delta) % 6;
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;
  return { hue: (hue * 60 + 360) % 360, saturation };
}

const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

export function pickPalette(family: BannerFamily, dominant: Rgb | null): BannerPalette {
  const [first] = family.palettes;
  if (!dominant) return first;
  const photo = hueOf(dominant);
  if (photo.saturation < GREY_SATURATION) return first;
  let best = first;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const palette of family.palettes) {
    const rgb = hexToRgb(palette.bg);
    if (!rgb) continue;
    const distance = hueDistance(hueOf(rgb).hue, photo.hue);
    if (distance < bestDistance) {
      best = palette;
      bestDistance = distance;
    }
  }
  return best;
}
