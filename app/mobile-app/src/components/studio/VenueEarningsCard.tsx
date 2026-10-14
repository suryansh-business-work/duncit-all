import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { EarningsSummaryTiles } from '@/components/earnings/EarningsSummaryTiles';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueEarnings } from '@/hooks/useVenueEarnings';
import type { RootStackParamList } from '@/navigation/types';

/**
 * The owner's earnings figures on the Venue Studio dashboard — lifetime, pending,
 * this month and pods completed — tapping through to Venue Earnings. mWeb twin:
 * VenueEarningsLinkCard (rule 27). Hidden until the summary has loaded.
 */
export function VenueEarningsCard() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { summary } = useVenueEarnings();
  if (!summary) return null;

  const title = t('mweb.studioOptions.venueEarnings');
  return (
    <SurfaceCard
      testID="venue-earnings-card"
      gap={12}
      role="button"
      tabIndex={0}
      aria-label={title}
      onPress={() => navigation.navigate('VenueEarnings')}
      pressStyle={PRESS_STYLE.surface}
    >
      <SectionHeader title={title} />
      <EarningsSummaryTiles summary={summary} />
    </SurfaceCard>
  );
}
