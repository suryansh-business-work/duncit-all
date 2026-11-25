import { defaultConfig } from '@tamagui/config/v4';
import { createTamagui } from 'tamagui';
import { dark, light, type ModeColors } from '@duncit/auth-tokens';
import { pressThemeKeys, SOFT_ALPHA, withAlpha } from '@duncit/buttons-native';

import accent from './crm-accent.json';

/**
 * The Duncit CRM theme: the shared Duncit tokens (@duncit/auth-tokens — every
 * text/fill pair WCAG AA) with the CRM portal's indigo accent in place of the
 * member app's red, so staff can tell the work app from the member app at a
 * glance. The accent is crm-accent.json, the same values the CRM portal uses.
 */
type Accent = typeof accent;

/**
 * The portal login screen's layers over its photo: a scrim of the page colour
 * that keeps text readable, and a near-opaque card (the portal's frosted glass;
 * React Native draws no backdrop blur, so the card carries more of its colour).
 */
const SCRIM_ALPHA = 0.74;
const GLASS_ALPHA = 0.92;

/** One mode's keys: the shared palette, with the CRM accent as the action colour. */
export function crmTheme(m: ModeColors, a: Accent, mode: 'light' | 'dark' = 'light') {
  const primary = a.active;
  return {
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
    inputBorder: m.inputBorder,
    surface: m.surface,
    soft: m.soft,
    muted: m.muted,
    accent: primary,
    brand: a.main,
    primary,
    primaryHover: a.hover,
    primaryPress: a.hover,
    onPrimary: m.onPrimary,
    danger: m.error,
    success: m.success,
    warning: m.warning,
    info: m.info,
    infoSoft: withAlpha(m.info, SOFT_ALPHA),
    warningSoft: withAlpha(m.warning, SOFT_ALPHA),
    scrim: withAlpha(m.bg, SCRIM_ALPHA),
    glass: withAlpha(m.surface, GLASS_ALPHA),
    // The login card's "ink" call-to-action: this mode's ink under its surface colour,
    // so the round submit and the tagline bar stand out on a light AND a dark card.
    ink: m.ink,
    onInk: m.surface,
    // Accent-coloured TEXT on a surface (the CRM chip): the deep indigo on light,
    // the pale indigo on dark, where the deep one would not read.
    accentText: mode === 'dark' ? a.light : a.active,
    onDanger: m.onSemantic,
    onSuccess: m.onSemantic,
    ...pressThemeKeys({ primary, primaryActive: a.hover, danger: m.error, success: m.success }),
  };
}

export const config = createTamagui({
  ...defaultConfig,
  settings: { ...defaultConfig.settings, onlyAllowShorthands: false, allowedStyleValues: false },
  themes: {
    ...defaultConfig.themes,
    light: { ...defaultConfig.themes.light, ...crmTheme(light, accent) },
    dark: { ...defaultConfig.themes.dark, ...crmTheme(dark, accent, 'dark') },
  },
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
