import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { formatFoodRating } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueFoodRating } from '@/hooks/useVenueFoodRating';

/**
 * The venue's food rating — "★ 4.3 (12)" — beside the menu's title and on a
 * dish's screen. Guests rate the order, not each dish, so it is the venue's
 * number in both places. Nothing shows until somebody has rated.
 * Tamagui twin of mWeb's food/FoodRatingBadge.
 */
export function FoodRatingBadge({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { warning } = useThemeColors();
  const rating = useVenueFoodRating(venueId);
  if (!rating) return null;
  const average = formatFoodRating(rating.average);
  const count = String(rating.count);

  return (
    <XStack
      testID="venue-food-rating"
      role="img"
      aria-label={t('mweb.venueFood.rating.label', { vars: { average, count } })}
      alignItems="center"
      gap={4}
    >
      <MaterialIcons name="star" size={18} color={warning} />
      <Text fontSize={14} fontWeight="600" color="$color">
        {t('mweb.venueFood.rating.summary', { vars: { average, count } })}
      </Text>
    </XStack>
  );
}
