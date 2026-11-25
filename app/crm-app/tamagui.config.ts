import { defaultConfig } from '@tamagui/config/v4';
import { createTamagui } from 'tamagui';
import { modeColors, type ConsoleMode } from '@duncit/theme/mode-colors';
import { tokens } from '@duncit/theme/tokens';
import { pressThemeKeys, withAlpha } from '@duncit/buttons-native';

import accent from './crm-accent.json';

/**
 * The Duncit CRM theme: the console design system the CRM portal is painted
 * with (@duncit/theme). `modeColors` is the same derivation the portal's MUI
 * theme runs, so every surface, text, border and accent step here is the
 * portal's own value for the mode — including the accent lightened for text
 * on the dark grounds, where the portal's indigo would not read.
 */
type Accent = typeof accent;

/**
 * The login screen's layers over its photo: a scrim of the page colour that
 * keeps text readable, and a near-opaque card (the portal's frosted glass;
 * React Native draws no backdrop blur, so the card carries more of its colour).
 */
const SCRIM_ALPHA = 0.74;
const GLASS_ALPHA = 0.92;

/** One mode's keys, named for what the app's components read. */
export function crmTheme(mode: ConsoleMode, a: Accent = accent) {
  const c = modeColors(mode, a);
  const { state } = tokens;
  const tint = (color: string) => withAlpha(color, state.tint[mode]);
  const { error, success, warning, info } = c.semantic;
  const { dangerPress, successPress } = pressThemeKeys({
    primary: c.primaryFill,
    primaryActive: c.primaryActive,
    danger: error,
    success,
  });
  return {
    background: c.bg,
    backgroundHover: c.soft,
    backgroundPress: c.soft,
    backgroundFocus: c.soft,
    color: c.ink,
    colorHover: c.ink,
    colorPress: c.ink,
    colorFocus: c.ink,
    borderColor: c.border,
    borderColorHover: c.border,
    placeholderColor: c.muted,
    inputBorder: c.inputBorder,
    surface: c.surface,
    soft: c.soft,
    raised: c.raised,
    muted: c.muted,
    // Ink tints the portal marks a pressed control and a selected row with.
    hover: withAlpha(c.ink, state.hover),
    selected: withAlpha(c.ink, state.selected),
    // The selected side-menu row: the accent wash of the portal's ListItemButton.
    navSelected: withAlpha(c.primary, state.selected + state.hover),
    // Filled buttons paint the accent under white text, the same in both modes.
    primary: c.primaryFill,
    primaryHover: c.primaryHover,
    primaryPress: c.primaryActive,
    onPrimary: c.white,
    // The accent as TEXT (outline and ghost buttons, links, the active tab).
    accent: c.primary,
    accentText: c.primary,
    brand: a.main,
    danger: error,
    success,
    warning,
    info,
    onDanger: c.onSemantic,
    onSuccess: c.onSemantic,
    dangerPress,
    successPress,
    primarySoft: tint(c.primary),
    // Text and icons ON the primarySoft wash (the current tab's pill, initials badges):
    // the accent text colour falls under 4.5:1 there, so light mode takes the
    // deeper hover red and dark mode the ink (theme-contrast.test measures both).
    onPrimarySoft: mode === 'light' ? c.primaryHover : c.ink,
    dangerSoft: tint(error),
    successSoft: tint(success),
    warningSoft: tint(warning),
    infoSoft: tint(info),
    scrim: withAlpha(c.bg, SCRIM_ALPHA),
    glass: withAlpha(c.surface, GLASS_ALPHA),
    // The login card's "ink" call-to-action: this mode's ink under its surface
    // colour, so the round submit and the tagline bar stand out in both modes.
    ink: c.ink,
    onInk: c.surface,
  };
}

export const config = createTamagui({
  ...defaultConfig,
  settings: { ...defaultConfig.settings, onlyAllowShorthands: false, allowedStyleValues: false },
  themes: {
    ...defaultConfig.themes,
    light: { ...defaultConfig.themes.light, ...crmTheme('light') },
    dark: { ...defaultConfig.themes.dark, ...crmTheme('dark') },
  },
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
