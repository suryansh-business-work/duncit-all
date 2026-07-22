import { useEffect, useMemo } from 'react';
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
import { useBrandFont } from '@/hooks/useBrandFont';
import { setWebFavicon } from '@/services/web-favicon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { RootNavigator } from '@/navigation/RootNavigator';
import { SplashOverlay } from '@/components/SplashOverlay';
import { ForceUpdateGate } from '@/components/ForceUpdateGate';
import { linking } from '@/navigation/linking';
import { navigationRef } from '@/navigation/navigationRef';
import { loadWebFonts } from '@/services/web-fonts';
import { useAuthStore } from '@/stores/auth.store';
import { useAppVersionStore } from '@/stores/app-version.store';
import { useConfigStore } from '@/stores/config.store';
import { useThemeStore } from '@/stores/theme.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { useCartStore } from '@/stores/cart.store';
import { FloatingCartButton } from '@/components/cart/FloatingCartButton';
import config, { createBrandConfig } from './tamagui.config';
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
  const hydrateCart = useCartStore((s) => s.hydrate);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const ready = useAuthStore((s) => s.ready);
  const loadConfig = useConfigStore((s) => s.load);
  const loadAppVersion = useAppVersionStore((s) => s.fetch);
  const { data: brandingData } = useBranding();
  // Admin-picked Google Font (Branding → Fonts → Mobile App): once loaded, the
  // Tamagui config is rebuilt around it so every Text/heading re-themes.
  const brandFont = useBrandFont();
  const tamaguiConfig = useMemo(
    () => (brandFont ? createBrandConfig(brandFont) : config),
    [brandFont],
  );

  // Web build: swap the favicon to the admin-configured one once branding loads.
  useEffect(() => {
    setWebFavicon(brandingData?.branding?.mobile_favicon_url ?? '');
  }, [brandingData]);

  useEffect(() => {
    hydrateTheme();
    hydrateStudioMode();
    hydrateCart().catch(() => undefined);
    bootstrap();
    // Pull Google/Maps config from the server (Tech portal source); best-effort,
    // the env fallback applies until it resolves.
    loadConfig();
    // Fetch the latest published app version for the force-update gate (public,
    // best-effort — a failure leaves the gate open, never locking users out).
    loadAppVersion();
  }, [hydrateTheme, hydrateStudioMode, hydrateCart, bootstrap, loadConfig, loadAppVersion]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={scheme}>
        <Theme name={scheme}>
          <SafeAreaProvider>
            <ErrorBoundary>
              <OfflineBanner />
              <YStack flex={1}>
                <NavigationContainer
                  ref={navigationRef}
                  theme={navThemeFor(scheme === 'dark')}
                  linking={linking}
                >
                  <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
                  <RootNavigator />
                  <FloatingCartButton />
                </NavigationContainer>
                <SplashOverlay />
                <ForceUpdateGate />
              </YStack>
            </ErrorBoundary>
          </SafeAreaProvider>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
