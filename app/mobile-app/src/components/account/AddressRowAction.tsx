import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  testID: string;
  label: string;
  icon: 'edit' | 'delete-outline';
  onPress: () => void;
}

/** A 36px round soft icon button (edit / delete on an address row). */
export function AddressRowAction({ testID, label, icon, onPress }: Readonly<Props>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      tabIndex={0}
      onPress={onPress}
      width={36}
      height={36}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      backgroundColor="$soft"
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={18} color={muted} />
    </XStack>
  );
}
