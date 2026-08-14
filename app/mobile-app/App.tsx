import { useEffect, useMemo } from 'react';
import {
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, Theme, YStack } from 'tamagui';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useBranding } from '@/hooks/useBranding';
import { useBrandFont } from '@/hooks/useBrandFont';
import { setWebFavicon } from '@/services/web-favicon';
import { cachedDuid, logClientInfo } from '@/services/device';
import { OfflineBanner } from '@/components/OfflineBanner';
import { RootNavigator } from '@/navigation/RootNavigator';
import { NativeTourProvider } from '@/tours/NativeTourProvider';
import { SplashOverlay } from '@/components/SplashOverlay';
import { ForceUpdateGate } from '@/components/ForceUpdateGate';
import { AppPopup } from '@/components/AppPopup';
import { ExitConfirmGate } from '@/components/ExitConfirmGate';
import { linking } from '@/navigation/linking';
import {
  initShortLinkAttribution,
  reportJourneyForCurrentRoute,
} from '@/services/short-link-attribution';
import { navigationRef } from '@/navigation/navigationRef';
import { loadWebFonts } from '@/services/web-fonts';
import { useAuthStore } from '@/stores/auth.store';
import { useAppVersionStore } from '@/stores/app-version.store';
import { useConfigStore } from '@/stores/config.store';
import { useThemeStore } from '@/stores/theme.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { useCartStore } from '@/stores/cart.store';
import config, { createBrandConfig } from './tamagui.config';
import { configureLogs, httpTransport, detectEnvironment } from '@duncit/logs';
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

// Ship structured, file-level logs to SignOz (via the server /logs ingest).
// Native has no `location`, so environment/url are derived from the API base URL
// (localhost / staging.*.duncit.com / *.duncit.com) the app is pointed at.
// `os` splits native logs into iOS / Android / native-web for the telemetry Bugs view.
const DEVICE_OS = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
configureLogs(
  // The token and device id ride along as headers, exactly as on a GraphQL
  // call, so the server can attribute the log to the signed-in account. Both
  // are read from memory rather than the Keychain: building headers cannot
  // await, and a log written before the first read simply goes without them.
  httpTransport(`${appConfig.apiUrl}/logs`, {
    getToken: () => useAuthStore.getState().token,
    getDeviceId: cachedDuid,
  }),
  {
    platform: 'native',
    os: DEVICE_OS,
    environment: detectEnvironment(appConfig.apiUrl),
    url: () => appConfig.apiUrl,
    host: () => {
      try {
        return new URL(appConfig.apiUrl).host;
      } catch {
        return undefined;
      }
    },
    client: logClientInfo,
  },
);

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

  // Short-link attribution: capture the URL the app was opened with (an App
  // Link from a duncit.com short link carries dl/dlc markers) and every URL
  // received while running. The subscription outlives renders; unsubscribed on
  // teardown.
  useEffect(() => initShortLinkAttribution(), []);

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
                  onStateChange={reportJourneyForCurrentRoute}
                >
                  <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
                  {/* Inside NavigationContainer so a tour survives the
                      navigation that takes the user to its screen. */}
                  <NativeTourProvider>
                    <RootNavigator />
                  </NativeTourProvider>
                </NavigationContainer>
                <SplashOverlay />
                {/* Below the update gate on purpose: a blocked build must see
                    the store prompt, not a campaign image over it. */}
                <AppPopup />
                <ForceUpdateGate />
                {/* Global, like the two above: the back button is pressed from
                    every screen, so the guard cannot live inside one. */}
                <ExitConfirmGate />
              </YStack>
            </ErrorBoundary>
          </SafeAreaProvider>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
