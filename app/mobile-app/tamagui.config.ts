import { defaultConfig } from '@tamagui/config/v4';
import { Platform } from 'react-native';
import { createTamagui } from 'tamagui';
import { dark, light, semantic, typography } from '@duncit/auth-tokens';

/**
 * Brand themes layered on top of Tamagui's default config. We keep the default
 * sub-themes/tokens/animations (so built-in components keep working) and only
 * override the core surface/text/border keys + add brand keys (`$primary`,
 * `$muted`, `$danger`, `$surface`) from the shared @duncit/auth-tokens — the
 * SAME source mWeb's MUI theme and the old NativeWind config consumed, so brand
 * colours stay in lock-step across web and native.
 */
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
  surface: light.surface,
  muted: light.muted,
  primary: light.primary,
  primaryHover: light.primaryHover,
  primaryPress: light.primaryActive,
  onPrimary: light.onPrimary,
  danger: semantic.error,
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
  surface: dark.surface,
  muted: dark.muted,
  primary: dark.primary,
  primaryHover: dark.primaryHover,
  primaryPress: dark.primaryActive,
  onPrimary: dark.onPrimary,
  danger: semantic.error,
};

// Brand typeface. On web we use the SAME Quicksand stack mWeb loads via Google
// Fonts (see web-fonts.web.ts) so type matches across surfaces; native keeps
// Tamagui's resolved system family until a Quicksand asset is bundled, so RN
// falls back cleanly to the platform font instead of an unknown family.
const brandFamily = Platform.OS === 'web' ? typography.fontFamily : defaultConfig.fonts.body.family;
const fonts = {
  ...defaultConfig.fonts,
  body: { ...defaultConfig.fonts.body, family: brandFamily },
  heading: { ...defaultConfig.fonts.heading, family: brandFamily },
};

export const config = createTamagui({
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

export type AppConfig = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
