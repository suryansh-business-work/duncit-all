import type { Control } from 'react-hook-form';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { BOOKING_OFFER_LIMITS, type BookingOffersValues } from '@duncit/forms/schemas';

interface Props {
  control: Control<BookingOffersValues>;
  /** Prefixes the test id. */
  idPrefix: string;
  disabled?: boolean;
}

/**
 * The venue's minimum spend per booking, beside its booking offers (Fees &
 * Minimum Spend): the least one booking's offer must come to — the rate times
 * the minimum guests, times the hours, or the flat price. 0 means none. Create
 * Pod and a host's counter cannot go below it, and the server refuses it too
 * (BELOW_MIN_SPEND). The Partners console and mWeb draw this; the native app has
 * its Tamagui twin.
 */
export default function MinSpendField({ control, idPrefix, disabled = false }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <RhfTextField
      control={control}
      name="min_spend"
      type="number"
      label={t('venueSettings.offers.minSpend')}
      hint={t('venueSettings.offers.minSpendHint')}
      disabled={disabled}
      data-testid={`${idPrefix}-min-spend`}
      slotProps={{ htmlInput: { min: 0, max: BOOKING_OFFER_LIMITS.amountMax, step: 'any', inputMode: 'decimal' } }}
    />
  );
}
