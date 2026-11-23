import { Box } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { FinanceRentalBookings, type RentalDetailLinks } from '@duncit/venue-rentals';
import { urlConfigs } from '../../../config/url-configs';

/** A rental's pod opens on mWeb; its guest's profile is the Admin console's user page. */
const RENTAL_LINKS: RentalDetailLinks = {
  mwebUrl: urlConfigs.mwebUrl,
  profileUrl: (userId) => `${urlConfigs.adminUrl}/users/${encodeURIComponent(userId)}`,
};

/**
 * Finance > Rented Items > Rentals: every rented item across the platform.
 * Refunds are sent through Razorpay by Duncit; a row opens the rental's detail,
 * where Finance sends one that waits for review. The venue's share leaves as a
 * VENUE_RENTAL payout in Payment Release.
 */
export default function RentedItemsPage() {
  const { t } = useTranslation();
  return (
    <Box>
      <PageHeader title={t('finance.rentedItems.bookingsTitle')} subtitle={t('finance.rentedItems.bookingsSubtitle')} sx={{ mb: 3 }} />
      <FinanceRentalBookings links={RENTAL_LINKS} />
    </Box>
  );
}
