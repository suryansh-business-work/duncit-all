import { ScrollView, Text, YStack } from 'tamagui';

import type { ClubPod } from '@/hooks/useDetails';
import { PodCard } from '@/components/home/PodCard';
import { clubPodPhase, type ClubPodPhase } from '@/utils/club-detail';

const RAILS: readonly (readonly [ClubPodPhase, string])[] = [
  ['SOON', 'Happening soon'],
  ['UPCOMING', 'Upcoming'],
  ['PREVIOUS', 'Previous'],
];

interface Props {
  pods: ClubPod[];
  onOpenPod: (pod: ClubPod) => void;
}

/** Pods Schedule segment — Happening Soon / Upcoming / Previous, each a
 * side-by-side swipe rail. */
export function ClubPodsSchedule({ pods, onOpenPod }: Readonly<Props>) {
  if (pods.length === 0) {
    return (
      <Text testID="club-no-pods" fontSize={13} color="$muted">
        No pods scheduled for this club yet.
      </Text>
    );
  }
  return (
    <YStack gap={16} testID="club-pods-schedule">
      {RAILS.map(([phase, title]) => {
        const rail = pods.filter(
          (pod) => clubPodPhase(pod.pod_date_time, pod.pod_end_date_time) === phase,
        );
        if (rail.length === 0) return null;
        return (
          <YStack key={phase} gap={8}>
            <Text fontSize={15} fontWeight="900" color="$color">
              {title}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {rail.map((pod) => (
                <PodCard key={pod.id} pod={pod} width={220} onPress={() => onOpenPod(pod)} />
              ))}
            </ScrollView>
          </YStack>
        );
      })}
    </YStack>
  );
}
