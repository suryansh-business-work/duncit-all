import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { AppHeader } from '@/components/AppHeader';

/** Shared scaffold for the bottom-tab screens: the gradient backdrop + app
 * header above the tab's content (which fills the rest, above the floating
 * bottom nav). The opaque gradient keeps each tab from showing through the
 * others on web (where inactive tabs stay mounted). */
export function TabScreen({ testID, children }: { testID: string; children: ReactNode }) {
  return (
    <YStack flex={1} testID={testID}>
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <AppHeader />
        {children}
      </SafeAreaView>
    </YStack>
  );
}
