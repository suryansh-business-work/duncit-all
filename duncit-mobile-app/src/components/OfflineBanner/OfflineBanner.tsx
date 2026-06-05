import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/** App-wide "no internet" warning bar — shown whenever the device goes offline.
 * Rendered above the navigator so it overlays every screen. */
export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  if (!isOffline) return null;

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#b3261e' }}>
      <XStack
        testID="offline-banner"
        alignItems="center"
        justifyContent="center"
        gap={8}
        paddingHorizontal={16}
        paddingVertical={8}
        backgroundColor="#b3261e"
      >
        <MaterialIcons name="wifi-off" size={16} color="#ffffff" />
        <Text fontSize={13} fontWeight="800" color="#ffffff">
          No internet connection
        </Text>
      </XStack>
    </SafeAreaView>
  );
}
