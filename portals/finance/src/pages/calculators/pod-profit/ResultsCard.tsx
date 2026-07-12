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

interface Props {
  results: PodProfitResults;
}

type Emphasis = 'primary' | 'success' | 'warning' | 'default';

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
  default: 'text.primary',
};

function Row({ label, value, emphasis = 'default', detail }: Readonly<RowProps>) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ py: 0.75 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>{label}</Typography>
        {detail ? (
          <Typography variant="caption" color="text.secondary">{detail}</Typography>
        ) : null}
      </Box>
      <Typography variant="subtitle1" fontWeight={800} color={COLORS[emphasis]} sx={{ ml: 1.5 }}>
        {value}
      </Typography>
    </Stack>
  );
}

function SectionLabel({ text }: Readonly<{ text: string }>) {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
      {text}
    </Typography>
  );
}

export default function ResultsCard({ results }: Readonly<Props>) {
  const hostShare = Math.min(Math.max(results.host_earn_percent, 0), 100);
  return (
    <Card sx={{ position: { lg: 'sticky' }, top: { lg: 84 } }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <TrendingUpIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={800}>Results</Typography>
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
          <Typography variant="h4" fontWeight={900} color="primary.main">
            {formatRupees(results.duncit_revenue_total)}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={hostShare}
              sx={{ flex: 1, height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100, textAlign: 'right' }}>
              {results.host_earn_percent.toFixed(1)}% host take-home
            </Typography>
          </Stack>
        </Box>

        <SectionLabel text="Collection" />
        <Row
          label="Total collection"
          value={formatRupees(results.collection_total)}
          detail="Ticket price × no. of spots — the amount the waterfall runs on"
        />

        <Divider sx={{ my: 1 }} />
        <SectionLabel text="Duncit revenue" />
        <Row label="Platform fee" value={formatRupees(results.platform_fee_amount)} emphasis="primary" />
        <Row label="Venue commission" value={formatRupees(results.venue_commission_amount)} emphasis="primary" />
        <Row label="Host commission" value={formatRupees(results.host_commission_amount)} emphasis="primary" />

        <Divider sx={{ my: 1 }} />
        <SectionLabel text="Payouts" />
        <Row
          label="Venue receives"
          value={formatRupees(results.venue_receives)}
          emphasis="success"
          detail={`Venue amount ${formatRupees(results.venue_amount)} − commission`}
        />
        <Row
          label="Host receives"
          value={formatRupees(results.host_receives)}
          emphasis="success"
          detail={`Host amount ${formatRupees(results.host_amount)} − commission`}
        />

        <Divider sx={{ my: 1 }} />
        <SectionLabel text="Taxes & pool" />
        <Row
          label="GST (to government)"
          value={formatRupees(results.gst_amount)}
          emphasis="warning"
          detail="Extracted from the collection, remitted to the government"
        />
        <Row label="Net after GST" value={formatRupees(results.net_amount)} />
        <Row
          label="Remaining pool"
          value={formatRupees(results.pool_amount)}
          detail="Net minus platform fee — split between venue and host"
        />

        <Divider sx={{ my: 1 }} />
        <Row label="Reconciles to collection" value={formatRupees(results.reconciled_total)} />
      </CardContent>
    </Card>
  );
}
