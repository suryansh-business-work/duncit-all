import { useQuery } from '@apollo/client/react';
import { Alert, Card, Chip, CircularProgress, Stack } from '@mui/material';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SectionHeader from '../../components/SectionHeader';
import StudioPageHeader from '../../components/StudioPageHeader';
import StatCards from './StatCards';
import PayoutList, { type VenuePayout } from './PayoutList';
import { VENUE_EARNINGS } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/** Venue Earnings — myVenueEarningsSummary stat cards + payout history across
 * every venue the signed-in owner has (Pod Finance Breakdown epic). */
export default function VenueEarningsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(VENUE_EARNINGS, { fetchPolicy: 'cache-and-network' });

  if (loading && !data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 8
        }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const summary = data?.myVenueEarningsSummary;
  const payouts: VenuePayout[] = data?.myVenuePayouts ?? [];
  const symbol = summary?.currency_symbol ?? '₹';

  let history;
  if (payouts.length === 0) {
    history = <Alert severity="info" sx={{ m: 2 }}>{t('mweb.venueEarnings.payoutsAppearHereAfterAPod')}</Alert>;
  } else {
    history = <PayoutList payouts={payouts} symbol={symbol} />;
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <StudioPageHeader icon={<PaidRoundedIcon fontSize="small" />} title={t('mweb.venueEarnings.earnings')} />

      {summary && <StatCards summary={summary} />}

      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <SectionHeader title="Payout history" />
          </Stack>
          <Chip size="small" label={payouts.length} sx={{ height: 24, minHeight: 24 }} />
        </Stack>
        <Card>{history}</Card>
      </Stack>
    </Stack>
  );
}
