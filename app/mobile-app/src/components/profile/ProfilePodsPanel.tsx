import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Text, YStack } from 'tamagui';
import { nothingUpcoming } from '@duncit/utils';

import { RequestEventCard } from '@/components/event-request';
import { PodCard } from '@/components/home/PodCard';
import { ListSkeleton } from '@/components/Skeleton';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useProfilePods, type ProfilePodsKind } from '@/hooks/useProfilePods';
import { useTranslation } from '@/hooks/useTranslation';

const SIDE_PADDING = 16;
const MAX_CARD_WIDTH = 520;

interface Props {
  userId: string;
  kind: ProfilePodsKind;
  /** The host's name, on SOMEONE ELSE's hosted tab: with nothing coming up,
   * the viewer may request an event. Absent on the owner's own profile. */
  requestFromHost?: string;
}

/**
 * A profile tab's pods — the ones this member joined, or the ones they host —
 * as the same cards the home feed shows, each opening its pod. A host with
 * nothing coming up offers the viewer "Request an event" under them.
 * Twin of mWeb's `ProfilePodsPanel` (rule 27).
 */
export function ProfilePodsPanel({ userId, kind, requestFromHost }: Readonly<Props>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { openPod } = useDetailNav();
  const { pods, isLoading, error } = useProfilePods(userId, kind);
  // Size the cards to the panel's OWN width, not the window's: the public
  // profile already pads its scroll by 16, so a window-based width pushed every
  // card 32px past the right edge. The window answers only until the first layout.
  const [innerWidth, setInnerWidth] = useState(0);
  const available = innerWidth > 0 ? innerWidth : width - SIDE_PADDING * 2;
  const cardWidth = Math.min(available, MAX_CARD_WIDTH);
  const request =
    kind === 'hosted' && requestFromHost !== undefined && nothingUpcoming(pods) ? (
      <RequestEventCard targetType="HOST" targetId={userId} targetName={requestFromHost} />
    ) : null;

  if (isLoading && pods.length === 0)
    return <ListSkeleton testID={`profile-pods-${kind}-loading`} />;
  if (error) {
    return (
      <Text testID={`profile-pods-${kind}-error`} role="alert" padding={24} color="$danger">
        {t('mweb.profile.podsLoadFailed')}
      </Text>
    );
  }
  if (pods.length === 0) {
    return (
      <YStack paddingHorizontal={SIDE_PADDING} paddingBottom={24}>
        <Text
          testID={`profile-pods-${kind}-empty`}
          textAlign="center"
          fontSize={14}
          fontWeight="500"
          color="$muted"
          paddingVertical={40}
        >
          {kind === 'joined' ? t('mweb.profile.noJoinedPods') : t('mweb.profile.noHostedPods')}
        </Text>
        {request}
      </YStack>
    );
  }
  return (
    <YStack
      testID={`profile-pods-${kind}`}
      gap={14}
      paddingHorizontal={SIDE_PADDING}
      paddingBottom={24}
      onLayout={(e) => setInnerWidth(Math.max(0, e.nativeEvent.layout.width - SIDE_PADDING * 2))}
    >
      {pods.map((pod) => (
        <PodCard
          key={pod.id}
          pod={pod}
          width={cardWidth}
          onPress={() => openPod(pod.club_slug, pod.pod_id, pod.id)}
        />
      ))}
      {request}
    </YStack>
  );
}
