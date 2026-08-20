import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

/** One selectable delivery channel — the RN stand-in for a checkbox row. */
export function MediumToggle({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  const { primary, onPrimary } = useThemeColors();
  return (
    <XStack
      testID={`attendance-otp-medium-${label}`}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={14}
      height={34}
      borderRadius={999}
      borderWidth={1}
      borderColor={selected ? primary : '$borderColor'}
      backgroundColor={selected ? primary : 'transparent'}
      pressStyle={{ opacity: 0.75 }}
    >
      <Text fontSize={12.5} fontWeight="700" color={selected ? onPrimary : '$color'}>
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
  const { primary, onPrimary } = useThemeColors();
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
      backgroundColor={solid ? primary : 'transparent'}
      opacity={disabled ? 0.55 : 1}
      pressStyle={{ opacity: 0.8 }}
    >
      <Text fontSize={13.5} fontWeight="800" color={solid ? onPrimary : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}
