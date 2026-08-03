import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

/** The host-only floating Create Pod button — extracted from HomeFeed for the
 * 200-line cap. The gate (hosts only) is behaviour and stays with the caller. */
export function CreatePodFab({
  bottom,
  onPress,
}: Readonly<{ bottom: number; onPress: () => void }>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack
      testID="home-create-pod-fab"
      role="button"
      aria-label="Create pod"
      onPress={onPress}
      position="absolute"
      right={16}
      bottom={bottom}
      width={56}
      height={56}
      borderRadius={28}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$primary"
      shadowColor="#000000"
      shadowOpacity={0.25}
      shadowRadius={12}
      shadowOffset={{ width: 0, height: 6 }}
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name="add" size={28} color={onPrimary} />
    </XStack>
  );
}
