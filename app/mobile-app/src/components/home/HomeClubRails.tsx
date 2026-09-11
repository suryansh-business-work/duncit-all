import { YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { ClubSection } from '@/components/home/ClubSection';
import { HomeEmptyText } from '@/components/home/HomeEmptyText';
import type { ClubWithPods, HomeClub, HomePod } from '@/hooks/useHomeFeed';
import { TourAnchor } from '@/tours/TourAnchor';

interface Props {
  clubsWithPods: ClubWithPods[];
  /** Nothing to show at all — the empty state takes the rails' place. */
  isEmpty: boolean;
  onOpenPod: (pod: HomePod) => void;
  onOpenClub: (club: HomeClub) => void;
  categoryLabelOf?: (pod: HomePod) => string | null;
  savedOf?: (podDocId: string) => boolean;
  savingOf?: (podDocId: string) => boolean;
  onToggleSave?: (podDocId: string) => void;
}

/** Home's per-club rails, 24px apart, or the empty state when the feed has
 * nothing. Extracted from HomeFeed for the 200-line cap. mWeb twin: the club
 * list in HomePage. */
export function HomeClubRails({ clubsWithPods, isEmpty, ...rail }: Readonly<Props>) {
  if (isEmpty) return <HomeEmptyText />;
  return (
    // One anchor around the whole club list: the Clubs step describes what
    // clubs are, so it highlights the region rather than picking a row.
    <TourAnchor tour="home" anchor="home-clubs">
      <YStack gap={24}>
        {clubsWithPods.map(({ club, pods }, sectionIndex) => (
          <Reveal key={club.id} index={4 + sectionIndex}>
            <ClubSection club={club} pods={pods} {...rail} />
          </Reveal>
        ))}
      </YStack>
    </TourAnchor>
  );
}
