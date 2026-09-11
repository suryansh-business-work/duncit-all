import { useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import type { ClubMoment } from '@/utils/club-detail';

const COLUMNS = 2;
const GAP = 8;
/** The club page's side padding, either side of the grid. */
const SIDE_PADDING = 16;

/** Random sample of the club's pods' media — a two-column grid of square
 * tiles. mWeb twin: club-details-page/ClubMomentsSection. */
export function ClubMomentsRail({ moments }: Readonly<{ moments: ClubMoment[] }>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  if (moments.length === 0) return null;
  const tile = Math.floor((width - SIDE_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  return (
    <YStack gap={10} testID="club-moments">
      <SectionHeader title={t('mweb.clubDetailsPage.moments')} />
      <XStack flexWrap="wrap" gap={GAP}>
        {moments.map((moment, i) => (
          <AppImage
            key={`${i}-${moment.url}`}
            source={{ uri: moment.url }}
            style={{ width: tile, height: tile, borderRadius: 18 }}
            resizeMode="cover"
          />
        ))}
      </XStack>
    </YStack>
  );
}
