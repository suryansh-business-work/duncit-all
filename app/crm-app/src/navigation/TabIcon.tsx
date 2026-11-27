import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

import { TAB_INDICATOR } from './chrome';

interface Props {
  name: keyof typeof MaterialIcons.glyphMap;
  color: string;
  focused: boolean;
  /** The pill's colour (the theme's soft red). */
  indicator: string;
}

const ICON_SIZE = 24;

/**
 * A tab's icon. The current tab's icon sits in a soft red pill, as Material 3's
 * navigation bar draws it; the label stays outside the pill, under it.
 */
export function TabIcon({ name, color, focused, indicator }: Readonly<Props>) {
  return (
    <YStack
      width={TAB_INDICATOR.width}
      height={TAB_INDICATOR.height}
      borderRadius={TAB_INDICATOR.radius}
      backgroundColor={focused ? indicator : 'transparent'}
      alignItems="center"
      justifyContent="center"
      testID={focused ? `tab-indicator-${name}` : undefined}
    >
      <MaterialIcons name={name} color={color} size={ICON_SIZE} />
    </YStack>
  );
}
