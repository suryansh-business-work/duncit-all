import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { MY_WALLET } from './queries';
import { WithdrawForm } from './withdraw';
import { formatDate } from '../../utils/dateFormat';

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
  return formatDate(d) || '—';
};

export default function WalletPage() {
  const { data, loading, error, refetch } = useQuery(MY_WALLET, { fetchPolicy: 'cache-and-network' });
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

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

  const wallet = data?.myWallet;
  const currency = wallet?.currency_symbol ?? '₹';
  const balance = wallet?.balance ?? 0;
  const transactions = data?.myWalletTransactions ?? [];
  const withdrawals = data?.myWithdrawals ?? [];
  // Eligibility is decided by the server (role-wise Minimum Withdrawal Amount)
  // and never re-derived here — the client only words the number it is sent.
  const eligible = wallet?.can_withdraw === true;
  const minAmount = wallet?.min_withdrawal_amount ?? 0;
  const minNoticeKey = eligible ? 'mweb.wallet.minimumHint' : 'mweb.wallet.minimumBlocked';
  const minNotice = t(minNoticeKey, { vars: { amount: formatMoney(minAmount, { symbol: currency }) } });

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <AccountBalanceWalletIcon color="primary" />
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
          Wallet
        </Typography>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card variant="outlined" sx={{ borderRadius: '16px', background: 'linear-gradient(135deg, rgba(255,79,115,0.12), rgba(255,122,89,0.12))' }}>
        <CardContent>
          <Typography
            variant="caption"
            sx={{
              color: "primary.main",
              fontWeight: 700
            }}>
            Available balance
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, my: 0.5 }}>
            {currency}
            {balance.toFixed(2)}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {PAYOUT_LABEL[wallet?.payout_mode] ?? ''} · Next cycle {fmtDate(wallet?.next_payout_at)}
          </Typography>
          {minAmount > 0 && (
            <Typography
              variant="caption"
              color={eligible ? 'text.secondary' : 'warning.main'}
              sx={{
                display: "block",
                mt: 0.5,
                fontWeight: 600
              }}>
              {minNotice}
            </Typography>
          )}
          <Box sx={{ mt: 1.5 }}>
            <DuncitButton
              variant="contained"
              disabled={!eligible || balance <= 0}
              onClick={() => setOpen(true)}
              sx={{ borderRadius: 999, fontWeight: 700 }}
            >
              Withdraw
            </DuncitButton>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Withdrawals
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          {withdrawals.length === 0 ? (
            <Alert severity="info">{t('mweb.wallet.noWithdrawalsYet')}</Alert>
          ) : (
            <Stack spacing={1}>
              {withdrawals.map((w: any) => (
                <Stack key={w.id} direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{
                      fontWeight: 700
                    }}>
                      {currency}
                      {w.amount.toFixed(2)} · {w.payout_method}
                    </Typography>
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        color: "text.secondary",
                        display: "block"
                      }}>
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

      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Transactions
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          {transactions.length === 0 ? (
            <Alert severity="info">{t('mweb.wallet.yourPodPayoutsWillShowUp')}</Alert>
          ) : (
            <Stack spacing={1}>
              {transactions.map((t: any) => (
                <Stack key={t.id} direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{
                      fontWeight: 700
                    }}>
                      {t.reason || t.source}
                    </Typography>
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>
                      {fmtDate(t.created_at)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={t.type === 'CREDIT' ? 'success.main' : 'error.main'} sx={{
                    fontWeight: 700
                  }}>
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
        minAmount={minAmount}
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
