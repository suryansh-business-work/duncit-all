import { Text, XStack, YStack } from 'tamagui';
import {
  rentalClosedKey,
  rentalMaxQuantity,
  rentalMoney,
  rentalSelectionTotals,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import type { PodRentals } from '@/hooks/usePodRentals';
import type { PodRentalPicks } from '@/stores/rental-picks.store';

import { RentalItemRow } from './RentalItemRow';

interface Props {
  rentals: PodRentals;
  picks: PodRentalPicks;
  seats: number;
  /** Show only the first few: the Pod Details card. The sheet shows them all. */
  limit?: number;
}

/** What a guest can rent for this pod, with their picks and the running rental total. RN twin of mWeb's PodRentList. */
export function PodRentList({ rentals, picks, seats, limit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { catalogue, failed, refetch } = rentals;
  if (failed && !catalogue) {
    return (
      <YStack gap={8} testID="pod-rent-error">
        <Text fontSize={13.5} color="$muted">
          {t('venueRentals.guest.loadError')}
        </Text>
        <DuncitButton
          label={t('venueRentals.guest.retry')}
          variant="outline"
          size="sm"
          onPress={() => {
            refetch().catch(() => undefined);
          }}
        />
      </YStack>
    );
  }
  if (!catalogue || catalogue.items.length === 0) {
    return (
      <Text fontSize={13.5} color="$muted" testID="pod-rent-empty">
        {t('venueRentals.guest.none')}
      </Text>
    );
  }
  const closedKey = rentalClosedKey(catalogue);
  const shown = limit ? catalogue.items.slice(0, limit) : catalogue.items;
  const totals = rentalSelectionTotals(catalogue.items, picks.picks, catalogue.hours);
  return (
    <YStack gap={8} testID="pod-rent-list">
      {closedKey ? (
        <Text fontSize={12.5} color="$muted" testID="pod-rent-closed">
          {t(closedKey, { vars: { hours: rentals.settings?.booking_cutoff_hours ?? 0 } })}
        </Text>
      ) : null}
      {shown.map((item) => (
        <RentalItemRow
          key={item.id}
          item={item}
          currency={catalogue.currency_symbol}
          quantity={picks.picks[item.id] ?? 0}
          max={rentalMaxQuantity(item, seats)}
          readOnly={!catalogue.open}
          onQuantity={picks.setQuantity}
        />
      ))}
      {totals.count > 0 ? (
        <XStack justifyContent="space-between" alignItems="center" testID="pod-rent-total">
          <Text fontSize={12} color="$muted">
            {t('venueRentals.guest.rentLine')}
            {totals.deposit > 0 ? ` + ${t('venueRentals.guest.depositLine')}` : ''}
          </Text>
          <Text fontSize={15} fontWeight="700" color="$color">
            {rentalMoney(catalogue.currency_symbol, totals.total)}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}
