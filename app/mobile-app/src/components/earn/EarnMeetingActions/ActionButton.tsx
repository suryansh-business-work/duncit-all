import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface ActionButtonProps {
  label: string;
  danger?: boolean;
  testID: string;
  onPress: () => void;
}

/** Pill button used for the reschedule / cancel meeting actions. */
export function ActionButton({
  label,
  danger = false,
  testID,
  onPress,
}: Readonly<ActionButtonProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      paddingHorizontal={14}
      paddingVertical={9}
      borderRadius={999}
      borderWidth={1}
      borderColor={danger ? '$danger' : '$primary'}
      pressStyle={PRESS_STYLE.row}
    >
      <Text fontSize={12.5} fontWeight="600" color={danger ? '$danger' : '$primary'}>
        {label}
      </Text>
    </XStack>
  );
}
