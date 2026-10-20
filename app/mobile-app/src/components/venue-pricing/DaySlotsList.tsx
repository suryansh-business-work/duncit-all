import { Text, XStack, YStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';

import { ToneChip } from '@/components/brand-orders/ToneChip';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { BookingDay } from '@/hooks/useVenueBookingCalendar';

/** A slot venue's windows on one date, each with the server's price and whether it is still free. */
export function DaySlotsList({ slots }: Readonly<{ slots: BookingDay['slots'] }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  return (
    <YStack gap={8} testID="pricing-day-slots">
      <Text role="heading" fontSize={15} fontWeight="600" color="$color">
        {t('availability.pricingModule.day.slotsTitle')}
      </Text>
      {slots.length === 0 ? (
        <Text testID="pricing-day-no-slots" fontSize={13} color="$muted">
          {t('availability.pricingModule.day.noSlots')}
        </Text>
      ) : null}
      {slots.map((slot) => (
        <XStack key={slot.start} alignItems="center" justifyContent="space-between" gap={8}>
          <Text flex={1} fontSize={13} color="$color">
            {`${fmt.formatTime(slot.start)} – ${fmt.formatTime(slot.end)} · ${formatMoney(slot.price)}`}
          </Text>
          <ToneChip
            label={
              slot.available
                ? t('availability.pricingModule.day.slotAvailable')
                : t('availability.pricingModule.day.slotTaken')
            }
            tone={slot.available ? 'done' : 'neutral'}
          />
        </XStack>
      ))}
    </YStack>
  );
}
