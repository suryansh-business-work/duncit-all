import { ScrollView, YStack } from 'tamagui';

import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import type { ClubPod } from '@/hooks/useDetails';
import { useTranslation } from '@/hooks/useTranslation';
import { clubPodPhase, type ClubPodPhase } from '@/utils/club-detail';
import { ClubPodRailCard } from './ClubPodRailCard';

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
 * side-by-side swipe rail. mWeb twin: ClubPodsScheduleSection. */
export function ClubPodsSchedule({ pods, onOpenPod }: Readonly<Props>) {
  const { t } = useTranslation();
  if (pods.length === 0) {
    return (
      <EmptyState
        testID="club-no-pods"
        icon="event-busy"
        title={t('mweb.clubDetails.noPodsScheduledForThisClub')}
      />
    );
  }
  return (
    <YStack gap={20} testID="club-pods-schedule">
      {RAILS.map(([phase, title]) => {
        const rail = pods.filter(
          (pod) => clubPodPhase(pod.pod_date_time, pod.pod_end_date_time) === phase,
        );
        if (rail.length === 0) return null;
        return (
          <YStack key={phase} gap={10}>
            <SectionHeader title={title} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {rail.map((pod) => (
                <ClubPodRailCard key={pod.id} pod={pod} onPress={() => onOpenPod(pod)} />
              ))}
            </ScrollView>
          </YStack>
        );
      })}
    </YStack>
  );
}
