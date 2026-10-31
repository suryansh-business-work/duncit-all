import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';
import { neutral, radii } from '@duncit/auth-tokens';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** A full touch target (WCAG 2.5.8 asks 24; the app's floor is 44). */
const SIZE = 44;

interface Props {
  paused: boolean;
  onToggle: () => void;
}

/**
 * The control WCAG 2.2.2 owes anything that moves for more than five
 * seconds: bottom-left, clear of the tab bar, it pauses the celebration or
 * plays it again. Its name says what pressing it does next.
 */
export function OccasionPauseButton({ paused, onToggle }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const bottom = useBottomNavSpace();
  return (
    <XStack
      testID="occasion-pause"
      // `aria-pressed` is what Native Web reads (mWeb's exact pair); React
      // Native ignores it, so the native screen reader gets `accessibilityState`.
      role="button"
      aria-label={t(paused ? 'ui.occasion.play' : 'ui.occasion.pause')}
      aria-pressed={paused}
      accessibilityState={{ selected: paused }}
      tabIndex={0}
      onPress={onToggle}
      position="absolute"
      left={16}
      bottom={bottom}
      width={SIZE}
      height={SIZE}
      borderRadius={radii.pill}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$cardBorder"
      shadowColor={neutral[900]}
      shadowOpacity={0.18}
      shadowRadius={8}
      shadowOffset={{ width: 0, height: 3 }}
      pressStyle={PRESS_STYLE.surface}
    >
      <MaterialIcons name={paused ? 'play-arrow' : 'pause'} size={24} color={color} />
    </XStack>
  );
}
