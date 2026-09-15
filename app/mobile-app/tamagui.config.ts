import { defaultConfig } from '@tamagui/config/v4';
import { Platform } from 'react-native';
import { createTamagui } from 'tamagui';
import { dark, light, typography } from '@duncit/auth-tokens';
import { pressThemeKeys } from '@duncit/buttons-native';

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
const pressKeysFor = (m: typeof light) =>
  pressThemeKeys({
    primary: m.primary,
    primaryActive: m.primaryActive,
    danger: m.error,
    success: m.success,
  });

const brandLight = {
  background: light.bg,
  backgroundHover: light.soft,
  backgroundPress: light.soft,
  backgroundFocus: light.soft,
  color: light.ink,
  colorHover: light.ink,
  colorPress: light.ink,
  colorFocus: light.ink,
  borderColor: light.border,
  borderColorHover: light.border,
  placeholderColor: light.muted,
  // A form field's outline — 3:1 against every ground (WCAG 1.4.11).
  // `borderColor` stays the decorative hairline.
  inputBorder: light.inputBorder,
  surface: light.surface,
  // Light cards sit borderless on the off-white ground; dark cards keep the
  // hairline (same rule as mWeb's --duncit-card-border).
  cardBorder: 'transparent',
  soft: light.soft,
  muted: light.muted,
  // Red TEXT — links, "See all", active tab, outline/ghost button labels.
  accent: light.accent,
  onAccent: light.onAccent,
  // The exact brand red, for decoration only (logo, illustration, large display type).
  brand: light.brand,
  // Call-to-action FILL, always under `onPrimary`.
  primary: light.primary,
  primaryHover: light.primaryHover,
  primaryPress: light.primaryActive,
  onPrimary: light.onPrimary,
  danger: light.error,
  success: light.success,
  warning: light.warning,
  info: light.info,
  // Text on a filled danger/success colour (dark ink in dark mode).
  onDanger: light.onSemantic,
  onSuccess: light.onSemantic,
  ...pressKeysFor(light),
};

const brandDark: typeof brandLight = {
  background: dark.bg,
  backgroundHover: dark.soft,
  backgroundPress: dark.soft,
  backgroundFocus: dark.soft,
  color: dark.ink,
  colorHover: dark.ink,
  colorPress: dark.ink,
  colorFocus: dark.ink,
  borderColor: dark.border,
  borderColorHover: dark.border,
  placeholderColor: dark.muted,
  inputBorder: dark.inputBorder,
  surface: dark.surface,
  cardBorder: dark.border,
  soft: dark.soft,
  muted: dark.muted,
  accent: dark.accent,
  onAccent: dark.onAccent,
  brand: dark.brand,
  primary: dark.primary,
  primaryHover: dark.primaryHover,
  primaryPress: dark.primaryActive,
  onPrimary: dark.onPrimary,
  danger: dark.error,
  success: dark.success,
  warning: dark.warning,
  info: dark.info,
  onDanger: dark.onSemantic,
  onSuccess: dark.onSemantic,
  ...pressKeysFor(dark),
};

// Brand typeface. On web we use the SAME Quicksand stack mWeb loads via Google
// Fonts (see web-fonts.web.ts) so type matches across surfaces; native keeps
// Tamagui's resolved system family until a Quicksand asset is bundled, so RN
// falls back cleanly to the platform font instead of an unknown family.
const brandFamily = Platform.OS === 'web' ? typography.fontFamily : defaultConfig.fonts.body.family;

/** Builds the Tamagui config, optionally around a runtime-loaded font family
 * (the admin Branding → Fonts pick, registered via expo-font). */
export function createBrandConfig(customFamily?: string) {
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
      light: { ...defaultConfig.themes.light, ...brandLight },
      dark: { ...defaultConfig.themes.dark, ...brandDark },
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
