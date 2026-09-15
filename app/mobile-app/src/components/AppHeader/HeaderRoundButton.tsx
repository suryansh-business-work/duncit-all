import type { ReactNode } from 'react';
import { XStack } from 'tamagui';

import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  testID: string;
  label: string;
  onPress: () => void;
  children: ReactNode;
}

/**
 * The header's round actions (search, bell, avatar): a 40px `$surface`
 * circle on the page ground — borderless in light, a hairline in dark
 * (`$cardBorder`). The name rides on `aria-label`; there is no caption under
 * it. mWeb twin: `HEADER_ROUND_BUTTON_SX` in app-header/headerButtonSx.
 */
export function HeaderRoundButton({ testID, label, onPress, children }: Readonly<Props>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      // Makes the circle one screen-reader element on native (the icon inside
      // has no text to read) and a tab stop on web.
      tabIndex={0}
      // 40 drawn, 44 touchable.
      hitSlop={2}
      onPress={onPress}
      width={40}
      height={40}
      borderRadius={20}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$cardBorder"
      pressStyle={PRESS_STYLE.surface}
    >
      {children}
    </XStack>
  );
}
