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

interface RowProps {
  label: string;
  value: string;
  emphasis?: 'primary' | 'success' | 'warning' | 'default';
  detail?: string;
}

const COLORS: Record<NonNullable<RowProps['emphasis']>, string> = {
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
        {detail && (
          <Typography variant="caption" color="text.secondary">{detail}</Typography>
        )}
      </Box>
      <Typography variant="subtitle1" fontWeight={800} color={COLORS[emphasis]} sx={{ ml: 1.5 }}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function ResultsCard({ results }: Readonly<Props>) {
  const margin = Math.min(Math.max(results.effective_duncit_margin_percent, 0), 100);
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
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
            Total profit to Duncit
          </Typography>
          <Typography variant="h4" fontWeight={900} color="primary.main">
            {formatRupees(results.duncit_profit_total)}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={margin}
              sx={{ flex: 1, height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 64, textAlign: 'right' }}>
              {results.effective_duncit_margin_percent.toFixed(1)}% margin
            </Typography>
          </Stack>
        </Box>

        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
          Breakdown
        </Typography>
        <Row label="Platform fee" value={formatRupees(results.platform_fee_amount)} emphasis="primary" />
        <Row
          label="Duncit cut from host"
          value={formatRupees(results.duncit_cut_from_host)}
          emphasis="primary"
          detail="Slice of host earnings collected as platform income"
        />
        <Row label="Product commissions" value={formatRupees(results.product_commission_total)} emphasis="primary" />
        <Divider sx={{ my: 1 }} />
        <Row
          label="Total host percentage amount"
          value={formatRupees(results.host_amount_gross)}
          emphasis="success"
          detail={`Host net after Duncit cut: ${formatRupees(results.host_amount_net)}`}
        />
        <Row
          label="Total GST amount"
          value={formatRupees(results.gst_amount)}
          emphasis="warning"
          detail="Pass-through to tax authority"
        />
        <Divider sx={{ my: 1 }} />
        <Row label="Product revenue (gross)" value={formatRupees(results.product_revenue_total)} />
      </CardContent>
    </Card>
  );
}
