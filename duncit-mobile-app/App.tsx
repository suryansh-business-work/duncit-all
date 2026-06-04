import { useEffect } from 'react';
import {
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, Theme } from 'tamagui';

import { RootNavigator } from '@/navigation/RootNavigator';
import { linking } from '@/navigation/linking';
import { loadWebFonts } from '@/services/web-fonts';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import config from './tamagui.config';

// Base navigator background = the gradient's base colour, so there's no white
// flash between/behind screens. Each screen paints the full gradient itself.
const navThemeFor = (dark: boolean): NavTheme => ({
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: dark ? '#08070b' : '#ffffff' },
});

// Inject the brand web font (Quicksand) on web; no-op on native. Runs once at
// module load so the stylesheet is requested before first paint.
loadWebFonts();

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
            <NavigationContainer theme={navThemeFor(scheme === 'dark')} linking={linking}>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              <RootNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
