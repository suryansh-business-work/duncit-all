import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  testID: string;
  label: string;
  /** What a screen reader announces — the full weekday name for "Mon". */
  ariaLabel?: string;
  selected: boolean;
  /** Drawn faint — a weekday the venue is closed on. */
  dim?: boolean;
  onPress: () => void;
}

/** A single toggling pill — green when picked, a hairline surface pill when
 * not — the same shape as the create-pod chip pickers. */
export function SelectChip({
  testID,
  label,
  ariaLabel,
  selected,
  dim = false,
  onPress,
}: Readonly<Props>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={ariaLabel ?? label}
      aria-pressed={selected}
      onPress={onPress}
      alignItems="center"
      minHeight={36}
      paddingHorizontal={14}
      paddingVertical={8}
      borderRadius={999}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor={selected ? '$primary' : '$surface'}
      opacity={dim && !selected ? 0.5 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={13} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}
