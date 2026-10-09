import { useState } from 'react';
import { YStack } from 'tamagui';
import { podsByPhase, VENUE_POD_PHASES, type VenuePodPhase } from '@duncit/utils';

import { GiftCardSegmented, type SegmentOption } from '@/components/gift-cards/GiftCardSegmented';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { SelectedVenueBar } from '@/components/studio-options/SelectedVenueBar';
import { asVenuePodRow, useVenueStudioPods, VenueStudioPods } from '@/components/studio';
import { useMyVenues } from '@/hooks/useMyVenues';
import { useTranslation } from '@/hooks/useTranslation';

/** Each tab's label and its empty sentence — literal keys, one per phase. */
const PHASE_COPY: Record<VenuePodPhase, { label: string; empty: string }> = {
  UPCOMING: {
    label: 'mweb.studioOptions.podsUpcoming',
    empty: 'mweb.studioOptions.noPodsUpcoming',
  },
  CURRENT: { label: 'mweb.studioOptions.podsCurrent', empty: 'mweb.studioOptions.noPodsCurrent' },
  PAST: { label: 'mweb.studioOptions.podsPast', empty: 'mweb.studioOptions.noPodsPast' },
};

/** The picked venue's pods in three tabs, split on the server's own bucket. */
function VenuePodsTabs({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<VenuePodPhase>('UPCOMING');
  const state = useVenueStudioPods(venueId);
  // The row's bucket is a plain string on the wire; narrowed the way the
  // shared venue-pod rules read it before it is split.
  const byPhase = podsByPhase(
    state.pods.map((pod) => ({ ...pod, bucket: asVenuePodRow(pod).bucket })),
  );
  const options: SegmentOption<VenuePodPhase>[] = VENUE_POD_PHASES.map((value) => ({
    value,
    label: t(PHASE_COPY[value].label),
    testID: `venue-pods-tab-${value.toLowerCase()}`,
  }));

  return (
    <YStack gap={12}>
      <GiftCardSegmented options={options} value={phase} onChange={setPhase} />
      <VenueStudioPods
        state={state}
        rows={byPhase[phase]}
        emptyKey={PHASE_COPY[phase].empty}
        testID="venue-pods"
      />
    </YStack>
  );
}

/**
 * Venue Options → Pods at Your Venue (/venues/pods): the venue picked at the
 * top, then its pods as Upcoming / Current / Past, each row with the owner's
 * usual per-pod actions. mWeb twin: pages/venues/VenuePodsPage.
 */
export function VenuePodsScreen() {
  const { t } = useTranslation();
  const { venues, venue, venueId, selectVenue, isLoading, error } = useMyVenues();
  return (
    <StackScreen title={t('mweb.studioOptions.venuePods')} testID="venue-pods-screen">
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          <SelectedVenueBar
            venues={venues}
            venue={venue}
            onSelect={selectVenue}
            isLoading={isLoading}
            error={error}
          />
          {venueId ? <VenuePodsTabs venueId={venueId} /> : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
