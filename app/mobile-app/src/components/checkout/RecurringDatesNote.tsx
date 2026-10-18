import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** "3 dates" above the order summary when several dates of a recurring pod are
 * booked together — the ticket price there covers all of them. Nothing for one
 * date. mWeb shows the same as a chip inside its summary card. */
export function RecurringDatesNote({ dates }: Readonly<{ dates: number }>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  if (dates <= 1) return null;
  return (
    <XStack testID="order-summary-dates" alignItems="center" gap={8}>
      <MaterialIcons name="event-repeat" size={18} color={primary} />
      <Text fontSize={14} fontWeight="600" color="$color">
        {t('mweb.podSeriesBooking.datesCount', { count: dates })}
      </Text>
    </XStack>
  );
}
