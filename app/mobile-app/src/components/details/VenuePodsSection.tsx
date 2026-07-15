import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

import { ClubPodsSchedule } from '@/components/details/club/ClubPodsSchedule';
import { MobileVenuePodsDocument } from '@/graphql/hosts-venues';
import type { ClubPod } from '@/hooks/useDetails';
import { graphqlRequest } from '@/services/graphql.client';
import type { RootStackParamList } from '@/navigation/types';

/** "Pods at this venue" — every live pod hosted at the venue, in the same
 * Happening soon / Upcoming / Previous rails as the club page. mWeb twin:
 * VenueDetailsPage's pods section. */
export function VenuePodsSection({ venueId }: Readonly<{ venueId: string }>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
      <Text fontSize={15} fontWeight="900" color="$color">
        Pods at this venue
      </Text>
      {isLoading ? <Spinner testID="venue-pods-loading" color="$primary" /> : null}
      {!isLoading && pods.length === 0 ? (
        <Text testID="venue-no-pods" fontSize={13} color="$muted">
          No pods hosted at this venue yet.
        </Text>
      ) : null}
      {!isLoading && pods.length > 0 ? (
        <ClubPodsSchedule
          pods={pods}
          onOpenPod={(pod) =>
            navigation.navigate('PodDetails', { podId: pod.id, title: pod.pod_title })
          }
        />
      ) : null}
    </YStack>
  );
}
