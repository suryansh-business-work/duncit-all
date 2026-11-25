import { NavigationContainer } from '@react-navigation/native';

import { navigationTheme } from './chrome';
import { linking } from './linking';
import { navigationRef } from './navigationRef';
import { WaExtractionBanner } from '@/screens/whatsapp-generator/extraction/WaExtractionBanner';
import { RootNavigator } from './RootNavigator';

const THEMES = { light: navigationTheme('light'), dark: navigationTheme('dark') };

/**
 * The navigator in the mode's colours. The status-bar icons are set where the
 * ground under them is known: light over the red app bar (RootNavigator), by
 * mode on the sign-in screens (AuthLayout) and over the side menu.
 */
export function AppNavigation({ dark }: Readonly<{ dark: boolean }>) {
  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      theme={dark ? THEMES.dark : THEMES.light}
    >
      <RootNavigator />
      {/* A WhatsApp extraction keeps reporting on every screen until it ends. */}
      <WaExtractionBanner />
    </NavigationContainer>
  );
}
