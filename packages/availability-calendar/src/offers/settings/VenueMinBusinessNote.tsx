import { Alert, AlertTitle, Box } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { venueMinimumLines, type VenueMinBusinessRow } from '@duncit/utils';

interface Props {
  /** The picked venue's amounts (`Venue.offer_min_business`). */
  rows: readonly VenueMinBusinessRow[] | null | undefined;
  /** The picked venue's minimum spend per booking (`Venue.offer_min_spend`, 0 = none). */
  minSpend?: number | null;
  /** The surface's money format. */
  money: (rupees: number) => string;
  testId: string;
}

/**
 * The picked venue's minimums — "₹200 per guest · Minimum spend ₹5,000 per booking" —
 * at the top of Create Pod's offer step: an offer below the amount on the basis
 * the host pays on, or short of the minimum spend, cannot be sent. Nothing when
 * the venue named none.
 */
export default function VenueMinBusinessNote({ rows, minSpend, money, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const lines = venueMinimumLines(rows, minSpend, t, money);
  if (lines.length === 0) return null;
  return (
    <Alert severity="info" data-testid={testId}>
      <AlertTitle>{t('availability.offers.minBusiness.createPodTitle')}</AlertTitle>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </Box>
      {t('availability.offers.minBusiness.createPodHint')}
    </Alert>
  );
}
