import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { Text, XStack } from 'tamagui';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useThemeColors } from '@/hooks/useThemeColors';

/** App-wide "no internet" warning bar — shown whenever the device goes offline.
 * Rendered above the navigator so it overlays every screen. */
export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const { onPrimary } = useThemeColors();
  if (!isOffline) return null;

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: semantic.error }}>
      <XStack
        testID="offline-banner"
        alignItems="center"
        justifyContent="center"
        gap={8}
        paddingHorizontal={16}
        paddingVertical={8}
        backgroundColor="$danger"
      >
        <MaterialIcons name="wifi-off" size={16} color={onPrimary} />
        <Text fontSize={13} fontWeight="600" color="$onPrimary">
          No internet connection
        </Text>
      </XStack>
    </SafeAreaView>
  );
}
