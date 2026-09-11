import { YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { useTranslation } from '@/hooks/useTranslation';

interface HappeningNearbyHeaderProps {
  /** The live pod count. No longer printed under the title (the rail and its
   * See-all card show it); kept so callers need no change. */
  totalPods: number;
  /** Opens the dedicated Happening Nearby page (the See all tap). */
  onPress?: () => void;
}

/** "Happening nearby" section title with its accent "See all". mWeb twin:
 * HomeNearbyHeader. */
export function HappeningNearbyHeader({ onPress }: Readonly<HappeningNearbyHeaderProps>) {
  const { t } = useTranslation();
  return (
    <YStack paddingHorizontal={16}>
      <SectionHeader
        testID="happening-nearby-header"
        title={t('mweb.home.happeningNearbyTitle')}
        actionLabel={t('mweb.home.seeAll')}
        onAction={onPress}
        actionTestID="happening-nearby-see-all"
        actionAriaLabel={t('mweb.home.seeAllLivePods')}
      />
    </YStack>
  );
}
