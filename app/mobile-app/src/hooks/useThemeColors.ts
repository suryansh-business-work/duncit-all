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
    primary: theme.primary?.val as string,
    danger: theme.danger?.val as string,
    success: theme.success?.val as string,
    onPrimary: theme.onPrimary?.val as string,
    borderColor: theme.borderColor?.val as string,
  };
}
