import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { AccountButton } from '@/components/AccountButton';
import { LogoutButton } from '@/components/LogoutButton';
import { NotificationsBell } from '@/components/notifications';
import { StudioSwitchDialog } from '@/components/StudioSwitchDialog';
import { useBranding } from '@/hooks/useBranding';
import { useMe } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_HOME_ROUTE, STUDIO_LABEL, resolveMode } from '@/utils/studio-mode';

import { HeaderGreeting } from './HeaderGreeting';

/**
 * In-app header — the admin-configurable tagline plus the tappable location on
 * the left (or the studio badge when in a Host/Venue/ecomm studio). On the
 * right: search, notifications and either the account avatar (which opens the
 * sidebar drawer) or — when `minimal`, i.e. the pre-onboarding survey — a plain
 * logout button.
 */
export function AppHeader({ minimal = false }: Readonly<{ minimal?: boolean }>) {
  const navigation = useNavigation();
  const { color: ink, onPrimary } = useThemeColors();
  const me = useMe().data?.me;
  const branding = useBranding().data?.branding;
  const roles = me?.roles ?? [];
  const studioMode = useStudioModeStore((s) => s.mode);
  const setStudioMode = useStudioModeStore((s) => s.setMode);
  const effectiveStudio = resolveMode(studioMode, roles);
  const [switchOpen, setSwitchOpen] = useState(false);
  const showBrowseActions = !minimal && effectiveStudio === 'USER';

  return (
    <XStack
      testID="app-header"
      alignItems="center"
      justifyContent="space-between"
      paddingLeft={16}
      paddingRight={16}
      paddingVertical={8}
    >
      <XStack alignItems="center" gap={6} flex={1} minWidth={0}>
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
        ) : (
          <HeaderGreeting
            tagline={branding?.home_header_tagline}
            showLocation={showBrowseActions}
          />
        )}
      </XStack>
      <XStack alignItems="center" gap={8}>
        {/* Studio modes (Host/Venue/ecomm) get a focused header — no search. */}
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
