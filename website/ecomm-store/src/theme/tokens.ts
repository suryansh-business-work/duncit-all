import { dark, light, radii } from '@duncit/auth-tokens';

export type StoreColorMode = 'light' | 'dark';

/** Every colour the storefront paints with, in one mode. An occasion look overrides some of them. */
export interface StorePalette {
  brand: string;
  cta: string;
  ctaHover: string;
  ctaActive: string;
  /** Red that reads as TEXT on the page, the surface and every tint (the "16% off" chip). */
  ctaInk: string;
  onBrand: string;
  ink: string;
  muted: string;
  page: string;
  surface: string;
  border: string;
  inputBorder: string;
  navBar: string;
  navBarHover: string;
  brandTint: string;
  /** The hero card's soft gradient, start to end. */
  heroFrom: string;
  heroTo: string;
  /** Decorative fill for an occasion's ornaments (ribbon, sparkles); never under text. */
  festive: string;
  shadow: string;
  tints: readonly string[];
}

/**
 * The storefront's colours per mode, in Duncit red.
 *
 * Contrast rules these encode:
 * - `brand` (#F82C2E) is a FILL for icons, bubbles, illustration and LARGE
 *   white text only (3.9:1 with white) — never small white text, never red text.
 * - `cta` (#D92D2D) is the same red at 4.8:1, for buttons and chips that carry
 *   ordinary-size white text; `ctaInk` is red that is itself text (4.5:1+ on tints).
 * - `navBar` is the strong neutral fill under `onBrand` (white) text in both modes.
 * - Card tints and the hero gradient always carry `ink` text: pastels under dark
 *   ink in light mode, deep tints under light ink in dark mode.
 */
export const STORE_PALETTES: Record<StoreColorMode, StorePalette> = {
  light: {
    brand: light.brand,
    cta: light.primary,
    ctaHover: light.primaryHover,
    ctaActive: light.primaryActive,
    ctaInk: '#B42323',
    onBrand: light.onPrimary,
    ink: light.ink,
    muted: light.muted,
    page: '#F6F6F8',
    surface: light.surface,
    border: light.border,
    inputBorder: light.inputBorder,
    navBar: '#151515',
    navBarHover: light.ink,
    brandTint: '#FFE9E9',
    heroFrom: '#FFF3EE',
    heroTo: '#FFE2DA',
    festive: light.brand,
    shadow: '0 10px 30px rgba(21, 21, 21, 0.08)',
    tints: ['#FFE9E9', '#FFEEDD', '#F1EAFF', '#E7F2FF', '#E5F7EE'],
  },
  dark: {
    brand: dark.brand,
    cta: dark.primary,
    ctaHover: dark.primaryHover,
    ctaActive: dark.primaryActive,
    ctaInk: '#FF8A8A',
    onBrand: dark.onPrimary,
    ink: dark.ink,
    muted: dark.muted,
    page: dark.bg,
    surface: dark.surface,
    border: dark.border,
    inputBorder: dark.inputBorder,
    navBar: '#2E333A',
    navBarHover: '#3A4048',
    brandTint: '#3A1F22',
    heroFrom: '#2A1B1D',
    heroTo: '#1D1416',
    festive: dark.brand,
    shadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
    tints: ['#3A1F22', '#3A2A1C', '#2A2340', '#1C2A3D', '#1A3328'],
  },
};

type ColorToken = Exclude<keyof StorePalette, 'tints'>;

const COLOR_TOKENS = Object.keys(STORE_PALETTES.light).filter((key): key is ColorToken => key !== 'tints');
const TINT_COUNT = STORE_PALETTES.light.tints.length;

const cssVar = (name: string) => `--store-${name}`;

/** A palette as the CSS variables every `STORE_TOKENS` colour reads. */
export function storeCssVars(palette: StorePalette): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of COLOR_TOKENS) vars[cssVar(key)] = palette[key];
  for (let index = 0; index < TINT_COUNT; index += 1) {
    vars[cssVar(`tint-${index}`)] = palette.tints[index % palette.tints.length] ?? STORE_PALETTES.light.tints[index];
  }
  return vars;
}

const ref = (name: string) => `var(${cssVar(name)})`;

/**
 * The tokens components style with. Colours are CSS variables, so the whole
 * store follows the light/dark switch and an occasion's look without a
 * re-render of every `sx`.
 */
export const STORE_TOKENS = {
  brand: ref('brand'),
  cta: ref('cta'),
  ctaHover: ref('ctaHover'),
  ctaInk: ref('ctaInk'),
  onBrand: ref('onBrand'),
  ink: ref('ink'),
  muted: ref('muted'),
  page: ref('page'),
  surface: ref('surface'),
  border: ref('border'),
  inputBorder: ref('inputBorder'),
  navBar: ref('navBar'),
  navBarHover: ref('navBarHover'),
  brandTint: ref('brandTint'),
  heroGradient: `linear-gradient(120deg, ${ref('heroFrom')} 0%, ${ref('heroTo')} 100%)`,
  festive: ref('festive'),
  radius: { card: radii.xl, panel: 20, pill: radii.pill, control: radii.lg },
  shadow: ref('shadow'),
  /** The storefront's widest content column, in px. */
  contentMax: 1280,
} as const;

/** A stable tint for the n-th card (position, not identity, decides it); rotated so a grid never reads as one flat block. */
export const tintAt = (position: number): string => ref(`tint-${position % TINT_COUNT}`);

/** The breakpoint where the phone layout (bottom nav, full-screen filters) ends. */
export const DESKTOP_UP = 'md' as const;
