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
          catalogue={catalogue}
          quantity={picks.picks[item.id] ?? 0}
          max={rentalMaxQuantity(item, seats)}
          readOnly={!catalogue.open}
          onQuantity={picks.setQuantity}
        />
      ))}
      {totals.count > 0 ? (
        <YStack gap={2} testID="pod-rent-total">
          <SummaryRow
            label={t('venueRentals.guest.rentSubtotal')}
            amount={rentalMoney(catalogue.currency_symbol, totals.rent)}
            testID="pod-rent-subtotal"
          />
          {totals.deposit > 0 ? (
            <SummaryRow
              label={t('venueRentals.guest.depositLine')}
              amount={rentalMoney(catalogue.currency_symbol, totals.deposit)}
              testID="pod-rent-deposit"
            />
          ) : null}
          <SummaryRow
            label={t('venueRentals.guest.total')}
            amount={rentalMoney(catalogue.currency_symbol, totals.total)}
            testID="pod-rent-grand-total"
            strong
          />
        </YStack>
      ) : null}
    </YStack>
  );
}

function SummaryRow({
  label,
  amount,
  testID,
  strong = false,
}: Readonly<{ label: string; amount: string; testID: string; strong?: boolean }>) {
  return (
    <XStack justifyContent="space-between" alignItems="center" gap={8} testID={testID}>
      <Text
        fontSize={strong ? 13.5 : 12}
        fontWeight={strong ? '700' : '400'}
        color={strong ? '$color' : '$muted'}
      >
        {label}
      </Text>
      <Text fontSize={strong ? 15 : 12} fontWeight={strong ? '700' : '600'} color="$color">
        {amount}
      </Text>
    </XStack>
  );
}
