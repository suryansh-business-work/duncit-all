import type { Control } from 'react-hook-form';
import { Box } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfSwitch } from '@duncit/forms';
import type { BookingOffersValues } from '@duncit/forms/schemas';

interface Props {
  control: Control<BookingOffersValues>;
  /** Prefixes the test id. */
  idPrefix: string;
  disabled?: boolean;
}

/**
 * Whether the venue is open to free bookings for initiatives (Fees & Minimum
 * Spend): only then does Create Pod offer hosts the Free option, which books
 * the venue at ₹0 — no charges, no Duncit commission, no earnings — and makes
 * the pod free. The venue still accepts or declines each request; the server
 * refuses a free ask to a venue with it off (FREE_BOOKING_OFF). The Partners
 * console and mWeb draw this; the native app has its Tamagui twin.
 */
export default function FreeBookingField({ control, idPrefix, disabled = false }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box data-testid={`${idPrefix}-free-booking`}>
      <RhfSwitch
        control={control}
        name="free_booking"
        label={t('venueSettings.offers.freeBooking')}
        hint={t('venueSettings.offers.freeBookingHint')}
        disabled={disabled}
      />
    </Box>
  );
}
