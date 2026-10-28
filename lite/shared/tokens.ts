import { brand, dark, light, radii, semantic } from '@duncit/auth-tokens';

/**
 * Duncit Lite's design tokens. Every colour, radius, shadow and motion value
 * the web app draws with comes from here, and every colour here comes from
 * `@duncit/auth-tokens` — Lite composes the Duncit palette, it never invents
 * hex values of its own.
 *
 * The look is dark-first (a night-sky page, white call-to-action, a warm
 * red-to-amber gradient on the words that matter) with a matching light scheme.
 */
export type LiteScheme = 'light' | 'dark';

export interface LiteSchemeTokens {
  page: string;
  surface: string;
  raised: string;
  ink: string;
  muted: string;
  border: string;
  inputBorder: string;
  /** The call-to-action: white on the dark page, ink on the light one. */
  cta: string;
  onCta: string;
  /** Links and highlights: the Duncit red, tuned per scheme for AA contrast. */
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  onSemantic: string;
  /** The soft glow behind the header. */
  glow: string;
}

export const LITE_SCHEMES: Record<LiteScheme, LiteSchemeTokens> = {
  dark: {
    page: dark.bg,
    surface: dark.surface,
    raised: dark.soft,
    ink: dark.ink,
    muted: dark.muted,
    border: dark.border,
    inputBorder: dark.inputBorder,
    cta: dark.ink,
    onCta: dark.bg,
    accent: brand[500],
    success: dark.success,
    warning: dark.warning,
    error: dark.error,
    info: dark.info,
    onSemantic: dark.onSemantic,
    glow: semantic.secondary,
  },
  light: {
    page: light.bg,
    surface: light.surface,
    raised: light.soft,
    ink: light.ink,
    muted: light.muted,
    border: light.border,
    inputBorder: light.inputBorder,
    cta: light.ink,
    onCta: light.surface,
    accent: light.primary,
    success: light.success,
    warning: light.warning,
    error: light.error,
    info: light.info,
    onSemantic: light.onSemantic,
    glow: semantic.secondary,
  },
};

/** The headline gradient ("start here"), red into amber; darker stops on the light page keep AA contrast. */
export const HEADLINE_GRADIENT = [brand[500], dark.warning] as const;
export const HEADLINE_GRADIENT_LIGHT = [brand[800], semantic.warning] as const;

export const LITE_RADII = { card: radii.md + 2, control: radii.sm, pill: radii.pill, cover: radii.lg } as const;

export const LITE_MOTION = {
  /** Every entrance and hover uses one curve, so the app moves as one thing. */
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fast: 160,
  base: 280,
  slow: 520,
  /** One full drift of a floating hero cover. */
  float: 9_000,
} as const;

/** A theme accent key (what the API stores on an event) to its colour. */
export const ACCENT_COLORS = {
  DEFAULT: brand[500],
  RED: brand[700],
  ORANGE: semantic.warning,
  AMBER: dark.warning,
  GREEN: dark.success,
  TEAL: semantic.accent,
  BLUE: dark.info,
  PURPLE: semantic.secondary,
  PINK: brand[300],
} as const;

export type ThemeAccentKey = keyof typeof ACCENT_COLORS;
export const THEME_ACCENT_KEYS = ['DEFAULT', 'RED', 'ORANGE', 'AMBER', 'GREEN', 'TEAL', 'BLUE', 'PURPLE', 'PINK'] as const satisfies readonly ThemeAccentKey[];

export const EVENT_THEME_KEYS = ['MINIMAL', 'GRADIENT', 'AMBIENT', 'PATTERN', 'CONFETTI'] as const;
export type EventThemeKey = (typeof EVENT_THEME_KEYS)[number];

/** Soft tints rotated across avatars and city badges so a grid never reads as one block. */
export const BADGE_TINTS = [brand[500], semantic.secondary, dark.warning, semantic.accent, dark.success, dark.info] as const;
export const tintAt = (position: number): string => BADGE_TINTS[((position % BADGE_TINTS.length) + BADGE_TINTS.length) % BADGE_TINTS.length];
