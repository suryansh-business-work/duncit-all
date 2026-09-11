import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { SelectOption } from './SelectSheet';

/** One pickable row of the SelectSheet list — flag, label, trailing hint and a
 * green check on the current value. */
export function SelectOptionRow({
  option,
  active,
  testID,
  onPress,
}: Readonly<{ option: SelectOption; active: boolean; testID: string; onPress: () => void }>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={option.label}
      aria-pressed={active}
      onPress={onPress}
      alignItems="center"
      gap={10}
      minHeight={48}
      paddingVertical={10}
      pressStyle={PRESS_STYLE.row}
    >
      {option.flag ? (
        <AppImage
          source={{ uri: option.flag }}
          style={{ width: 22, height: 16, borderRadius: 2 }}
        />
      ) : null}
      <Text
        flex={1}
        fontSize={15}
        fontWeight={active ? '600' : '500'}
        color={active ? '$primary' : '$color'}
      >
        {option.label}
      </Text>
      {option.hint ? (
        <Text fontSize={13} color="$muted">
          {option.hint}
        </Text>
      ) : null}
      {active ? <MaterialIcons name="check" size={18} color={primary} /> : null}
    </XStack>
  );
}
