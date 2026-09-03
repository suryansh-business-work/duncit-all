import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

export type PickerIconName = keyof typeof MaterialIcons.glyphMap;

interface Props {
  testID: string;
  label: string;
  /** What the box shows — the formatted value, or a dash when nothing is picked. */
  shown: string;
  hasValue: boolean;
  icon: PickerIconName;
  disabled?: boolean;
  onPress: () => void;
}

/** The tappable box a date or time picker opens from — one look for both. */
export function PickerTrigger({
  testID,
  label,
  shown,
  hasValue,
  icon,
  disabled = false,
  onPress,
}: Readonly<Props>) {
  const { color, muted } = useThemeColors();
  return (
    <XStack
      testID={`${testID}-open`}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      alignItems="center"
      gap={8}
      height={48}
      paddingHorizontal={12}
      borderRadius={9}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      opacity={disabled ? 0.5 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={18} color={color} />
      <Text flex={1} fontSize={14} color={hasValue ? '$color' : '$muted'} numberOfLines={1}>
        {shown}
      </Text>
      <MaterialIcons name="arrow-drop-down" size={22} color={muted} />
    </XStack>
  );
}
