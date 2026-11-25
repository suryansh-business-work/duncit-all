import { useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { resolveColorMode, useAppearanceStore } from '@/stores/appearance.store';

/** The portal login screen's light/dark switch, top right; the choice is remembered on this phone. */
export function ColorModeToggle() {
  const { t } = useTranslation();
  const theme = useTheme();
  const saved = useAppearanceStore((s) => s.mode);
  const toggle = useAppearanceStore((s) => s.toggle);
  const mode = resolveColorMode(saved, useColorScheme());
  const dark = mode === 'dark';
  return (
    <XStack
      role="button"
      aria-label={dark ? t('session.login.switchToLight') : t('session.login.switchToDark')}
      onPress={() => toggle(mode)}
      padding="$2"
      borderRadius={RADII.pill}
      pressStyle={{ backgroundColor: '$soft' }}
      hitSlop={8}
      testID="login-color-mode"
    >
      <MaterialIcons name={dark ? 'light-mode' : 'dark-mode'} size={24} color={theme.color?.val} />
    </XStack>
  );
}
