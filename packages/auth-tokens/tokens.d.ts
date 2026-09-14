// Type surface for the framework-agnostic design tokens in tokens.js.

export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

/**
 * Mode-less status colours, for a component that does not know its colour mode.
 * Each value is 4.5:1 as text on a white card and under white text as a fill, and
 * 3:1 as an icon or graphic on every light AND dark ground. It cannot also be
 * 4.5:1 text on the page ground or in dark mode — for status TEXT read
 * `light`/`dark` (or the theme: MUI `palette.success`, Tamagui `$success`).
 * `secondary` and `accent` are decorative hues, not text colours.
 */
export interface SemanticColors {
  success: string;
  warning: string;
  error: string;
  info: string;
  secondary: string;
  accent: string;
}

export interface SurfaceColors {
  bg: string;
  paper: string;
  soft: string;
  border: string;
}

/**
 * One colour mode. Every text/fill pair here clears WCAG 2.2 AA — checked by
 * `node scripts/verify-contrast.mjs`, which fails CI when a value regresses.
 */
export interface ModeColors {
  bg: string;
  surface: string;
  soft: string;
  ink: string;
  /** Secondary text — at least 4.5:1 on `bg`, `surface` and `soft`. */
  muted: string;
  /** Hairline dividers and card edges. Decorative — NOT a field boundary. */
  border: string;
  /** A form field's outline — at least 3:1 against `bg`, `surface` and `soft` (WCAG 1.4.11). */
  inputBorder: string;
  /** Call-to-action FILL, always under `onPrimary` text. Not for red text on a page. */
  primary: string;
  /** Darker than `primary`; `onPrimary` still clears 4.5:1. */
  primaryHover: string;
  /** Darker than `primaryHover`; `onPrimary` still clears 4.5:1. */
  primaryActive: string;
  onPrimary: string;
  /** Red TEXT — links, "See all", active tab, focus ring. At least 4.5:1 on every ground of its mode. */
  accent: string;
  /** Text on an `accent` fill (a dark ink in dark mode, where `accent` is light). */
  onAccent: string;
  /** The exact brand red — decoration only (logo, illustrations, large display type). Never body text or a text fill. */
  brand: string;
  /** Status colours for this mode, each readable as text on every ground and under `onSemantic`. */
  success: string;
  warning: string;
  error: string;
  info: string;
  /** Text on a filled status colour. */
  onSemantic: string;
}

export interface GradientPair {
  light: [string, string, string];
  dark: [string, string, string];
}

/**
 * One mode's haze over the admin-chosen login backdrop. `veil` covers the whole
 * frame, `edge` deepens the top and bottom, and `clear` is the SAME colour at
 * zero alpha — a gradient stop written as `transparent` fades through black on
 * iOS, which is why the clear end is spelled out rather than assumed.
 */
export interface FogLayer {
  veil: string;
  edge: string;
  clear: string;
}

export interface AuthFog {
  light: FogLayer;
  dark: FogLayer;
  /** How much of the photo/video survives under the haze. */
  mediaOpacity: number;
  /** Where the edge fade reaches the clear middle, as a 0–1 fraction of height. */
  edgeStop: number;
}

export interface AuthVisuals {
  accent: string;
  avatars: [string, string, string];
  avatarRing: string;
  bgGradient: GradientPair;
  cardGradient: GradientPair;
  fog: AuthFog;
  legal: {
    termsUrl: string;
    privacyUrl: string;
  };
}

export interface Radii {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  pill: number;
}

export interface Typography {
  fontFamily: string;
  weight: {
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
    black: number;
  };
}

export const brand: ColorScale;
export const neutral: ColorScale;
export const semantic: SemanticColors;
export const surface: SurfaceColors;
export const light: ModeColors;
export const dark: ModeColors;
export const auth: AuthVisuals;
export const radii: Radii;
export const typography: Typography;

declare const tokens: {
  brand: ColorScale;
  neutral: ColorScale;
  semantic: SemanticColors;
  surface: SurfaceColors;
  light: ModeColors;
  dark: ModeColors;
  auth: AuthVisuals;
  radii: Radii;
  typography: Typography;
};
export default tokens;
