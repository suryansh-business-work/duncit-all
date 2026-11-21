import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { venueHostTermLines, type VenueHostTerms } from '@duncit/utils';

import { offerMoney } from '@/components/venue-offer/offer-format';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * A host's glance at what the venue asks of an offer — "Minimum spend ₹5,000
 * per booking · ₹450 per guest · Paid for at least 10 guests" — under the
 * venue's name on a list card. Nothing for anyone who is not a host (no
 * terms) or for a venue that sets no minimums. mWeb twin: VenueCardTerms.
 */
export function VenueCardTerms({ venueId, terms }: Readonly<{ venueId: string; terms?: VenueHostTerms }>) {
  const { t } = useTranslation();
  const { brand } = useThemeColors();
  const lines = venueHostTermLines(terms, t, offerMoney, { compact: true });
  if (lines.length === 0) return null;
  return (
    <XStack testID={`venue-card-terms-${venueId}`} alignItems="flex-start" gap={4} paddingTop={2}>
      <MaterialIcons name="payments" size={13} color={brand} style={{ marginTop: 2 }} aria-hidden />
      <Text flex={1} fontSize={12} fontWeight="600" color="$color" numberOfLines={2}>
        {lines.map((line) => line.text).join(' · ')}
      </Text>
    </XStack>
  );
}
