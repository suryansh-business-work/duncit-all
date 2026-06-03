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

export interface ModeColors {
  bg: string;
  surface: string;
  soft: string;
  ink: string;
  muted: string;
  border: string;
  primary: string;
  primaryHover: string;
  primaryActive: string;
  onPrimary: string;
}

export interface GradientPair {
  light: [string, string, string];
  dark: [string, string, string];
}

export interface AuthVisuals {
  accent: string;
  avatars: [string, string, string];
  avatarRing: string;
  bgGradient: GradientPair;
  cardGradient: GradientPair;
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
