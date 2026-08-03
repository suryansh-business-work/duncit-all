import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { HomePod } from '@/hooks/useHomeFeed';
import { Reveal } from '@/animations/Reveal';
import { PodCard } from '@/components/home/PodCard';
import { SeeAllCard } from '@/components/home/SeeAllCard';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Max entries shown on the home rail before the See-all card takes over. */
const RAIL_CAP = 10;

interface Props {
  pods: HomePod[];
  /** True while a vibe chip / sheet filter narrows the rail: the full screen
   * is unfiltered, so the card drops its count and its jump-to-index. */
  filtered: boolean;
  /** Opens the full list; a numeric startIndex lands on the first unseen pod. */
  onSeeAll: (startIndex?: number) => void;
  onOpenPod: (pod: HomePod) => void;
}

/** Bottom-of-home rail of pods whose date has already passed, with a "See all"
 * link to the dedicated Previous Pods screen (bug 8). Hidden when there are none. */
export function PreviousPodsRail({ pods, filtered, onSeeAll, onOpenPod }: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  if (pods.length === 0) return null;

  return (
    <YStack gap={10}>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={16}>
        <XStack alignItems="center" gap={8} flex={1}>
          <MaterialIcons name="history" size={20} color={muted} />
          <YStack>
            <Text fontSize={16} fontWeight="700" color="$color">
              Previous Pods
            </Text>
            <Text fontSize={12} fontWeight="700" color="$muted">
              Already taken place
            </Text>
          </YStack>
        </XStack>
        <XStack
          testID="previous-pods-see-all"
          role="button"
          aria-label="See all previous pods"
          onPress={() => onSeeAll()}
          alignItems="center"
          gap={2}
          pressStyle={{ opacity: 0.8 }}
        >
          <Text fontSize={13} fontWeight="600" color="$primary">
            See all
          </Text>
          <MaterialIcons name="chevron-right" size={16} color={primary} />
        </XStack>
      </XStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
      >
        {pods.slice(0, RAIL_CAP).map((pod, index) => (
          <Reveal key={pod.id} index={index} scale>
            <PodCard pod={pod} width={300} onPress={() => onOpenPod(pod)} />
          </Reveal>
        ))}
        {pods.length > RAIL_CAP ? (
          <SeeAllCard
            testID="previous-pods-see-all-card"
            count={filtered ? undefined : pods.length - RAIL_CAP}
            onPress={() => onSeeAll(filtered ? undefined : RAIL_CAP)}
          />
        ) : null}
      </ScrollView>
    </YStack>
  );
}
