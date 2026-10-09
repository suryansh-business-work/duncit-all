import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import VenueEarningsStats from './VenueEarningsStats';
import VenuePayoutsTable from './VenuePayoutsTable';
import { VENUE_EARNINGS, type VenueEarningsData } from './queries';

/**
 * Venue Earnings — what the owner's slots earned and the payouts released for
 * them. The Partner console's twin of mWeb's Venue Earnings page: the same
 * `myVenueEarningsSummary` + `myVenuePayouts`, summed by the server across
 * every venue the owner has.
 */
export default function VenueEarningsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<VenueEarningsData>(VENUE_EARNINGS, { fetchPolicy: 'cache-and-network' });
  const summary = data?.myVenueEarningsSummary ?? null;

  let body;
  if (loading && !data) {
    body = (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress size={28} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  } else if (error) {
    body = (
      <Alert severity="error" data-testid="venue-earnings-error">
        {error.message}
      </Alert>
    );
  } else {
    body = (
      <>
        {summary && <VenueEarningsStats summary={summary} />}
        <VenuePayoutsTable payouts={data?.myVenuePayouts ?? []} symbol={summary?.currency_symbol} />
      </>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="venue-earnings-page">
      <StudioPageHeader
        title={t('mweb.studioOptions.venueEarnings')}
        hint={t('mweb.studioOptions.venueEarningsHint')}
      />
      {body}
    </Stack>
  );
}
