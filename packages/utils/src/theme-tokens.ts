/**
 * Admin-managed colour tokens (Admin → Branding → Theme tokens) over the
 * bundled `@duncit/auth-tokens` palettes.
 *
 * mWeb and the native app both build their theme from one light and one dark
 * palette. The admin decides where those come from: `LOCAL` keeps the bundled
 * palettes exactly as shipped, `SERVER` lays the admin's values over them. A
 * blank admin value keeps the bundled one, so an admin only fills in the
 * tokens they actually want to change.
 *
 * Generic over the palette shape so this package stays dependency-free — the
 * caller passes its own `{ light, dark }` from `@duncit/auth-tokens`.
 */

/** Where the apps read their colour tokens from. */
export type ThemeTokenSource = 'LOCAL' | 'SERVER';

/** One mode's admin values, keyed like the palette. Blank or missing = bundled value. */
export type ThemeTokenOverrides<T> = { readonly [K in keyof T]?: string | null };

/** A light + dark palette pair. */
export interface ThemePalettes<T> {
  light: T;
  dark: T;
}

/** The branding fields that decide the palettes — the `branding` query answers these. */
export interface ThemeTokenSettings<T> {
  theme_token_source?: string | null;
  theme_tokens_light?: ThemeTokenOverrides<T> | null;
  theme_tokens_dark?: ThemeTokenOverrides<T> | null;
}

/** `local` with every non-blank override written over the matching key. Unknown keys are ignored. */
export function applyTokenOverrides<T extends Record<keyof T, string>>(
  local: T,
  overrides?: ThemeTokenOverrides<T> | null,
): T {
  const next = { ...local };
  if (!overrides) return next;
  for (const key of Object.keys(local) as (keyof T)[]) {
    const value = overrides[key]?.trim();
    if (value) next[key] = value as T[keyof T];
  }
  return next;
}

/**
 * The palettes a surface should theme with. Returns `local` itself (same
 * reference) unless the admin switched the source to `SERVER`, so a memoised
 * theme is not rebuilt for an admin who never touched the setting.
 */
export function resolveThemeTokens<T extends Record<keyof T, string>>(
  local: ThemePalettes<T>,
  settings?: ThemeTokenSettings<T> | null,
): ThemePalettes<T> {
  if (settings?.theme_token_source !== 'SERVER') return local;
  return {
    light: applyTokenOverrides(local.light, settings.theme_tokens_light),
    dark: applyTokenOverrides(local.dark, settings.theme_tokens_dark),
  };
}
