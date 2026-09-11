import type { ReactNode } from 'react';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { AppHeader } from '@/components/AppHeader';
import { SuperCategoryTabs } from '@/components/SuperCategoryTabs';
import type { TabParamList } from '@/navigation/tabs';

const HOME_TAB: keyof TabParamList = 'HomeTab';

/** Shared scaffold for the bottom-tab screens, in mWeb's order: the page
 * ground, then the app header, the super-category switch and the tab's
 * content (which fills the rest, above the floating bottom nav). The opaque
 * ground keeps each tab from showing through the others on web (where
 * inactive tabs stay mounted). */
export function TabScreen({ testID, children }: Readonly<{ testID: string; children: ReactNode }>) {
  const route = useRoute();
  return (
    <YStack flex={1} testID={testID}>
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <AppHeader home={route.name === HOME_TAB} />
        <SuperCategoryTabs />
        <KeyboardScreen>{children}</KeyboardScreen>
      </SafeAreaView>
    </YStack>
  );
}
