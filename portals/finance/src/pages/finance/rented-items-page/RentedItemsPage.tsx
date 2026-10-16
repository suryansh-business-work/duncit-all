import { Box } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { FinanceRentalBookings } from '@duncit/venue-rentals';

/**
 * Finance > Rented Items > Rentals: every rented item across the platform.
 * Finance records the refunds it pays back here; the venue's share leaves as a
 * VENUE_RENTAL payout in Payment Release.
 */
export default function RentedItemsPage() {
  const { t } = useTranslation();
  return (
    <Box>
      <PageHeader title={t('finance.rentedItems.bookingsTitle')} subtitle={t('finance.rentedItems.bookingsSubtitle')} sx={{ mb: 3 }} />
      <FinanceRentalBookings />
    </Box>
  );
}
