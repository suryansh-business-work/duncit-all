import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeStore } from '@/stores/theme.store';

const SHADOW_OFFSET = { width: 0, height: 2 };

interface SegmentProps {
  label: string;
  hint: string;
  icon: 'light-mode' | 'dark-mode';
  active: boolean;
  onPress: () => void;
  /** Resolved once by the parent so both halves spend the same strings. */
  ink: string;
  accent: string;
  testID: string;
}

/**
 * One half of the switch. Hoisted to module scope (S6478) and given every
 * colour it draws with, so the two segments cannot disagree about what the
 * active state looks like.
 */
function ModeSegment({
  label,
  hint,
  icon,
  active,
  onPress,
  ink,
  accent,
  testID,
}: Readonly<SegmentProps>) {
  return (
    <XStack
      testID={testID}
      onPress={onPress}
      pressStyle={PRESS_STYLE.control}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      aria-label={hint}
      alignItems="center"
      justifyContent="center"
      gap={6}
      minHeight={TOUCH_TARGET - 8}
      paddingHorizontal={16}
      borderRadius={999}
      backgroundColor={active ? '$surface' : 'transparent'}
      shadowColor="rgba(0,0,0,0.22)"
      shadowOffset={SHADOW_OFFSET}
      shadowRadius={6}
      shadowOpacity={active ? 1 : 0}
    >
      <MaterialIcons name={icon} size={16} color={active ? accent : ink} />
      <Text fontSize={13} fontWeight="700" color={active ? '$color' : '$muted'}>
        {label}
      </Text>
    </XStack>
  );
}

/**
 * Light/dark, at the foot of every auth screen.
 *
 * A signed-out person cannot reach the sidebar switch, so the choice that
 * decides how readable the login screen is was locked away behind the login
 * screen. mWeb's twin is `app/mweb/src/components/AuthModeToggle.tsx` and both
 * render the same two named segments (rule 27).
 *
 * There are exactly two modes, so pressing the one that is not active is the
 * store's `toggle()` — no setter is needed and the active half is inert.
 */
export function AuthModeToggle() {
  const { t } = useTranslation();
  const scheme = useThemeStore((s) => s.scheme);
  const toggle = useThemeStore((s) => s.toggle);
  const { muted, primary } = useThemeColors();
  const isDark = scheme === 'dark';
  const pickLight = isDark ? toggle : () => undefined;
  const pickDark = isDark ? () => undefined : toggle;

  return (
    <XStack
      testID="auth-mode-toggle"
      alignSelf="center"
      alignItems="center"
      padding={4}
      gap={4}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
    >
      <ModeSegment
        testID="auth-mode-light"
        label={t('mweb.auth.themeLight')}
        hint={t('mweb.auth.switchToLight')}
        icon="light-mode"
        active={!isDark}
        onPress={pickLight}
        ink={muted}
        accent={primary}
      />
      <ModeSegment
        testID="auth-mode-dark"
        label={t('mweb.auth.themeDark')}
        hint={t('mweb.auth.switchToDark')}
        icon="dark-mode"
        active={isDark}
        onPress={pickDark}
        ink={muted}
        accent={primary}
      />
    </XStack>
  );
}
