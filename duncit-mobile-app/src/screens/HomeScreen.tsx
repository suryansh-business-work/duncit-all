import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';

import { AppHeader } from '@/components/AppHeader';

/** Authenticated home — the post-survey landing with the shared header
 * (logo + mascot + theme toggle + account drawer). */
export function HomeScreen() {
  return (
    <YStack flex={1} backgroundColor="$background" testID="home-screen">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <AppHeader />
        <YStack flex={1} alignItems="center" justifyContent="center" gap={8} paddingHorizontal={24}>
          <Text testID="home-title" fontSize={30} fontWeight="800" color="$color">
            You&apos;re in! 🎉
          </Text>
          <Text textAlign="center" fontSize={14} color="$muted">
            Pods and people that match your vibe are on the way.
          </Text>
        </YStack>
      </SafeAreaView>
    </YStack>
  );
}
