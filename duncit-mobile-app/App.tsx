import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, Theme } from 'tamagui';

import { RootNavigator } from '@/navigation/RootNavigator';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import config from './tamagui.config';

/**
 * App root: Tamagui theming + SafeArea + React Navigation. The theme store and
 * auth store are hydrated on launch; rendering waits until the persisted token
 * has been read so the navigation gate starts on the correct group.
 */
export default function App() {
  const scheme = useThemeStore((s) => s.scheme);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const ready = useAuthStore((s) => s.ready);

  useEffect(() => {
    void hydrateTheme();
    void bootstrap();
  }, [hydrateTheme, bootstrap]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme={scheme}>
        <Theme name={scheme}>
          <SafeAreaProvider>
            <NavigationContainer>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              <RootNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
