import { Spinner, YStack } from 'tamagui';
import { STUDIO_OPTIONS_ENTRY, studioOptionsFor, type PartnerStudioMode } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { SelectedVenueBar } from '@/components/studio-options/SelectedVenueBar';
import { StudioOptionsList } from '@/components/studio-options/StudioOptionsList';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useMe } from '@/hooks/useMe';
import { useMyVenues } from '@/hooks/useMyVenues';
import { useTranslation } from '@/hooks/useTranslation';

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
 * A studio's Options page — the one highlighted sidebar entry opens it. Every
 * option of the studio as a row (icon, title, hint), from the catalogue mWeb and
 * the Partner console render too (@duncit/utils studio-options). Options are
 * dropped once the studio role is gone, and Auto Pods while its flag is off.
 */
function StudioOptionsScreen({
  mode,
  testID,
}: Readonly<{ mode: PartnerStudioMode; testID: string }>) {
  const { t } = useTranslation();
  const { data, isLoading } = useMe();
  const autoPods = useFeatureFlag('auto_pods');
  const roles = data?.me?.roles ?? [];
  const items = studioOptionsFor(mode, roles, { autoPods });

  return (
    <StackScreen title={t(STUDIO_OPTIONS_ENTRY[mode].labelKey)} testID={testID}>
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
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
