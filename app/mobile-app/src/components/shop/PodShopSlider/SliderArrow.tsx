import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

import { PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';

const ARROW_SIZE = 32;

/** Left/right pager arrow; hidden at whichever end has no more slides.
 * Hoisted to module scope (S6478). */
export function SliderArrow({
  testID,
  direction,
  label,
  color,
  surface,
  onPress,
}: Readonly<{
  testID: string;
  direction: 'left' | 'right';
  label: string;
  color: string;
  surface: string;
  onPress: () => void;
}>) {
  const hitSlop = Math.max(0, (TOUCH_TARGET - ARROW_SIZE) / 2);
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      tabIndex={0}
      hitSlop={hitSlop}
      onPress={onPress}
      position="absolute"
      top={0}
      bottom={0}
      {...(direction === 'left' ? { left: 8 } : { right: 8 })}
      width={ARROW_SIZE}
      alignItems="center"
      justifyContent="center"
      pressStyle={PRESS_STYLE.ghost}
      hoverStyle={PRESS_STYLE.ghost}
    >
      <YStack
        width={ARROW_SIZE}
        height={ARROW_SIZE}
        borderRadius={ARROW_SIZE / 2}
        alignItems="center"
        justifyContent="center"
        backgroundColor={surface}
      >
        <MaterialIcons
          name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
          size={20}
          color={color}
        />
      </YStack>
    </YStack>
  );
}
