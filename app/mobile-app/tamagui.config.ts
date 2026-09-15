import { defaultConfig } from '@tamagui/config/v4';
import { Platform } from 'react-native';
import { createTamagui } from 'tamagui';
import { dark, light, typography, type ModeColors } from '@duncit/auth-tokens';
import { pressThemeKeys } from '@duncit/buttons-native';
import type { ThemePalettes } from '@duncit/utils';

/**
 * Brand themes layered on top of Tamagui's default config. We keep the default
 * sub-themes/tokens/animations (so built-in components keep working) and only
 * override the core surface/text/border keys + add brand keys (`$primary`,
 * `$accent`, `$brand`, `$muted`, `$inputBorder`, `$danger`, `$info`, `$surface`) from
 * the shared @duncit/auth-tokens — every text/fill pair WCAG AA — the
 * SAME source mWeb's MUI theme and the old NativeWind config consumed, so brand
 * colours stay in lock-step across web and native.
 */
// The extra keys the press system needs and a plain palette does not carry:
// tonal (`*Soft`) fills, and a pressed step for the tones that had no darker
// one. Derived in @duncit/buttons-native so the alpha maths is the same one
// mWeb's MUI theme runs, rather than a hand-typed rgba() per screen. Per mode,
// because the status colours are lighter in dark mode.
const pressKeysFor = (m: ModeColors) =>
  pressThemeKeys({
    primary: m.primary,
    primaryActive: m.primaryActive,
    danger: m.error,
    success: m.success,
  });

/** One mode's brand theme keys. `cardBorder` differs by mode, not by palette. */
const brandTheme = (m: ModeColors, cardBorder: string) => ({
  background: m.bg,
  backgroundHover: m.soft,
  backgroundPress: m.soft,
  backgroundFocus: m.soft,
  color: m.ink,
  colorHover: m.ink,
  colorPress: m.ink,
  colorFocus: m.ink,
  borderColor: m.border,
  borderColorHover: m.border,
  placeholderColor: m.muted,
  // A form field's outline — 3:1 against every ground (WCAG 1.4.11).
  // `borderColor` stays the decorative hairline.
  inputBorder: m.inputBorder,
  surface: m.surface,
  cardBorder,
  soft: m.soft,
  muted: m.muted,
  // Red TEXT — links, "See all", active tab, outline/ghost button labels.
  accent: m.accent,
  onAccent: m.onAccent,
  // The exact brand red, for decoration only (logo, illustration, large display type).
  brand: m.brand,
  // Call-to-action FILL, always under `onPrimary`.
  primary: m.primary,
  primaryHover: m.primaryHover,
  primaryPress: m.primaryActive,
  onPrimary: m.onPrimary,
  danger: m.error,
  success: m.success,
  warning: m.warning,
  info: m.info,
  // Text on a filled danger/success colour (dark ink in dark mode).
  onDanger: m.onSemantic,
  onSuccess: m.onSemantic,
  ...pressKeysFor(m),
});

/** The bundled palettes — what the app themes with unless Branding → Theme tokens is Server. */
export const LOCAL_PALETTES: ThemePalettes<ModeColors> = { light, dark };

// Brand typeface. On web we use the SAME Quicksand stack mWeb loads via Google
// Fonts (see web-fonts.web.ts) so type matches across surfaces; native keeps
// Tamagui's resolved system family until a Quicksand asset is bundled, so RN
// falls back cleanly to the platform font instead of an unknown family.
const brandFamily = Platform.OS === 'web' ? typography.fontFamily : defaultConfig.fonts.body.family;

/** Builds the Tamagui config, optionally around a runtime-loaded font family
 * (the admin Branding → Fonts pick, registered via expo-font) and the admin's
 * theme tokens (Branding → Theme tokens, resolved over the bundled palettes). */
export function createBrandConfig(
  customFamily?: string,
  palettes: ThemePalettes<ModeColors> = LOCAL_PALETTES,
) {
  const family = customFamily || brandFamily;
  const fonts = {
    ...defaultConfig.fonts,
    body: { ...defaultConfig.fonts.body, family },
    heading: { ...defaultConfig.fonts.heading, family },
  };
  return createTamagui({
    ...defaultConfig,
    fonts,
    // Allow long-form React Native style props (alignItems, paddingHorizontal, …)
    // and raw colour values (hex/rgba), not just shorthands + tokens — the app
    // uses RN-style prop names and dynamic per-category hues.
    settings: {
      ...defaultConfig.settings,
      onlyAllowShorthands: false,
      allowedStyleValues: false,
    },
    themes: {
      ...defaultConfig.themes,
      // Light cards sit borderless on the off-white ground; dark cards keep the
      // hairline (same rule as mWeb's --duncit-card-border).
      light: { ...defaultConfig.themes.light, ...brandTheme(palettes.light, 'transparent') },
      dark: { ...defaultConfig.themes.dark, ...brandTheme(palettes.dark, palettes.dark.border) },
    },
  });
}

export const config = createBrandConfig();

export type AppConfig = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
