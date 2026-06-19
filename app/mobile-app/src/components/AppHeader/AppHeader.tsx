import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AccountButton } from '@/components/AccountButton';
import { AuthLogo } from '@/components/AuthLogo';
import { LocationButton } from '@/components/LocationButton';
import { LogoutButton } from '@/components/LogoutButton';
import { Mascot } from '@/components/Mascot';
import { NotificationsBell } from '@/components/notifications';
import { StudioSwitchDialog } from '@/components/StudioSwitchDialog';
import { useMe } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useHomeStore } from '@/stores/home.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_HOME_ROUTE, STUDIO_LABEL, resolveMode } from '@/utils/studio-mode';

/**
 * In-app header — the two dynamic brand marks (logo + mascot, both from the
 * shared `branding` setting) on the left. On the right: theme toggle plus either
 * the account avatar (which opens the sidebar drawer) or — when `minimal`, i.e.
 * the pre-onboarding survey — a plain logout button.
 */
export function AppHeader({ minimal = false }: Readonly<{ minimal?: boolean }>) {
  const navigation = useNavigation();
  const { color: ink, onPrimary } = useThemeColors();
  const me = useMe().data?.me;
  const roles = me?.roles ?? [];
  const studioMode = useStudioModeStore((s) => s.mode);
  const setStudioMode = useStudioModeStore((s) => s.setMode);
  const effectiveStudio = resolveMode(studioMode, roles);
  const [switchOpen, setSwitchOpen] = useState(false);
  const showBrowseActions = !minimal && effectiveStudio === 'USER';

  // Tapping the logo returns to the Home tab and refreshes the feed. The nested
  // screen param matters: from another tab (Explore/Clubs/…) the stack is already
  // on "Home", so a bare navigate('Home') would be a no-op and never switch tabs.
  const goHome = () => {
    void useHomeStore.getState().fetch(true);
    // Mirrors mWeb's HeaderBrand: always land on Home and, if already there,
    // smooth-scroll the feed back to the top.
    useHomeStore.getState().requestScrollTop();
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
        {!minimal && effectiveStudio !== 'USER' ? (
          <XStack
            testID="header-studio-badge"
            role="button"
            aria-label="Switch role"
            onPress={() => setSwitchOpen(true)}
            alignItems="center"
            gap={4}
            paddingHorizontal={10}
            paddingVertical={5}
            borderRadius={999}
            backgroundColor="$primary"
            pressStyle={{ opacity: 0.85 }}
          >
            <Text fontSize={11.5} fontWeight="900" color="$onPrimary">
              {STUDIO_LABEL[effectiveStudio]}
            </Text>
            <MaterialIcons name="swap-horiz" size={14} color={onPrimary} />
          </XStack>
        ) : null}
      </XStack>
      <XStack alignItems="center" gap={8}>
        {/* Studio modes (Host/Venue/ecomm) get a focused header — no search, no location. */}
        {showBrowseActions ? (
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
        ) : null}
        {showBrowseActions ? <LocationButton /> : null}
        {minimal ? null : <NotificationsBell />}
        {minimal ? <LogoutButton /> : <AccountButton />}
      </XStack>
      <StudioSwitchDialog
        open={switchOpen}
        roles={roles}
        current={effectiveStudio}
        onClose={() => setSwitchOpen(false)}
        onSelect={(next) => {
          setStudioMode(next);
          setSwitchOpen(false);
          // Jump straight to the selected role's dashboard (B3-2).
          navigation.navigate(STUDIO_HOME_ROUTE[next] as never);
        }}
      />
    </XStack>
  );
}
