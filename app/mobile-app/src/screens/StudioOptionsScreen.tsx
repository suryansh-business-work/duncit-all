import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, YStack } from 'tamagui';
import {
  STUDIO_OPTIONS_ENTRY,
  heldStudioModes,
  studioOptionsFor,
  type PartnerStudioMode,
} from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { SelectedVenueBar } from '@/components/studio-options/SelectedVenueBar';
import { StudioOptionsList } from '@/components/studio-options/StudioOptionsList';
import { StudioRoleSwitcher } from '@/components/studio-options/StudioRoleSwitcher';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useMe } from '@/hooks/useMe';
import { useMyVenues } from '@/hooks/useMyVenues';
import { PRODUCT_VISIBILITY_FLAG } from '@/hooks/useProductVisibility';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_ROUTE, type StudioSwitchRoute } from '@/utils/studio-mode';

/** Venue Options opens with the venue every option below will be about. */
function VenueOptionsPicker() {
  const { venues, venue, selectVenue, isLoading, error } = useMyVenues();
  return (
    <SelectedVenueBar
      venues={venues}
      venue={venue}
      onSelect={selectVenue}
      isLoading={isLoading}
      error={error}
    />
  );
}

/**
 * The Studio — the screen the sidebar's one "Studio" entry and a role switch
 * both open. Every option of the role as a row (icon, title, hint), from the
 * catalogue mWeb and the Partner console render too (@duncit/utils
 * studio-options). A partner with more than one role switches between them at
 * the top, and the options below swap to the chosen role's. Options are dropped
 * once the role is gone, and Auto Pods while its flag is off.
 */
function StudioOptionsScreen({
  mode,
  testID,
}: Readonly<{ mode: PartnerStudioMode; testID: string }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Every Studio route is a param-less screen; RN v7's distributive `replace`
  // needs the narrower signature spelled out (as `navigate` does elsewhere).
  const replace: (screen: StudioSwitchRoute) => void = navigation.replace;
  const { data, isLoading } = useMe();
  const autoPods = useFeatureFlag('auto_pods');
  const products = useFeatureFlag(PRODUCT_VISIBILITY_FLAG);
  const setStudioMode = useStudioModeStore((s) => s.setMode);
  const roles = data?.me?.roles ?? [];
  const items = studioOptionsFor(mode, roles, { autoPods });
  // The roles the switcher offers — the same list the role switch offers.
  const held = heldStudioModes(roles, { products });
  // Switching here is a role switch like any other: the role is remembered,
  // and the route changes with it so a deep link and a restored stack keep it.
  // It REPLACES this screen — Back leaves the Studio instead of stepping back
  // through every role that was looked at.
  const switchRole = (next: PartnerStudioMode) => {
    setStudioMode(next);
    replace(STUDIO_ROUTE[next]);
  };

  return (
    <StackScreen title={t(STUDIO_OPTIONS_ENTRY[mode].labelKey)} testID={testID}>
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          <StudioRoleSwitcher modes={held} value={mode} onChange={switchRole} />
          {mode === 'VENUE' ? <VenueOptionsPicker /> : null}
          {isLoading && items.length === 0 ? (
            <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
          ) : null}
          <StudioOptionsList items={items} />
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}

/** /venues/options */
export function VenueOptionsScreen() {
  return <StudioOptionsScreen mode="VENUE" testID="venue-options-screen" />;
}

/** /host/options */
export function HostOptionsScreen() {
  return <StudioOptionsScreen mode="HOST" testID="host-options-screen" />;
}

/** /clubs/options */
export function ClubOptionsScreen() {
  return <StudioOptionsScreen mode="CLUB" testID="club-options-screen" />;
}

/** /products/options — behind the product flag, like the brand dashboard. */
export function BrandOptionsScreen() {
  return <StudioOptionsScreen mode="ECOMM" testID="brand-options-screen" />;
}
