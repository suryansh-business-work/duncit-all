import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  testID: string;
  /** Distance from the bottom edge (chat sits above the composer). */
  bottom: number;
  onPress: () => void;
}

/** Floating "jump to latest" button shown after the user scrolls up (B13). */
export function JumpToLatestButton({ testID, bottom, onPress }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label="Jump to latest"
      onPress={onPress}
      position="absolute"
      right={16}
      bottom={bottom}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={20}
      backgroundColor="$primary"
    >
      <MaterialIcons name="keyboard-arrow-down" size={24} color={onPrimary} />
    </XStack>
  );
}
