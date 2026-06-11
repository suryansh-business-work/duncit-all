import { useNavigation } from '@react-navigation/native';
import { XStack, YStack } from 'tamagui';

import { AccountButton } from '@/components/AccountButton';
import { AuthLogo } from '@/components/AuthLogo';
import { LocationButton } from '@/components/LocationButton';
import { LogoutButton } from '@/components/LogoutButton';
import { Mascot } from '@/components/Mascot';
import { NotificationsBell } from '@/components/notifications';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useHomeStore } from '@/stores/home.store';

/**
 * In-app header — the two dynamic brand marks (logo + mascot, both from the
 * shared `branding` setting) on the left. On the right: theme toggle plus either
 * the account avatar (which opens the sidebar drawer) or — when `minimal`, i.e.
 * the pre-onboarding survey — a plain logout button.
 */
export function AppHeader({ minimal = false }: Readonly<{ minimal?: boolean }>) {
  const navigation = useNavigation();

  // Tapping the logo returns to Home and refreshes the feed (bug: logo did nothing).
  const goHome = () => {
    void useHomeStore.getState().fetch(true);
    navigation.navigate('Home');
  };

  return (
    <XStack
      testID="app-header"
      alignItems="center"
      justifyContent="space-between"
      paddingLeft={8}
      paddingRight={16}
      paddingVertical={8}
    >
      <XStack alignItems="center" gap={6}>
        <YStack
          testID="header-logo"
          role="button"
          aria-label="Go to home and refresh"
          onPress={goHome}
        >
          <AuthLogo size={34} />
        </YStack>
        <Mascot />
      </XStack>
      <XStack alignItems="center" gap={8}>
        {minimal ? null : <LocationButton />}
        {minimal ? null : <NotificationsBell />}
        <ThemeToggle />
        {minimal ? <LogoutButton /> : <AccountButton />}
      </XStack>
    </XStack>
  );
}
