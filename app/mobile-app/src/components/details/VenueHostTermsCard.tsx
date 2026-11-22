import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';
import { venueHostTermLines } from '@duncit/utils';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { offerMoney } from '@/components/venue-offer/offer-format';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueHostTerms } from '@/hooks/useVenueHostTerms';
import type { RootStackParamList } from '@/navigation/types';

/**
 * For a host only: the venue's Fees & Minimum Spend — the minimums an offer
 * must meet, then the fees added to its price — and "Pick This Venue for Pod",
 * which opens Create Pod with this venue and a physical pod chosen. The server
 * answers the terms only for an active host, so anyone else sees nothing here.
 * mWeb twin: VenueDetailsPage/VenueHostTermsCard.
 */
export function VenueHostTermsCard({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { brand } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { byId, error, refetch } = useVenueHostTerms([venueId]);
  const terms = byId.get(venueId);

  if (error) {
    return (
      <SurfaceCard gap={8} testID="venue-host-terms-error">
        <SectionHeader
          title={t('mweb.studioOptions.venueFees')}
          actionLabel={t('publicPage.hostPage.retry')}
          onAction={refetch}
          actionTestID="venue-host-terms-retry"
        />
        <Text role="alert" fontSize={13} color="$danger">
          {t('availability.hostTerms.loadFailed')}
        </Text>
      </SurfaceCard>
    );
  }
  if (!terms) return null;

  const lines = venueHostTermLines(terms, t, offerMoney);
  return (
    <SurfaceCard gap={12} testID="venue-host-terms">
      <YStack gap={4}>
        <SectionHeader title={t('mweb.studioOptions.venueFees')} />
        <Text fontSize={12.5} color="$muted">
          {t('availability.hostTerms.hint')}
        </Text>
      </YStack>
      {lines.length > 0 ? (
        <YStack gap={8} role="list">
          {lines.map((line) => (
            <XStack
              key={line.id}
              role="listitem"
              gap={8}
              alignItems="flex-start"
              testID={`venue-host-terms-${line.id}`}
            >
              <MaterialIcons name="check-circle-outline" size={18} color={brand} aria-hidden />
              <Text flex={1} fontSize={14} color="$color">
                {line.text}
              </Text>
            </XStack>
          ))}
        </YStack>
      ) : (
        <Text testID="venue-host-terms-none" fontSize={14} color="$muted">
          {t('availability.hostTerms.none')}
        </Text>
      )}
      <PrimaryButton
        testID="venue-pick-for-pod"
        label={t('availability.hostTerms.pickForPod')}
        accessibilityHint={t('availability.hostTerms.pickForPodHint')}
        onPress={() => navigation.navigate('CreatePod', { pickVenueId: venueId })}
      />
      <Text fontSize={12} color="$muted" textAlign="center">
        {t('availability.hostTerms.pickForPodHint')}
      </Text>
    </SurfaceCard>
  );
}
