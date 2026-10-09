import type { ReactNode } from 'react';
import { YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { PodRequestsSection } from '@/components/pod-requests/PodRequestsSection';
import { SelectedVenueBar } from '@/components/studio-options/SelectedVenueBar';
import { PartnerSide } from '@/generated/graphql/graphql';
import { useMyVenues } from '@/hooks/useMyVenues';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  side: PartnerSide;
  testID: string;
  /** Venue side: the venue whose requests are listed. */
  venueId?: string | null;
  /** Venue side: the picker above the inbox. */
  header?: ReactNode;
}

/**
 * Studio menu → Requests → Pod Requests: the inbox that used to live only
 * inside Host / Venue Studio, given its own screen so the menu opens it
 * directly. The section is the one the studio screen shows — not a copy.
 * mWeb twin: pages/pod-requests/PodRequestsPage.
 */
function PodRequestsScreen({ side, testID, venueId, header }: Readonly<Props>) {
  const { t } = useTranslation();
  const showSection = side === PartnerSide.Host || !!venueId;
  return (
    <StackScreen title={t('mweb.studioNav.podRequests')} testID={testID}>
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          {header}
          {showSection ? <PodRequestsSection side={side} venueId={venueId} /> : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}

/** Host Studio → Requests → Pod Requests (/host/pod-requests). */
export function HostPodRequestsScreen() {
  return <PodRequestsScreen side={PartnerSide.Host} testID="host-pod-requests-screen" />;
}

/** Venue Studio → Requests → Pod Requests (/venues/pod-requests): the venue
 * side is per venue, so it opens on the venue picked on any venue screen. */
export function VenuePodRequestsScreen() {
  const { venues, venue, venueId, selectVenue, isLoading, error } = useMyVenues();
  return (
    <PodRequestsScreen
      side={PartnerSide.Venue}
      testID="venue-pod-requests-screen"
      venueId={venueId}
      header={
        <SelectedVenueBar
          venues={venues}
          venue={venue}
          onSelect={selectVenue}
          isLoading={isLoading}
          error={error}
        />
      }
    />
  );
}
