import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';
import { DISABLED_OPACITY, PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  icon: 'add' | 'remove';
  /** The button's spoken name — it says what it changes. */
  label: string;
  disabled: boolean;
  onPress: () => void;
  /** How the press reads, from the shared press styles. */
  press: 'control' | 'surface';
  testID: string;
}

/**
 * The round − / + press target of a quantity stepper. Disabled, it greys out
 * and drops its handler and its press feedback.
 */
export function StepButton({ icon, label, disabled, onPress, press, testID }: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-disabled={disabled}
      width={TOUCH_TARGET}
      height={TOUCH_TARGET}
      borderRadius={999}
      alignItems="center"
      justifyContent="center"
      pressStyle={disabled ? undefined : PRESS_STYLE[press]}
      opacity={disabled ? DISABLED_OPACITY : 1}
      onPress={disabled ? undefined : onPress}
    >
      <MaterialIcons name={icon} size={18} color={disabled ? muted : primary} />
    </XStack>
  );
}
