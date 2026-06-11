import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { HomePod } from '@/hooks/useHomeFeed';
import { Reveal } from '@/animations/Reveal';
import { PodCard } from '@/components/home/PodCard';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  pods: HomePod[];
  onSeeAll: () => void;
  onOpenPod: (pod: HomePod) => void;
}

/** Bottom-of-home rail of pods whose date has already passed, with a "See all"
 * link to the dedicated Previous Pods screen (bug 8). Hidden when there are none. */
export function PreviousPodsRail({ pods, onSeeAll, onOpenPod }: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  if (pods.length === 0) return null;

  return (
    <YStack gap={10}>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={16}>
        <XStack alignItems="center" gap={8} flex={1}>
          <MaterialIcons name="history" size={20} color={muted} />
          <YStack>
            <Text fontSize={16} fontWeight="900" color="$color">
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
          onPress={onSeeAll}
          alignItems="center"
          gap={2}
          pressStyle={{ opacity: 0.8 }}
        >
          <Text fontSize={13} fontWeight="800" color="$primary">
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
        {pods.slice(0, 10).map((pod, index) => (
          <Reveal key={pod.id} index={index} scale>
            <PodCard pod={pod} width={300} onPress={() => onOpenPod(pod)} />
          </Reveal>
        ))}
      </ScrollView>
    </YStack>
  );
}
