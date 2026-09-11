import { Text, XStack } from 'tamagui';

import { PRESS_STYLE } from '@duncit/buttons-native';

/** One selectable delivery channel — the RN stand-in for a checkbox row. */
export function MediumToggle({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  return (
    <XStack
      testID={`attendance-otp-medium-${label}`}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={16}
      height={38}
      borderRadius={999}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor={selected ? '$primary' : '$surface'}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={13} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

interface PillButtonProps {
  testID: string;
  label: string;
  onPress: () => void;
  variant: 'solid' | 'ghost';
  disabled: boolean;
}

/** The sheet's action button, in the two weights it needs. */
export function PillButton({
  testID,
  label,
  onPress,
  variant,
  disabled,
}: Readonly<PillButtonProps>) {
  const solid = variant === 'solid';
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={() => !disabled && onPress()}
      alignItems="center"
      justifyContent="center"
      height={44}
      borderRadius={999}
      borderWidth={solid ? 0 : 1}
      borderColor="$borderColor"
      backgroundColor={solid ? '$primary' : 'transparent'}
      opacity={disabled ? 0.55 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={15} fontWeight="600" color={solid ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}
