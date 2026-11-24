import { Platform, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, Theme } from 'tamagui';
import { configureLogs, detectEnvironment, httpTransport } from '@duncit/logs';

import config from './tamagui.config';
import { config as appConfig } from '@/constants/config';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { linking } from '@/navigation/linking';
import { navigationRef } from '@/navigation/navigationRef';
import { RootNavigator } from '@/navigation/RootNavigator';
import { peekToken } from '@/services/session';
import { useAppSession } from '@/hooks/useAppSession';

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
  const scheme = useColorScheme();
  useAppSession();

  return (
    <ErrorBoundary scope="root" route="App">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <TamaguiProvider config={config} defaultTheme={scheme === 'dark' ? 'dark' : 'light'}>
            <Theme name={scheme === 'dark' ? 'dark' : 'light'}>
              <NavigationContainer ref={navigationRef} linking={linking}>
                <RootNavigator />
              </NavigationContainer>
              <StatusBar style="light" />
            </Theme>
          </TamaguiProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
