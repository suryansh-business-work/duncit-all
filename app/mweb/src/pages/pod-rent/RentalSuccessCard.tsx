import { Box, Stack, Typography } from '@mui/material';
import { paymentRentalSummary, type PaymentRentalLine } from '@duncit/utils';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { RentalCollectNotice, RentalItemLines } from './RentalCheckoutBlock';

interface Props {
  /** The paid booking's rented items, as the server froze them (`Payment.rental_lines`). */
  lines?: readonly PaymentRentalLine[] | null;
  currency: string;
  /** Finance's rule: false means the venue keeps the deposit. */
  depositRefundable: boolean;
}

/** The confirmation's rented items: what was booked, and that it is collected — and its deposit settled — at the venue. */
export default function RentalSuccessCard({ lines, currency, depositRefundable }: Readonly<Props>) {
  const { t } = useTranslation();
  const items = paymentRentalSummary(lines);
  if (items.length === 0) return null;
  return (
    <Box sx={{ ...SURFACE_SX, p: 2, textAlign: 'left' }} data-testid="checkout-success-rentals">
      <Stack spacing={1.25}>
        <Typography variant="subtitle2" component="h2">
          {t('venueRentals.guest.bookedTitle')}
        </Typography>
        <RentalItemLines lines={items} currency={currency} depositRefundable={depositRefundable} testId="checkout-success-rental" />
        <RentalCollectNotice depositRefundable={depositRefundable} />
      </Stack>
    </Box>
  );
}
