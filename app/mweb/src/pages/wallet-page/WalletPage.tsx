import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { MY_WALLET } from './queries';
import { WithdrawForm } from './withdraw';

const PAYOUT_LABEL: Record<string, string> = {
  IMMEDIATE: 'Paid immediately after approval',
  WEEKLY: 'Paid on the weekly payout cycle',
  MONTH_END: 'Paid at month end',
};
const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  PAID: 'success',
  REJECTED: 'error',
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

export default function WalletPage() {
  const { data, loading, error, refetch } = useQuery(MY_WALLET, { fetchPolicy: 'cache-and-network' });
  const [open, setOpen] = useState(false);

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  const wallet = data?.myWallet;
  const currency = wallet?.currency_symbol ?? '₹';
  const balance = wallet?.balance ?? 0;
  const transactions = data?.myWalletTransactions ?? [];
  const withdrawals = data?.myWithdrawals ?? [];

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <AccountBalanceWalletIcon color="primary" />
        <Typography variant="h4" sx={{ fontWeight: 950, flex: 1 }}>
          Wallet
        </Typography>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card variant="outlined" sx={{ borderRadius: 4, background: 'linear-gradient(135deg, rgba(255,79,115,0.12), rgba(255,122,89,0.12))' }}>
        <CardContent>
          <Typography variant="caption" sx={{ fontWeight: 900 }} color="primary.main">
            Available balance
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 950, my: 0.5 }}>
            {currency}
            {balance.toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {PAYOUT_LABEL[wallet?.payout_mode] ?? ''} · Next cycle {fmtDate(wallet?.next_payout_at)}
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <Button variant="contained" disabled={balance <= 0} onClick={() => setOpen(true)} sx={{ borderRadius: 999, fontWeight: 900 }}>
              Withdraw
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 950, mb: 1 }}>
            Withdrawals
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          {withdrawals.length === 0 ? (
            <Alert severity="info">No withdrawals yet.</Alert>
          ) : (
            <Stack spacing={1}>
              {withdrawals.map((w: any) => (
                <Stack key={w.id} direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {currency}
                      {w.amount.toFixed(2)} · {w.payout_method}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      Requested {fmtDate(w.created_at)}
                      {w.reject_reason ? ` · ${w.reject_reason}` : ''}
                    </Typography>
                  </Box>
                  <Chip size="small" color={STATUS_COLOR[w.status] ?? 'default'} label={w.status} />
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 950, mb: 1 }}>
            Transactions
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          {transactions.length === 0 ? (
            <Alert severity="info">Your pod payouts will show up here.</Alert>
          ) : (
            <Stack spacing={1}>
              {transactions.map((t: any) => (
                <Stack key={t.id} direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {t.reason || t.source}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmtDate(t.created_at)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={900} color={t.type === 'CREDIT' ? 'success.main' : 'error.main'}>
                    {t.type === 'CREDIT' ? '+' : '−'}
                    {currency}
                    {t.amount.toFixed(2)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <WithdrawForm
        open={open}
        maxAmount={balance}
        currency={currency}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          refetch().catch(() => undefined);
        }}
      />
    </Stack>
  );
}
