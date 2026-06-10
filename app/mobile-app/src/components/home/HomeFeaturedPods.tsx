import { ScrollView } from 'tamagui';

import type { HomePod } from '@/hooks/useHomeFeed';
import { PodCard } from '@/components/home/PodCard';

interface HomeFeaturedPodsProps {
  pods: HomePod[];
  onOpenPod: (pod: HomePod) => void;
}

/** Horizontal strip of the soonest pods — RN port of mWeb's HomeFeaturedPods. */
export function HomeFeaturedPods({ pods, onOpenPod }: Readonly<HomeFeaturedPodsProps>) {
  if (pods.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
    >
      {pods.map((pod) => (
        <PodCard key={pod.id} pod={pod} width={300} onPress={() => onOpenPod(pod)} />
      ))}
    </ScrollView>
  );
}
