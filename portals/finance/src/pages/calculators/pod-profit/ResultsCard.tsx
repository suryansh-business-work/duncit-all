import {
  Box,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { formatRupees, type PodProfitResults } from './types';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  results: PodProfitResults;
}

type Emphasis = 'primary' | 'success' | 'warning' | 'error' | 'default';

interface RowProps {
  label: string;
  value: string;
  emphasis?: Emphasis;
  detail?: string;
}

const COLORS: Record<Emphasis, string> = {
  primary: 'primary.main',
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
  default: 'text.primary',
};

function Row({ label, value, emphasis = 'default', detail }: Readonly<RowProps>) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "flex-start",
        justifyContent: "space-between",
        py: 0.75
      }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{
          fontWeight: 600
        }}>{label}</Typography>
        {detail ? (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>{detail}</Typography>
        ) : null}
      </Box>
      <Typography
        variant="subtitle1"
        color={COLORS[emphasis]}
        sx={{
          fontWeight: 800,
          ml: 1.5
        }}>
        {value}
      </Typography>
    </Stack>
  );
}

function SectionLabel({ text }: Readonly<{ text: string }>) {
  return (
    <Typography
      variant="overline"
      sx={{
        color: "text.secondary",
        fontWeight: 700
      }}>
      {text}
    </Typography>
  );
}

export default function ResultsCard({ results }: Readonly<Props>) {
  const { t } = useTranslation();
  const hostShare = Math.min(Math.max(results.host_earn_percent, 0), 100);
  const hostShortfall = results.host_receives < 0;
  const hostEmphasis: Emphasis = hostShortfall ? 'error' : 'success';
  const hostDetailBase = `Host amount ${formatRupees(results.host_amount)} − commission`;
  const hostDetail = hostShortfall
    ? `${hostDetailBase} — the venue's booked price exceeds the pool; the shortfall lands on the host`
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
          <SectionLabel text="Total Duncit revenue" />
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
              {results.host_earn_percent.toFixed(1)}% host take-home
            </Typography>
          </Stack>
        </Box>

        <SectionLabel text="Collection" />
        <Row
          label={t('finance.calculators.payableSpots')}
          value={`${results.payable_spots} of ${results.total_spots}`}
          detail="The host's spot is free — the calculation is based on total spots − 1"
        />
        <Row
          label={t('finance.calculators.totalCollection')}
          value={formatRupees(results.collection_total)}
          detail={`Ticket price × ${results.payable_spots} payable spots — the amount the waterfall runs on`}
        />

        <Divider sx={{ my: 1 }} />
        <SectionLabel text="Duncit revenue" />
        <Row label={t('finance.common.platformFee')} value={formatRupees(results.platform_fee_amount)} emphasis="primary" />
        <Row label={t('finance.calculators.venueCommission')} value={formatRupees(results.venue_commission_amount)} emphasis="primary" />
        <Row label={t('finance.calculators.hostCommission')} value={formatRupees(results.host_commission_amount)} emphasis="primary" />
        <Row label={t('finance.calculators.clubAdminCut')} value={formatRupees(results.club_admin_amount)} emphasis="primary" />

        <Divider sx={{ my: 1 }} />
        <SectionLabel text="Payouts" />
        <Row
          label={t('finance.calculators.venueReceives')}
          value={formatRupees(results.venue_receives)}
          emphasis="success"
          detail={`Venue amount ${formatRupees(results.venue_amount)} − commission`}
        />
        <Row
          label={t('finance.calculators.hostReceives')}
          value={formatRupees(results.host_receives)}
          emphasis={hostEmphasis}
          detail={hostDetail}
        />

        <Divider sx={{ my: 1 }} />
        <SectionLabel text="Taxes & pool" />
        <Row
          label={t('finance.calculators.gstToGovernment')}
          value={formatRupees(results.gst_amount)}
          emphasis="warning"
          detail="Extracted from the collection, remitted to the government"
        />
        <Row label={t('finance.calculators.netAfterGst')} value={formatRupees(results.net_amount)} />
        <Row
          label={t('finance.common.remainingPool')}
          value={formatRupees(results.pool_amount)}
          detail="Net minus platform fee — split between venue and host"
        />

        <Divider sx={{ my: 1 }} />
        <Row label={t('finance.calculators.reconcilesToCollection')} value={formatRupees(results.reconciled_total)} />
      </CardContent>
    </Card>
  );
}
