import { Text, XStack, YStack } from 'tamagui';
import { rentalActorKey, rentalEventKey, rentalMoney } from '@duncit/utils';

import type { RentalDetail } from '@/hooks/useRentalBookingDetail';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

import { DetailSection, keyedRows } from './DetailSection';

/** Every step of the rental's life, as the server recorded it. */
export function RentalDetailTimeline({ detail }: Readonly<{ detail: RentalDetail }>) {
  const { t } = useTranslation();
  const money = (amount: number) => rentalMoney(detail.booking.currency_symbol, amount);
  const events = keyedRows(detail.events, (event) => `${event.type}-${event.at}`);
  return (
    <DetailSection title={t('venueRentals.detail.timeline')} testID="rental-detail-timeline">
      {events.length === 0 ? (
        <Text fontSize={12.5} color="$muted" testID="rental-detail-no-events">
          {t('venueRentals.detail.noEvents')}
        </Text>
      ) : (
        <YStack gap={10} role="list" aria-label={t('venueRentals.detail.timeline')}>
          {events.map(({ row: event, key }) => (
            <YStack key={key} role="listitem" gap={2} testID={`rental-detail-event-${key}`}>
              <XStack justifyContent="space-between" gap={8}>
                <Text flex={1} fontSize={13} fontWeight="600" color="$color">
                  {t(rentalEventKey(event.type))}
                </Text>
                {typeof event.amount === 'number' ? (
                  <Text fontSize={13} fontWeight="600" color="$color">
                    {money(event.amount)}
                  </Text>
                ) : null}
              </XStack>
              {event.detail ? (
                <Text fontSize={12.5} color="$color">
                  {event.detail}
                </Text>
              ) : null}
              <Text fontSize={12} color="$muted">
                {t('venueRentals.detail.eventBy', {
                  vars: {
                    actor: event.actor_name || t(rentalActorKey(event.actor_role)),
                    at: formatDateTime(event.at),
                  },
                })}
              </Text>
            </YStack>
          ))}
        </YStack>
      )}
    </DetailSection>
  );
}
