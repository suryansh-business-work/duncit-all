import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { venueMinBusinessLines, type VenueMinBusinessRow } from '@duncit/utils';

import { offerMoney } from '@/components/venue-offer/offer-format';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * The picked venue's minimum business — "₹200 per guest", "₹5,000 per
 * booking" — at the top of the offer step: an offer below the amount on the
 * basis the host pays on cannot be sent. Nothing when the venue names none.
 * mWeb twin: VenueMinBusinessNote.
 */
export function VenueMinBusinessNote({
  rows,
}: Readonly<{ rows: readonly VenueMinBusinessRow[] | null | undefined }>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const lines = venueMinBusinessLines(rows, t, offerMoney);
  if (lines.length === 0) return null;

  return (
    <XStack
      testID="create-pod-venue-min-business"
      role="note"
      gap={8}
      alignItems="flex-start"
      backgroundColor="$soft"
      borderRadius={14}
      padding={12}
    >
      <MaterialIcons name="info-outline" size={16} color={color} aria-hidden />
      <YStack flex={1} gap={4}>
        <Text fontSize={13} fontWeight="700" color="$color">
          {t('availability.offers.minBusiness.createPodTitle')}
        </Text>
        {lines.map((line) => (
          <Text key={line} fontSize={13} color="$color">
            {line}
          </Text>
        ))}
        <Text fontSize={12} color="$muted">
          {t('availability.offers.minBusiness.createPodHint')}
        </Text>
      </YStack>
    </XStack>
  );
}
