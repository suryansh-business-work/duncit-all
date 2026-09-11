import { useWindowDimensions } from 'react-native';
import { Text, YStack } from 'tamagui';

import { PodCard } from '@/components/home/PodCard';
import { ListSkeleton } from '@/components/Skeleton';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useProfilePods, type ProfilePodsKind } from '@/hooks/useProfilePods';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  userId: string;
  kind: ProfilePodsKind;
}

/**
 * A profile tab's pods — the ones this member joined, or the ones they host —
 * as the same cards the home feed shows, each opening its pod.
 * Twin of mWeb's `ProfilePodsPanel` (rule 27).
 */
export function ProfilePodsPanel({ userId, kind }: Readonly<Props>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { openPod } = useDetailNav();
  const { pods, isLoading, error } = useProfilePods(userId, kind);
  const cardWidth = Math.min(width - 32, 520);

  if (isLoading && pods.length === 0)
    return <ListSkeleton testID={`profile-pods-${kind}-loading`} />;
  if (error) {
    return (
      <Text testID={`profile-pods-${kind}-error`} padding={24} color="$danger">
        {t('mweb.profile.podsLoadFailed')}
      </Text>
    );
  }
  if (pods.length === 0) {
    return (
      <Text
        testID={`profile-pods-${kind}-empty`}
        textAlign="center"
        fontSize={13}
        color="$muted"
        paddingVertical={32}
      >
        {kind === 'joined' ? t('mweb.profile.noJoinedPods') : t('mweb.profile.noHostedPods')}
      </Text>
    );
  }
  return (
    <YStack testID={`profile-pods-${kind}`} gap={14} paddingHorizontal={16} paddingBottom={24}>
      {pods.map((pod) => (
        <PodCard
          key={pod.id}
          pod={pod}
          width={cardWidth}
          onPress={() => openPod(pod.club_slug, pod.pod_id, pod.id)}
        />
      ))}
    </YStack>
  );
}
