import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { AccountButton } from '@/components/AccountButton';
import { LocationDialog } from '@/components/LocationDialog';
import { LogoutButton } from '@/components/LogoutButton';
import { NotificationsBell } from '@/components/notifications';
import { StudioSwitchDialog } from '@/components/StudioSwitchDialog';
import { useBranding } from '@/hooks/useBranding';
import { useMe } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useAutoPodCountsStore } from '@/stores/auto-pod-counts.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { TourAnchor } from '@/tours/TourAnchor';
import { resolveMode, studioSwitchRoute } from '@/utils/studio-mode';
import { useProductVisibility } from '@/hooks/useProductVisibility';

import { HeaderGreeting } from './HeaderGreeting';
import { HeaderLeading } from './HeaderLeading';
import { HeaderRoundButton } from './HeaderRoundButton';

interface Props {
  /** The pre-onboarding survey header: a logout button and the greeting. */
  minimal?: boolean;
  /** The Home tab: its own search bar leads the page, so the header drops
   * its search button and greets the user instead. */
  home?: boolean;
}

/**
 * In-app header. Row one: the location pill on the left (led by the studio
 * pill in a Host/Venue/ecomm studio — the picker is never role-gated), and on
 * the right the round search (not on Home), bell and account avatar (which
 * opens the account menu) — or, when `minimal`, i.e. the pre-onboarding
 * survey, a plain logout button. Row two, on Home and the survey only: the
 * two-tone greeting.
 */
export function AppHeader({ minimal = false, home = false }: Readonly<Props>) {
  const navigation = useNavigation();
  const { color: ink } = useThemeColors();
  const { t } = useTranslation();
  const me = useMe().data?.me;
  const branding = useBranding().data?.branding;
  const roles = me?.roles ?? [];
  const studioMode = useStudioModeStore((s) => s.mode);
  const setStudioMode = useStudioModeStore((s) => s.setMode);
  const { visible: showProducts } = useProductVisibility();
  const effectiveStudio = resolveMode(studioMode, roles, { products: showProducts });
  const [switchOpen, setSwitchOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const isUserStudio = effectiveStudio === 'USER';
  const showSearch = !minimal && isUserStudio && !home;
  const showGreeting = minimal || (isUserStudio && home);
  const openLocation = () => setLocationOpen(true);
  const autoPodCounts = useAutoPodCountsStore((s) => s.data);
  const fetchAutoPodCounts = useAutoPodCountsStore((s) => s.fetch);

  // Primed on mount and re-read when the dialog opens, so the switch itself
  // never waits on the network to decide where to land.
  useEffect(() => {
    fetchAutoPodCounts().catch(() => undefined);
  }, [fetchAutoPodCounts]);

  const openSwitch = () => {
    fetchAutoPodCounts(true).catch(() => undefined);
    setSwitchOpen(true);
  };

  return (
    <YStack
      testID="app-header"
      backgroundColor="$background"
      paddingHorizontal={16}
      paddingTop={8}
      paddingBottom={12}
    >
      <XStack alignItems="center" gap={8}>
        <HeaderLeading
          minimal={minimal}
          studio={effectiveStudio}
          onOpenSwitch={openSwitch}
          onOpenLocation={openLocation}
        />
        {/* Round actions: Search (not on Home) · Alerts · avatar with online
         * dot. Studio modes keep their focused header (no search). The cart
         * is a bottom-bar destination now, not a header action. */}
        <XStack alignItems="center" gap={8}>
          {showSearch ? (
            <TourAnchor tour="home" anchor="home-search">
              <HeaderRoundButton
                testID="header-search"
                label={t('mweb.appHeader.searchPods')}
                onPress={() => navigation.navigate('Search')}
              >
                <MaterialIcons name="search" size={22} color={ink} />
              </HeaderRoundButton>
            </TourAnchor>
          ) : null}
          {minimal ? null : (
            <TourAnchor tour="home" anchor="home-notifications">
              <NotificationsBell />
            </TourAnchor>
          )}
          {minimal ? (
            <LogoutButton />
          ) : (
            <TourAnchor tour="home" anchor="home-profile">
              <AccountButton />
            </TourAnchor>
          )}
        </XStack>
      </XStack>
      {showGreeting ? (
        <HeaderGreeting
          tagline={branding?.home_header_tagline}
          firstName={me?.first_name}
          onOpenLocation={minimal ? undefined : openLocation}
        />
      ) : null}
      <StudioSwitchDialog
        open={switchOpen}
        roles={roles}
        showProducts={showProducts}
        current={effectiveStudio}
        onClose={() => setSwitchOpen(false)}
        onSelect={(next) => {
          setStudioMode(next);
          setSwitchOpen(false);
          // Jump straight to the selected role's dashboard (B3-2) — or to its
          // Auto Pod queue when offers are waiting on that role.
          navigation.navigate(studioSwitchRoute(next, autoPodCounts));
        }}
      />
      {minimal ? null : (
        <LocationDialog open={locationOpen} onClose={() => setLocationOpen(false)} />
      )}
    </YStack>
  );
}
