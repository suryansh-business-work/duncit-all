import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { PRESS_STYLE } from '@duncit/buttons-native';

interface CoverPickerHeaderProps {
  title: string;
  closeLabel: string;
  color: string;
  onClose: () => void;
}

/** The sheet's heading and its close button. */
export function CoverPickerHeader({
  title,
  closeLabel,
  color,
  onClose,
}: Readonly<CoverPickerHeaderProps>) {
  return (
    <XStack alignItems="center" justifyContent="space-between" paddingBottom={12}>
      <Text
        testID="cover-picker-title"
        role="heading"
        fontSize={17}
        fontWeight="600"
        color="$color"
      >
        {title}
      </Text>
      <XStack
        pressStyle={PRESS_STYLE.control}
        testID="cover-picker-close"
        tabIndex={0}
        role="button"
        aria-label={closeLabel}
        onPress={onClose}
        width={40}
        height={40}
        borderRadius={20}
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name="close" size={20} color={color} />
      </XStack>
    </XStack>
  );
}
