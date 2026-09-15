import { YStack } from 'tamagui';

import type { ClubWithPods, HomeClub, HomePod } from '@/hooks/useHomeFeed';

import { Reveal } from '@/animations/Reveal';
import { POD_CARD_RAIL_WIDTH, PodCard } from '@/components/home/PodCard';
import { ScrollRail } from '@/components/ScrollRail';
import { SectionHeader } from '@/components/SectionHeader';
import { useTranslation } from '@/hooks/useTranslation';

interface ClubSectionProps extends ClubWithPods {
  onOpenPod: (pod: HomePod) => void;
  /** The category pill over each card's image (mock: "Sports"). */
  categoryLabelOf?: (pod: HomePod) => string | null;
  /** Save state + toggle; omit to hide the save buttons (signed-out). */
  savedOf?: (podDocId: string) => boolean;
  /** True while THAT pod's toggle is in flight — its icon becomes a spinner. */
  savingOf?: (podDocId: string) => boolean;
  onToggleSave?: (podDocId: string) => void;
  onOpenClub: (club: HomeClub) => void;
}

/** One club's rail: the club's name with "See all" (opens the club) above its
 * pods — RN port of mWeb's ClubSection. */
export function ClubSection({
  club,
  pods,
  onOpenPod,
  onOpenClub,
  categoryLabelOf,
  savedOf,
  savingOf,
  onToggleSave,
}: Readonly<ClubSectionProps>) {
  const { t } = useTranslation();
  const sectionTestID = `club-section-${club.club_id}`;

  return (
    <YStack testID={sectionTestID} gap={12}>
      <YStack paddingHorizontal={16}>
        <SectionHeader
          testID={`${sectionTestID}-header`}
          title={club.club_name}
          actionLabel={t('mweb.home.seeAll')}
          onAction={() => onOpenClub(club)}
          actionTestID={sectionTestID}
          actionAriaLabel={club.club_name}
        />
      </YStack>
      <ScrollRail testID={`${sectionTestID}-pods`} gap={12} paddingHorizontal={16}>
        {pods.map((pod, index) => (
          <Reveal key={pod.id} index={index} scale>
            <PodCard
              pod={pod}
              width={POD_CARD_RAIL_WIDTH}
              showPlace={false}
              onPress={() => onOpenPod(pod)}
              categoryLabel={categoryLabelOf?.(pod)}
              saved={savedOf?.(pod.id) ?? false}
              saving={savingOf?.(pod.id) ?? false}
              onToggleSave={onToggleSave ? () => onToggleSave(pod.id) : undefined}
            />
          </Reveal>
        ))}
      </ScrollRail>
    </YStack>
  );
}
