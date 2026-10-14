import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { HealthMeter } from '@/components/health';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useVenueHealth } from '@/hooks/useHealth';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * The selected venue's Account Health meter on the Venue Studio dashboard,
 * tapping through to its breakdown. mWeb twin: VenueHealthCard (rule 27).
 * Hidden until a score has loaded.
 */
export function VenueHealthTile({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { health } = useVenueHealth(venueId);
  if (!health) return null;

  const label = t('mweb.venueManage.venueHealth');
  return (
    <SurfaceCard
      testID="venue-health-tile"
      alignItems="center"
      role="button"
      tabIndex={0}
      aria-label={label}
      onPress={() => navigation.navigate('VenueHealth', { venueId })}
      pressStyle={PRESS_STYLE.surface}
    >
      <HealthMeter
        score={health.total_score}
        band={health.band}
        size={140}
        label={label}
        caption={t('mweb.common.tapForDetails')}
      />
    </SurfaceCard>
  );
}
