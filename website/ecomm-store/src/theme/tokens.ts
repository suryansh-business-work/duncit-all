import { dark, light, radii } from '@duncit/auth-tokens';

export type StoreColorMode = 'light' | 'dark';

/**
 * The storefront's colours per mode (the PawCare-style mock, in Duncit red).
 *
 * Contrast rules these encode:
 * - `brand` (#F82C2E) is a FILL for icons, bubbles, illustration and LARGE
 *   white text only (3.9:1 with white) — never small white text, never red text.
 * - `cta` (#D92D2D) is the same red at 4.8:1, for buttons and chips that carry
 *   ordinary-size white text.
 * - `navBar` is the strong neutral fill under `onBrand` (white) text in both modes.
 * - Card tints always carry `ink` text: pastels under dark ink in light mode,
 *   deep tints under light ink in dark mode.
 */
export const STORE_PALETTES = {
  light: {
    brand: light.brand,
    cta: light.primary,
    ctaHover: light.primaryHover,
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
    shadow: '0 8px 24px rgba(21, 21, 21, 0.06)',
    tints: ['#FFE9E9', '#FFEEDD', '#F1EAFF', '#E7F2FF', '#E5F7EE'],
  },
  dark: {
    brand: dark.brand,
    cta: dark.primary,
    ctaHover: dark.primaryHover,
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
    shadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    tints: ['#3A1F22', '#3A2A1C', '#2A2340', '#1C2A3D', '#1A3328'],
  },
} as const;

type ColorToken = Exclude<keyof (typeof STORE_PALETTES)['light'], 'tints'>;

const COLOR_TOKENS = Object.keys(STORE_PALETTES.light).filter((key): key is ColorToken => key !== 'tints');
const TINT_COUNT = STORE_PALETTES.light.tints.length;

const cssVar = (name: string) => `--store-${name}`;

/** One mode's colours as the CSS variables every `STORE_TOKENS` colour reads. */
export function storeCssVars(mode: StoreColorMode): Record<string, string> {
  const palette = STORE_PALETTES[mode];
  const vars: Record<string, string> = {};
  for (const key of COLOR_TOKENS) vars[cssVar(key)] = palette[key];
  palette.tints.forEach((tint, index) => {
    vars[cssVar(`tint-${index}`)] = tint;
  });
  return vars;
}

const ref = (name: string) => `var(${cssVar(name)})`;

/**
 * The tokens components style with. Colours are CSS variables, so the whole
 * store follows the light/dark switch without a re-render of every `sx`.
 */
export const STORE_TOKENS = {
  brand: ref('brand'),
  cta: ref('cta'),
  ctaHover: ref('ctaHover'),
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
  radius: { card: radii.xl, panel: 20, pill: radii.pill, control: radii.lg },
  shadow: ref('shadow'),
} as const;

/** A stable tint for the n-th card (position, not identity, decides it); rotated so a grid never reads as one flat block. */
export const tintAt = (position: number): string => ref(`tint-${position % TINT_COUNT}`);

/** The breakpoint where the phone layout (bottom nav, full-screen filters) ends. */
export const DESKTOP_UP = 'md' as const;
