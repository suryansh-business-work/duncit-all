import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { BUTTON_SIZES, PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeStore } from '@/stores/theme.store';
import { useEffectiveScheme, useSchemeLocked } from '@/hooks/useEffectiveScheme';

/*
  Compact: a step under the small button — it is a preference at the foot of
  the screen, not an action, and at full size it competed with the sign-in
  doors. The drawn pill is short; `hitSlop` carries each half's press area
  back up to a full touch target (vertically only — the halves are neighbours).
*/
const SM = BUTTON_SIZES.sm;
const TRACK_PADDING = 2;
const SEGMENT_HEIGHT = SM.height - 8;
const SEGMENT_SLOP = Math.ceil((TOUCH_TARGET - SEGMENT_HEIGHT) / 2);
const SEGMENT_FONT = SM.fontSize - 1;
const SEGMENT_ICON = SM.iconSize - 2;

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
      // `role` + `aria-pressed` are what Native Web reads (the MUI twin's exact
      // pair); React Native ignores `aria-pressed`, so the native screen
      // reader gets the same fact from `accessibilityState`.
      role="button"
      aria-pressed={active}
      accessibilityState={{ selected: active }}
      tabIndex={0}
      aria-label={hint}
      alignItems="center"
      justifyContent="center"
      gap={SM.gap - 2}
      minHeight={SEGMENT_HEIGHT}
      hitSlop={{ top: SEGMENT_SLOP, bottom: SEGMENT_SLOP }}
      paddingHorizontal={SM.paddingHorizontal - 4}
      borderRadius={999}
      backgroundColor={active ? '$surface' : 'transparent'}
    >
      <MaterialIcons name={icon} size={SEGMENT_ICON} color={active ? accent : ink} />
      <Text fontSize={SEGMENT_FONT} fontWeight="600" color={active ? '$color' : '$muted'}>
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
  const scheme = useEffectiveScheme();
  const locked = useSchemeLocked();
  const toggle = useThemeStore((s) => s.toggle);
  const { muted, primary } = useThemeColors();
  const isDark = scheme === 'dark';
  const pickLight = isDark ? toggle : () => undefined;
  const pickDark = isDark ? () => undefined : toggle;
  // A festive look pins the mode (Halloween is a night): there is nothing to pick.
  if (locked) return null;

  return (
    <XStack
      testID="auth-mode-toggle"
      alignSelf="center"
      alignItems="center"
      padding={TRACK_PADDING}
      gap={TRACK_PADDING}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$soft"
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
