import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { navigationTheme } from './chrome';
import { linking } from './linking';
import { navigationRef } from './navigationRef';
import { RootNavigator } from './RootNavigator';

const THEMES = { light: navigationTheme('light'), dark: navigationTheme('dark') };

/**
 * The navigator in the mode's colours, with status-bar icons that contrast
 * with the surface-coloured header (dark icons on light, light icons on dark).
 */
export function AppNavigation({ dark }: Readonly<{ dark: boolean }>) {
  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        theme={dark ? THEMES.dark : THEMES.light}
      >
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </>
  );
}
