import { useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { resolveColorMode, useAppearanceStore } from '@/stores/appearance.store';

/**
 * The portal login screen's light/dark switch, top right — a labelled pill on
 * the glass colour so it reads over the photo. The choice is remembered on
 * this phone; until then the app follows the phone's own setting.
 */
export function ColorModeToggle() {
  const { t } = useTranslation();
  const theme = useTheme();
  const saved = useAppearanceStore((s) => s.mode);
  const toggle = useAppearanceStore((s) => s.toggle);
  const mode = resolveColorMode(saved, useColorScheme());
  const dark = mode === 'dark';
  const label = dark ? t('session.login.switchToLight') : t('session.login.switchToDark');
  return (
    <XStack
      role="button"
      aria-label={label}
      onPress={() => toggle(mode)}
      alignItems="center"
      gap="$2"
      paddingVertical="$2"
      paddingHorizontal="$3"
      borderRadius={RADII.pill}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$glass"
      pressStyle={{ backgroundColor: '$soft' }}
      hitSlop={8}
      testID="login-color-mode"
    >
      <MaterialIcons
        name={dark ? 'light-mode' : 'dark-mode'}
        size={20}
        color={theme.color?.val}
        accessibilityElementsHidden
      />
      <Text fontWeight="700" fontSize="$3">
        {label}
      </Text>
    </XStack>
  );
}
