import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}

/** One pressable choice in a row of them (a status filter, a brand picker) —
 * the picked one filled. The native twin of mWeb's clickable `<Chip>`. */
export function ChoiceChip({ label, active, onPress, testID }: Readonly<Props>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-selected={active}
      tabIndex={0}
      onPress={onPress}
      pressStyle={PRESS_STYLE.control}
      borderRadius={999}
      borderWidth={1}
      borderColor={active ? '$primary' : '$borderColor'}
      backgroundColor={active ? '$primarySoft' : '$background'}
      paddingHorizontal={12}
      minHeight={36}
      alignItems="center"
    >
      <Text fontSize={13} fontWeight="600" color={active ? '$accent' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}
