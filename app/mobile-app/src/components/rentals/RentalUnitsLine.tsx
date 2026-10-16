import { Text } from 'tamagui';
import { rentalMoney, rentalUnitKey } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

export interface RentalUnitsRow {
  quantity: number;
  units: number;
  unit: unknown;
  rent_amount: number;
  deposit_amount: number;
  currency_symbol: string;
}

/** A rental booking's "2 × 3 hours · ₹600 · ₹500 deposit" line — the member's list and the venue desk read it alike. */
export function RentalUnitsLine({ row }: Readonly<{ row: RentalUnitsRow }>) {
  const { t } = useTranslation();
  const money = (amount: number) => rentalMoney(row.currency_symbol, amount);
  return (
    <Text fontSize={12.5} color="$muted">
      {t('venueRentals.guest.units', {
        vars: { quantity: row.quantity, units: row.units, unit: t(rentalUnitKey(row.unit)) },
      })}
      {` · ${money(row.rent_amount)}`}
      {row.deposit_amount > 0
        ? ` · ${t('venueRentals.guest.deposit', { vars: { amount: money(row.deposit_amount) } })}`
        : ''}
    </Text>
  );
}
