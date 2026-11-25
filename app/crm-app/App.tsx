import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, Theme } from 'tamagui';
import { configureLogs, detectEnvironment, fireAndForget, httpTransport, logs } from '@duncit/logs';

import config from './tamagui.config';
import { config as appConfig } from '@/constants/config';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppNavigation } from '@/navigation/AppNavigation';
import { peekToken } from '@/services/session';
import { useAppSession } from '@/hooks/useAppSession';
import { resolveColorMode, useAppearanceStore } from '@/stores/appearance.store';

// Structured logs to the server's /logs ingest (SignOz), attributed to the
// signed-in account the same way a GraphQL call is.
configureLogs(httpTransport(`${appConfig.apiUrl}/logs`, { getToken: peekToken }), {
  platform: 'native',
  os: Platform.OS === 'android' ? 'android' : 'web',
  environment: detectEnvironment(appConfig.apiUrl),
  url: () => appConfig.apiUrl,
});

/**
 * Duncit CRM: the CRM portal on an Android phone, plus a dialer, caller ID and
 * call logging. Root error boundary → theme → navigation; the session hook
 * restores sign-in and starts the call sync.
 */
export default function App() {
  const system = useColorScheme();
  const saved = useAppearanceStore((s) => s.mode);
  const scheme = resolveColorMode(saved, system);
  useAppSession();
  useEffect(() => {
    fireAndForget(
      useAppearanceStore.getState().hydrate(),
      logs.mobileApp,
      'crm-app/App',
      'appearance',
    );
  }, []);

  return (
    <ErrorBoundary scope="root" route="App">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <TamaguiProvider config={config} defaultTheme={scheme}>
            <Theme name={scheme}>
              <AppNavigation dark={scheme === 'dark'} />
            </Theme>
          </TamaguiProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
