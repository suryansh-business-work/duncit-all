import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { AccountButton } from '@/components/AccountButton';
import { AuthLogo } from '@/components/AuthLogo';
import { LocationButton } from '@/components/LocationButton';
import { LogoutButton } from '@/components/LogoutButton';
import { Mascot } from '@/components/Mascot';
import { NotificationsBell } from '@/components/notifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useHomeStore } from '@/stores/home.store';

/**
 * In-app header — the two dynamic brand marks (logo + mascot, both from the
 * shared `branding` setting) on the left. On the right: theme toggle plus either
 * the account avatar (which opens the sidebar drawer) or — when `minimal`, i.e.
 * the pre-onboarding survey — a plain logout button.
 */
export function AppHeader({ minimal = false }: Readonly<{ minimal?: boolean }>) {
  const navigation = useNavigation();
  const { color: ink } = useThemeColors();

  // Tapping the logo returns to the Home tab and refreshes the feed. The nested
  // screen param matters: from another tab (Explore/Clubs/…) the stack is already
  // on "Home", so a bare navigate('Home') would be a no-op and never switch tabs.
  const goHome = () => {
    void useHomeStore.getState().fetch(true);
    navigation.navigate('Home', { screen: 'HomeTab' });
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
        {minimal ? null : (
          <XStack
            testID="header-search"
            role="button"
            aria-label="Search pods"
            onPress={() => navigation.navigate('Search')}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="search" size={24} color={ink} />
          </XStack>
        )}
        {minimal ? null : <LocationButton />}
        {minimal ? null : <NotificationsBell />}
        {minimal ? <LogoutButton /> : <AccountButton />}
      </XStack>
    </XStack>
  );
}
