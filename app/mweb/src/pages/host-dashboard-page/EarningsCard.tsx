import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useDateFormat } from '../../utils/dateFormat';

/** myHostEarningsSummary — lifetime/pending/this-month totals for the host. */
export interface HostEarningsSummary {
  currency_symbol: string;
  lifetime_earnings: number;
  pending_amount: number;
  pods_completed: number;
  this_month_earnings: number;
}

interface Props {
  balance: number;
  currency: string;
  nextPayoutAt?: string | null;
  summary?: HostEarningsSummary | null;
}

function StatBox({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box sx={{ flex: '1 1 40%', minWidth: 0, p: 1, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.14)' }}>
      <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.9, display: 'block' }} noWrap>
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 950, lineHeight: 1.2 }} noWrap>
        {value}
      </Typography>
    </Box>
  );
}

/** Host earnings summary — available wallet balance + next payout, with wallet
 * and withdraw shortcuts (B2-#5), plus the settled-earnings summary from
 * myHostEarningsSummary (Pod Finance Breakdown). */
export default function EarningsCard({ balance, currency, nextPayoutAt, summary }: Readonly<Props>) {
  const { formatDate } = useDateFormat();
  const symbol = summary?.currency_symbol ?? currency;
  const money = (value: number) => `${symbol}${value.toFixed(2)}`;

  return (
    <Card
      sx={{
        borderRadius: 4,
        color: 'common.white',
        background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 60%, #16121f 100%)',
        boxShadow: '0 18px 42px rgba(245,51,122,0.24)',
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PaymentsIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: 1 }}>
            AVAILABLE BALANCE
          </Typography>
        </Stack>
        <Typography variant="h3" sx={{ fontWeight: 950, mt: 0.5 }}>
          {currency}
          {balance.toFixed(2)}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700 }}>
          {nextPayoutAt ? `Next payout ${formatDate(nextPayoutAt)}` : 'Earnings from your hosted pods'}
        </Typography>
        {summary && (
          <Stack direction="row" sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <StatBox label="Lifetime earnings" value={money(summary.lifetime_earnings)} />
            <StatBox label="Pending approval" value={money(summary.pending_amount)} />
            <StatBox label="This month" value={money(summary.this_month_earnings)} />
            <StatBox label="Pods completed" value={String(summary.pods_completed)} />
          </Stack>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button
            component={RouterLink}
            to="/host/wallet"
            variant="contained"
            size="small"
            startIcon={<AccountBalanceWalletIcon />}
            sx={{ borderRadius: 999, fontWeight: 900, bgcolor: 'common.white', color: 'text.primary', '&:hover': { bgcolor: 'grey.100' } }}
          >
            Wallet
          </Button>
          <Box sx={{ flex: 1 }} />
        </Stack>
      </CardContent>
    </Card>
  );
}
