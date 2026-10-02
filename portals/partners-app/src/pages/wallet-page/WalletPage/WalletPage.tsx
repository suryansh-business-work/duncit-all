import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { DuncitButton } from '@duncit/buttons';
import { MY_WALLET } from '../queries';
import { WithdrawForm } from '../withdraw';
import { useTranslation } from '@duncit/shell';
import { PAYOUT_LABEL, fmtDate } from './helpers';
import WithdrawalsCard from './WithdrawalsCard';
import TransactionsCard from './TransactionsCard';

/** Partner wallet — balance, payout cycle, withdrawals and transactions, plus a
 * Withdraw dialog. Reuses the per-user myWallet/requestWithdrawal GraphQL that
 * powers the mWeb wallet page. */
export default function WalletPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(MY_WALLET, {
    fetchPolicy: 'cache-and-network',
  });
  const [open, setOpen] = useState(false);

  if (loading && !data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 8
        }}>
        <CircularProgress aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }

  const wallet = data?.myWallet;
  const currency = wallet?.currency_symbol ?? '₹';
  const balance = wallet?.balance ?? 0;
  // The role-wise floor, decided SERVER-SIDE. This console is where Venue
  // Owners, E-Commerce Brands and Club Admins actually withdraw — three of the
  // four roles the minimums apply to — so gating only mWeb and native would
  // leave exactly those people with an enabled button and a raw server error.
  const minWithdrawal = wallet?.min_withdrawal_amount ?? 0;
  const canWithdraw = wallet?.can_withdraw ?? balance > 0;
  const belowMinimum = !canWithdraw && minWithdrawal > 0;
  const transactions = data?.myWalletTransactions ?? [];
  const withdrawals = data?.myWithdrawals ?? [];

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <AccountBalanceWalletIcon color="primary" />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 950, flex: 1 }}>
          Wallet
        </Typography>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card
        variant="outlined"
        sx={{
          borderRadius: 4,
          background: 'linear-gradient(135deg, rgba(255,79,115,0.12), rgba(255,122,89,0.12))',
        }}
      >
        <CardContent>
          <Typography
            variant="caption"
            sx={{
              color: "primary.main",
              fontWeight: 900
            }}>
            Available balance
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 950, my: 0.5 }}>
            {currency}
            {balance.toFixed(2)}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {PAYOUT_LABEL[wallet?.payout_mode] ?? ''} · Next cycle {fmtDate(wallet?.next_payout_at)}
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <DuncitButton
              variant="contained"
              disabled={!canWithdraw}
              onClick={() => setOpen(true)}
              sx={{ borderRadius: 999, fontWeight: 900 }}
            >
              {t('partners.becomeHostPage.withdraw')}
            </DuncitButton>
            {belowMinimum && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: 'block',
                  mt: 0.75
                }}>
                {`You can withdraw once your balance reaches ${currency}${minWithdrawal.toFixed(2)}.`}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <WithdrawalsCard withdrawals={withdrawals} currency={currency} />

      <TransactionsCard transactions={transactions} currency={currency} />

      <WithdrawForm
        open={open}
        maxAmount={balance}
        minAmount={minWithdrawal}
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
