import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface ActionButtonProps {
  label: string;
  /** The leading glyph — the same one mWeb's EarnMeetingActions shows. */
  icon: 'event-repeat' | 'event-busy';
  danger?: boolean;
  testID: string;
  onPress: () => void;
}

/** Outlined pill used for the reschedule / cancel meeting actions. */
export function ActionButton({
  label,
  icon,
  danger = false,
  testID,
  onPress,
}: Readonly<ActionButtonProps>) {
  const { primary, danger: dangerInk } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={6}
      height={36}
      paddingHorizontal={14}
      borderRadius={999}
      borderWidth={1}
      borderColor={danger ? '$danger' : '$primary'}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={16} color={danger ? dangerInk : primary} />
      <Text fontSize={13} fontWeight="600" color={danger ? '$danger' : '$primary'}>
        {label}
      </Text>
    </XStack>
  );
}
