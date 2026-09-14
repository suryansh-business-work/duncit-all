import { useTheme } from 'tamagui';

/**
 * Resolves the active theme's brand colours to raw strings — needed for
 * non-Tamagui consumers like @expo/vector-icons (which take a `color` string,
 * not a `$token`). Keeps icon colours in sync with the Tamagui theme.
 */
export function useThemeColors() {
  const theme = useTheme();
  return {
    background: theme.background?.val as string,
    surface: theme.surface?.val as string,
    color: theme.color?.val as string,
    muted: theme.muted?.val as string,
    /** CTA fill — pair with `onPrimary`. For red text or a red icon on the page use `accent`. */
    primary: theme.primary?.val as string,
    /** Red text/icons: 4.5:1 on every ground of the mode. */
    accent: theme.accent?.val as string,
    /** The exact brand red — decorative icons and illustrations only. */
    brand: theme.brand?.val as string,
    soft: theme.soft?.val as string,
    danger: theme.danger?.val as string,
    success: theme.success?.val as string,
    warning: theme.warning?.val as string,
    info: theme.info?.val as string,
    onPrimary: theme.onPrimary?.val as string,
    borderColor: theme.borderColor?.val as string,
    /** A form field's outline — 3:1 against every ground. */
    inputBorder: theme.inputBorder?.val as string,
  };
}
