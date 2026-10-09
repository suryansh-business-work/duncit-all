import type { ReactNode } from 'react';
import { Spinner, Text, YStack } from 'tamagui';

import { PublishPageCard } from '@/components/public-page';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { SelectedVenueBar } from '@/components/studio-options/SelectedVenueBar';
import { useMe } from '@/hooks/useMe';
import { useMyVenues } from '@/hooks/useMyVenues';
import { useTranslation } from '@/hooks/useTranslation';

function PublishFrame({
  title,
  testID,
  children,
}: Readonly<{ title: string; testID: string; children: ReactNode }>) {
  return (
    <StackScreen title={title} testID={testID}>
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>{children}</YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}

/**
 * Venue Options → Publish Your Venue (/venues/publish): the venue picked at the
 * top, and the same publish card Venue Studio shows for it. Only an approved
 * venue has a public page, so any other status says so instead.
 */
export function VenuePublishScreen() {
  const { t } = useTranslation();
  const { venues, venue, selectVenue, isLoading, error } = useMyVenues();
  return (
    <PublishFrame title={t('mweb.studioOptions.publishVenue')} testID="venue-publish-screen">
      <SelectedVenueBar
        venues={venues}
        venue={venue}
        onSelect={selectVenue}
        isLoading={isLoading}
        error={error}
      />
      {venue?.status === 'APPROVED' ? (
        <PublishPageCard kind="VENUE" refId={venue.id} title={venue.venue_name} />
      ) : null}
      {venue && venue.status !== 'APPROVED' ? (
        <Text role="status" testID="venue-publish-needs-approval" fontSize={14} color="$muted">
          {t('mweb.studioOptions.publishNeedsApproval')}
        </Text>
      ) : null}
    </PublishFrame>
  );
}

/**
 * Host Options → Publish Your Host Page (/host/publish): the publish card Host
 * Studio shows — only an approved host has a host page to publish.
 */
export function HostPublishScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = useMe();
  const me = data?.me;
  const isHost = me?.roles?.includes('HOST') ?? false;
  return (
    <PublishFrame title={t('mweb.studioOptions.publishHost')} testID="host-publish-screen">
      {isLoading && !me ? (
        <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
      ) : null}
      {me && isHost ? (
        <PublishPageCard kind="HOST" title={me.full_name || me.username || ''} />
      ) : null}
    </PublishFrame>
  );
}
