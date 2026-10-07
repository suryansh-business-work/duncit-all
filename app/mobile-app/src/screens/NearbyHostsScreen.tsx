import { Spinner, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { VenueSwitcher } from '@/components/studio';
import { NearbySearchBody } from '@/components/nearby-partners/NearbySearchBody';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useNearbyHosts } from '@/hooks/useNearbyHosts';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Venue Studio → Search Nearby Hosts (/venues/nearby-hosts, mWeb's path):
 * approved hosts around the picked location, for one of the owner's approved
 * venues (the switcher picks which), filtered to that venue's category to
 * start. "Request Pod" sends a VENUE_TO_HOST request.
 */
export function NearbyHostsScreen() {
  const { t } = useTranslation();
  const nearby = useNearbyHosts();
  const { state, venues, venue, partners } = nearby;
  const noVenue = !nearby.venuesLoading && !nearby.venuesError && venues.length === 0;

  return (
    <StackScreen title={t('podRequests.searchHostsTitle')} testID="nearby-hosts-screen">
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          {nearby.venuesLoading ? (
            <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
          ) : null}
          <VenueSwitcher
            venues={venues}
            venueId={venue?.id ?? null}
            onSelect={nearby.selectVenue}
          />
          {nearby.venuesError ? (
            <Text role="alert" testID="nearby-venues-error" fontSize={13} color="$danger">
              {nearby.venuesError}
            </Text>
          ) : null}
          {noVenue ? (
            <Text testID="nearby-no-venue" role="status" fontSize={14} color="$muted">
              {t('podRequests.noApprovedVenue')}
            </Text>
          ) : null}
          {venue ? (
            <NearbySearchBody
              kind="HOST"
              state={state}
              items={partners.items}
              loading={partners.isLoading}
              error={partners.error}
              quota={partners.quota}
              send={nearby.send}
            />
          ) : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
