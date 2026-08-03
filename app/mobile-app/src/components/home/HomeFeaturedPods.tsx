import { ScrollView } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import type { HomePod } from '@/hooks/useHomeFeed';
import { PodCard } from '@/components/home/PodCard';
import { SeeAllCard } from '@/components/home/SeeAllCard';

interface HomeFeaturedPodsProps {
  pods: HomePod[];
  /** Full "happening nearby" count — a trailing See-all card appears when the
   * rail is capped below it. */
  totalCount: number;
  /** True while a vibe chip / sheet filter narrows the rail: the full screen
   * is unfiltered, so the card drops its count and its jump-to-index. */
  filtered: boolean;
  onOpenPod: (pod: HomePod) => void;
  /** Opens the full list, landing on `startIndex` (the first unseen pod). */
  onSeeAll: (startIndex?: number) => void;
}

/** Horizontal strip of the soonest pods — RN port of mWeb's HomeFeaturedPods. */
export function HomeFeaturedPods({
  pods,
  totalCount,
  filtered,
  onOpenPod,
  onSeeAll,
}: Readonly<HomeFeaturedPodsProps>) {
  if (pods.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
    >
      {pods.map((pod, index) => (
        <Reveal key={pod.id} index={index} scale>
          <PodCard pod={pod} width={300} showPlace={false} onPress={() => onOpenPod(pod)} />
        </Reveal>
      ))}
      {totalCount > pods.length ? (
        <SeeAllCard
          testID="happening-nearby-see-all-card"
          count={filtered ? undefined : totalCount - pods.length}
          onPress={() => onSeeAll(filtered ? undefined : pods.length)}
        />
      ) : null}
    </ScrollView>
  );
}
