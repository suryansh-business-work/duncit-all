import type { ThemeModeTokens } from '@duncit/gql-types';
import { dark, light } from '@duncit/auth-tokens';
import { occasionColorMode, occasionPalettes, type OccasionDesign, type ThemePalettes } from '@duncit/utils';

/** One of the 19 app colour tokens a look can override (`ThemeModeTokens`). */
export type TokenKey = Exclude<keyof ThemeModeTokens, '__typename'>;
export type ModePalette = Record<TokenKey, string>;
export type PreviewMode = 'light' | 'dark';

/** Every token, in the order the editor lists them. */
export const TOKEN_KEYS: readonly TokenKey[] = [
  'primary',
  'primaryHover',
  'primaryActive',
  'onPrimary',
  'accent',
  'onAccent',
  'brand',
  'bg',
  'surface',
  'soft',
  'ink',
  'muted',
  'border',
  'inputBorder',
  'success',
  'warning',
  'error',
  'info',
  'onSemantic',
];

/**
 * The house look a blank token falls back to in a preview: the very palettes
 * mWeb and the native app theme with (`@duncit/auth-tokens`), so a look reads
 * in the preview exactly as it will in the apps.
 */
export const HOUSE_PALETTES: ThemePalettes<ModePalette> = { light, dark };

type PaletteLook = Pick<OccasionDesign, 'palette_light' | 'palette_dark' | 'color_mode'>;

/**
 * The colours a preview paints with: the look's mode when it pins one
 * (Halloween is a night), else the viewer's, with the look's tokens laid over
 * the house palette. No look is the house look itself.
 */
export function previewPalette(look: PaletteLook | null, viewerMode: PreviewMode): { mode: PreviewMode; palette: ModePalette } {
  const mode = occasionColorMode(viewerMode, look);
  return { mode, palette: occasionPalettes(HOUSE_PALETTES, look)[mode] };
}

/** True when the look decides the colour mode itself, so a light/dark switch has nothing to do. */
export const pinsColorMode = (look: Pick<OccasionDesign, 'color_mode'> | null): boolean =>
  look?.color_mode === 'LIGHT' || look?.color_mode === 'DARK';
