import { Box, Card, CardContent, Divider, LinearProgress, Stack, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { formatRupees, type PodProfitResults } from '../types';
import { useTranslation } from '@duncit/app-settings';
import { Row, SectionLabel, type Emphasis } from './Row';

interface Props {
  results: PodProfitResults;
}

export default function ResultsCard({ results }: Readonly<Props>) {
  const { t } = useTranslation();
  const hostShare = Math.min(Math.max(results.host_earn_percent, 0), 100);
  const hostShortfall = results.host_receives < 0;
  const hostEmphasis: Emphasis = hostShortfall ? 'error' : 'success';
  const hostDetailBase = `${t('finance.calculators.hostAmountLessCommission')}: ${formatRupees(results.host_amount)}`;
  const { scaled } = results;
  const projected = scaled.pod_count > 1;
  const hostDetail = hostShortfall
    ? `${hostDetailBase} — ${t('finance.calculators.hostShortfallDetail')}`
    : hostDetailBase;
  return (
    <Card sx={{ position: { lg: 'sticky' }, top: { lg: 84 } }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1.5
          }}>
          <TrendingUpIcon color="primary" />
          <Typography variant="subtitle1" sx={{
            fontWeight: 800
          }}>{t('finance.calculators.results')}</Typography>
        </Stack>

        <Box
          sx={(theme) => ({
            p: 2,
            borderRadius: 1.5,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}1c 0%, ${theme.palette.primary.main}08 100%)`,
            border: 1,
            borderColor: 'divider',
            mb: 2,
          })}
        >
          <SectionLabel text={t('finance.calculators.totalDuncitRevenue')} />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              color: "primary.main"
            }}>
            {formatRupees(results.duncit_revenue_total)}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              mt: 1
            }}>
            <LinearProgress
              variant="determinate"
              value={hostShare}
              sx={{ flex: 1, height: 8, borderRadius: 1 }}
            />
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                minWidth: 100,
                textAlign: 'right'
              }}>
              {results.host_earn_percent.toFixed(1)}% {t('finance.calculators.hostTakeHome')}
            </Typography>
          </Stack>
        </Box>

        <SectionLabel text={t('finance.calculators.collection')} />
        <Row
          label={t('finance.calculators.payableSpots')}
          value={`${results.payable_spots} of ${results.total_spots}`}
          detail={t('finance.calculators.hostSpotFreeDetail')}
        />
        <Row
          label={t('finance.calculators.totalCollection')}
          value={formatRupees(results.collection_total)}
          detail={t('finance.calculators.collectionDetail')}
        />

        <Divider sx={{ my: 1 }} />
        <SectionLabel text={t('finance.calculators.duncitRevenue')} />
        <Row label={t('finance.common.platformFee')} value={formatRupees(results.platform_fee_amount)} emphasis="primary" />
        <Row label={t('finance.calculators.venueCommission')} value={formatRupees(results.venue_commission_amount)} emphasis="primary" />
        <Row label={t('finance.calculators.hostCommission')} value={formatRupees(results.host_commission_amount)} emphasis="primary" />
        <Row label={t('finance.calculators.clubAdminCut')} value={formatRupees(results.club_admin_amount)} emphasis="primary" />

        <Divider sx={{ my: 1 }} />
        <SectionLabel text={t('finance.calculators.payouts')} />
        <Row
          label={t('finance.calculators.venueReceives')}
          value={formatRupees(results.venue_receives)}
          emphasis="success"
          detail={`${t('finance.calculators.venueAmountLessCommission')}: ${formatRupees(results.venue_amount)}`}
        />
        <Row
          label={t('finance.calculators.hostReceives')}
          value={formatRupees(results.host_receives)}
          emphasis={hostEmphasis}
          detail={hostDetail}
        />

        <Divider sx={{ my: 1 }} />
        <SectionLabel text={t('finance.calculators.taxesAndPool')} />
        <Row
          label={t('finance.calculators.gstToGovernment')}
          value={formatRupees(results.gst_amount)}
          emphasis="warning"
          detail={t('finance.calculators.gstDetail')}
        />
        <Row label={t('finance.calculators.netAfterGst')} value={formatRupees(results.net_amount)} />
        <Row
          label={t('finance.common.remainingPool')}
          value={formatRupees(results.pool_amount)}
          detail={t('finance.calculators.remainingPoolDetail')}
        />

        {projected && (
          <>
            <Divider sx={{ my: 1 }} />
            <SectionLabel text={t('finance.calculators.acrossAllPods')} />
            <Row
              label={t('finance.calculators.totalNumberOfPods')}
              value={String(scaled.pod_count)}
              detail={t('finance.calculators.everyFigureBelowTimesCount')}
            />
            <Row
              label={t('finance.calculators.totalCollection')}
              value={formatRupees(scaled.collection_total)}
            />
            <Row
              label={t('finance.calculators.duncitRevenue')}
              value={formatRupees(scaled.duncit_revenue_total)}
              emphasis="primary"
            />
            <Row
              label={t('finance.calculators.venueReceives')}
              value={formatRupees(scaled.venue_receives)}
              emphasis="success"
            />
            <Row
              label={t('finance.calculators.hostReceives')}
              value={formatRupees(scaled.host_receives)}
              emphasis={hostEmphasis}
            />
            <Row
              label={t('finance.calculators.gst')}
              value={formatRupees(scaled.gst_amount)}
              emphasis="warning"
            />
          </>
        )}

        <Divider sx={{ my: 1 }} />
        <Row label={t('finance.calculators.reconcilesToCollection')} value={formatRupees(results.reconciled_total)} />
      </CardContent>
    </Card>
  );
}
