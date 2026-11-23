import { useCallback, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { VenueKitInterestForm, useVenueKitOtp } from './interest-form';
import VenueKitInterestsTable, { INTEREST_STATUSES } from './VenueKitInterestsTable';
import VenueKitPlanCard from './VenueKitPlanCard';
import { VENUE_KIT_SUMMARY } from './queries';

/**
 * Venues console → Venue Kit. The kit is coming soon on its annual plan only;
 * this is the plan as the website shows it, the same interest form venues fill
 * on duncit.com/venue-kit (for a venue that calls in), and the list of every
 * venue that registered, with where the team has taken each one.
 */
export default function VenueKitPage() {
  const { t } = useTranslation();
  const refetchTable = useRef<(() => void) | null>(null);
  const summary = useQuery(VENUE_KIT_SUMMARY, { fetchPolicy: 'cache-and-network' });
  const { refetch } = summary;
  const counts = summary.data?.venueKitInterestSummary;

  const refreshList = useCallback(() => {
    refetchTable.current?.();
    refetch().catch((err: unknown) => {
      logs.portal.venues.error('venueKit', 'summary', { msg: 'Venue Kit summary refetch failed', reason: parseApiError(err) });
    });
  }, [refetch]);

  const otp = useVenueKitOtp(refreshList);
  const countOf = (status: string) => counts?.by_status.find((row) => row.status === status)?.count ?? 0;

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" component="h1">
          {t('venueKit.console.title')}
        </Typography>
        <Typography color="text.secondary">{t('venueKit.console.subtitle')}</Typography>
      </div>

      <VenueKitPlanCard />

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" component="h2">
            {t('venueKit.console.registerHeading')}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('venueKit.console.registerIntro')}
          </Typography>
          <VenueKitInterestForm state={otp.state} actions={otp.actions} />
        </CardContent>
      </Card>

      <Stack spacing={1.5}>
        <Typography variant="h6" component="h2">
          {t('venueKit.console.interestsHeading')}
        </Typography>
        <Grid container spacing={1} component="ul" aria-live="polite" sx={{ listStyle: 'none', p: 0, m: 0 }}>
          <Grid component="li">
            <Chip color="primary" label={`${t('venueKit.console.total')}: ${counts?.total ?? 0}`} />
          </Grid>
          <Grid component="li">
            <Chip color="success" variant="outlined" label={`${t('venueKit.console.phoneVerified')}: ${counts?.phone_verified ?? 0}`} />
          </Grid>
          {INTEREST_STATUSES.map((status) => (
            <Grid key={status} component="li">
              <Chip variant="outlined" label={`${t(`venueKit.console.statuses.${status}`)}: ${countOf(status)}`} />
            </Grid>
          ))}
        </Grid>
        <VenueKitInterestsTable refetchRef={refetchTable} onChanged={refreshList} />
      </Stack>
    </Stack>
  );
}
