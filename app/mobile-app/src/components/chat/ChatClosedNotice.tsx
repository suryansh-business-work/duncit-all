import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

/** Replaces the composer once a pod has ended — chat is read-only from then on.
 * RN twin of mWeb's ChatClosedNotice. */
export function ChatClosedNotice() {
  const { muted } = useThemeColors();

  return (
    <XStack
      testID="chat-closed-notice"
      alignItems="center"
      justifyContent="center"
      gap={6}
      paddingHorizontal={12}
      paddingVertical={16}
      backgroundColor="$surface"
      borderTopWidth={1}
      borderColor="$borderColor"
    >
      <MaterialIcons name="lock-outline" size={16} color={muted} />
      <Text fontSize={13} fontWeight="700" color="$muted">
        This pod has ended — chat is closed.
      </Text>
    </XStack>
  );
}
