import { Alert, AlertTitle, Box } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { venueMinBusinessLines, type VenueMinBusinessRow } from '@duncit/utils';

interface Props {
  /** The picked venue's amounts (`Venue.offer_min_business`). */
  rows: readonly VenueMinBusinessRow[] | null | undefined;
  /** The surface's money format. */
  money: (rupees: number) => string;
  testId: string;
}

/**
 * What the picked venue usually expects from one booking — "₹200 per guest ·
 * ₹400 per hour" — shown on Create Pod once a venue is chosen, as a guide for
 * the host's offer (never a rule). Nothing when the venue named none.
 */
export default function VenueMinBusinessNote({ rows, money, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const lines = venueMinBusinessLines(rows, t, money);
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
