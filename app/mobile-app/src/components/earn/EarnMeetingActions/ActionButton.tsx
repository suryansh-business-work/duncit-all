import { Text, XStack } from 'tamagui';

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
      pressStyle={{ opacity: 0.7 }}
    >
      <Text fontSize={12.5} fontWeight="800" color={danger ? '$danger' : '$primary'}>
        {label}
      </Text>
    </XStack>
  );
}
