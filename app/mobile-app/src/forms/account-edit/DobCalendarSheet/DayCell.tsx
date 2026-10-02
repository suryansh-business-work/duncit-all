import { Text, YStack } from 'tamagui';

import { PRESS_STYLE } from '@duncit/buttons-native';

/** Day cell — hoisted to module scope (S6478). */
export function DayCell({
  testID,
  day,
  selected,
  disabled,
  onPick,
}: Readonly<{
  testID?: string;
  day: number | null;
  selected: boolean;
  disabled: boolean;
  onPick: (() => void) | undefined;
}>) {
  if (!day) {
    return <YStack width="14.28%" height={38} />;
  }
  const ink = selected ? '$onPrimary' : '$color';
  return (
    <YStack
      pressStyle={PRESS_STYLE.surface}
      testID={testID}
      role="radio"
      aria-label={`Day ${day}`}
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={0}
      onPress={onPick}
      width="14.28%"
      height={38}
      alignItems="center"
      justifyContent="center"
      opacity={disabled ? 0.35 : 1}
    >
      <YStack
        width={32}
        height={32}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor={selected ? '$primary' : '$borderColor'}
        backgroundColor={selected ? '$primary' : 'transparent'}
      >
        <Text fontSize={13} fontWeight="700" color={ink}>
          {day}
        </Text>
      </YStack>
    </YStack>
  );
}
