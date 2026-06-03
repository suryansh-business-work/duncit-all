import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemeStore } from '@/stores/theme.store';

/**
 * Light/dark toggle — mobile counterpart of mWeb's mode toggle. Flips the
 * Zustand theme store (which drives Tamagui's active theme) and persists it.
 */
export function ThemeToggle() {
  const scheme = useThemeStore((s) => s.scheme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = scheme === 'dark';
  const { color } = useThemeColors();

  return (
    <XStack
      testID="theme-toggle"
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onPress={toggle}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={10}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.8 }}
    >
      <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={20} color={color} />
    </XStack>
  );
}
