import { useEffect, useState } from 'react';
import { Spinner, YStack } from 'tamagui';

import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { ClubPodsSchedule } from '@/components/details/club/ClubPodsSchedule';
import { MobileVenuePodsDocument } from '@/graphql/hosts-venues';
import { useDetailNav } from '@/hooks/useDetailNav';
import type { ClubPod } from '@/hooks/useDetails';
import { graphqlRequest } from '@/services/graphql.client';

/** "Pods at this venue" — every live pod hosted at the venue, in the same
 * Happening soon / Upcoming / Previous rails as the club page. mWeb twin:
 * venues-page/VenuePodsSection. */
export function VenuePodsSection({ venueId }: Readonly<{ venueId: string }>) {
  const { openPod } = useDetailNav();
  const [pods, setPods] = useState<ClubPod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileVenuePodsDocument, { venueId }, { auth: true })
      .then((d) => active && setPods(d.pods as ClubPod[]))
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [venueId]);

  return (
    <YStack gap={10} testID="venue-pods-section">
      <SectionHeader title="Pods at this venue" />
      {isLoading ? <Spinner testID="venue-pods-loading" color="$primary" /> : null}
      {!isLoading && pods.length === 0 ? (
        <EmptyState
          testID="venue-no-pods"
          icon="event-busy"
          title="No pods hosted at this venue yet."
        />
      ) : null}
      {!isLoading && pods.length > 0 ? (
        <ClubPodsSchedule
          pods={pods}
          onOpenPod={(pod) => openPod(pod.club_slug, pod.pod_id, pod.id)}
        />
      ) : null}
    </YStack>
  );
}
