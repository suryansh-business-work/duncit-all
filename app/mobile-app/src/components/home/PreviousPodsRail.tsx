import { ScrollView, YStack } from 'tamagui';

import type { HomePod } from '@/hooks/useHomeFeed';
import { Reveal } from '@/animations/Reveal';
import { POD_CARD_RAIL_WIDTH, PodCard } from '@/components/home/PodCard';
import { SeeAllCard } from '@/components/home/SeeAllCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
  if (pods.length === 0) return null;

  return (
    <YStack gap={12}>
      <YStack paddingHorizontal={16}>
        <SectionHeader
          title={t('mweb.home.previousPodsTitle')}
          actionLabel={t('mweb.home.seeAll')}
          onAction={() => onSeeAll()}
          actionTestID="previous-pods-see-all"
          actionAriaLabel={t('mweb.home.seeAllPreviousPods')}
        />
      </YStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
      >
        {pods.slice(0, RAIL_CAP).map((pod, index) => (
          <Reveal key={pod.id} index={index} scale>
            <PodCard pod={pod} width={POD_CARD_RAIL_WIDTH} onPress={() => onOpenPod(pod)} />
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
