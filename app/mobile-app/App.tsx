import { useEffect } from 'react';
import {
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, Theme, YStack } from 'tamagui';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useBranding } from '@/hooks/useBranding';
import { setWebFavicon } from '@/services/web-favicon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { RootNavigator } from '@/navigation/RootNavigator';
import { SplashOverlay } from '@/components/SplashOverlay';
import { linking } from '@/navigation/linking';
import { loadWebFonts } from '@/services/web-fonts';
import { useAuthStore } from '@/stores/auth.store';
import { useConfigStore } from '@/stores/config.store';
import { useThemeStore } from '@/stores/theme.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import config from './tamagui.config';
import { configureLogs, httpTransport, captureConsole, logs } from '@duncit/logs';
import { config as appConfig } from '@/constants/config';

// Base navigator background = the gradient's base colour, so there's no white
// flash between/behind screens. Each screen paints the full gradient itself.
const navThemeFor = (dark: boolean): NavTheme => ({
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: dark ? '#08070b' : '#ffffff' },
});

// Inject the brand web font (Quicksand) on web; no-op on native. Runs once at
// module load so the stylesheet is requested before first paint.
loadWebFonts();

// Ship console errors + structured logs to SignOz (via the server /logs ingest).
configureLogs(httpTransport(`${appConfig.apiUrl}/logs`));
captureConsole(logs.mobileApp);

/**
 * App root: Tamagui theming + SafeArea + React Navigation. The theme store and
 * auth store are hydrated on launch; rendering waits until the persisted token
 * has been read so the navigation gate starts on the correct group.
 */
export default function App() {
  const scheme = useThemeStore((s) => s.scheme);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateStudioMode = useStudioModeStore((s) => s.hydrate);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const ready = useAuthStore((s) => s.ready);
  const loadConfig = useConfigStore((s) => s.load);
  const { data: brandingData } = useBranding();

  // Web build: swap the favicon to the admin-configured one once branding loads.
  useEffect(() => {
    setWebFavicon(brandingData?.branding?.mobile_favicon_url ?? '');
  }, [brandingData]);

  useEffect(() => {
    hydrateTheme();
    hydrateStudioMode();
    bootstrap();
    // Pull Google/Maps config from the server (Tech portal source); best-effort,
    // the env fallback applies until it resolves.
    loadConfig();
  }, [hydrateTheme, hydrateStudioMode, bootstrap, loadConfig]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme={scheme}>
        <Theme name={scheme}>
          <SafeAreaProvider>
            <ErrorBoundary>
              <OfflineBanner />
              <YStack flex={1}>
                <NavigationContainer theme={navThemeFor(scheme === 'dark')} linking={linking}>
                  <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
                  <RootNavigator />
                </NavigationContainer>
                <SplashOverlay />
              </YStack>
            </ErrorBoundary>
          </SafeAreaProvider>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
