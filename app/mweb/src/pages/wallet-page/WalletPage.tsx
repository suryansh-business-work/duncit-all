import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, CircularProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { MY_WALLET } from './queries';
import { WithdrawForm } from './withdraw';
import { fmtDate, TxnRow, WalletSection, WithdrawalRow } from './WalletRows';

const PAYOUT_LABEL: Record<string, string> = {
  IMMEDIATE: 'Paid immediately after approval',
  WEEKLY: 'Paid on the weekly payout cycle',
  MONTH_END: 'Paid at month end',
};

export default function WalletPage() {
  const { data, loading, error, refetch } = useQuery<any>(MY_WALLET, { fetchPolicy: 'cache-and-network' });
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
  const transactions: any[] = data?.myWalletTransactions ?? [];
  const withdrawals: any[] = data?.myWithdrawals ?? [];
  // Eligibility is decided by the server (role-wise Minimum Withdrawal Amount)
  // and never re-derived here — the client only words the number it is sent.
  const eligible = wallet?.can_withdraw === true;
  const minAmount = wallet?.min_withdrawal_amount ?? 0;
  const minNoticeKey = eligible ? 'mweb.wallet.minimumHint' : 'mweb.wallet.minimumBlocked';
  const minNotice = t(minNoticeKey, { vars: { amount: formatMoney(minAmount, { symbol: currency }) } });

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 760, mx: 'auto', width: '100%', py: 0.5 }}>
      <PageHeader title={t('mweb.common.wallet')} />

      {error && <Alert severity="error">{error.message}</Alert>}

      {/* The balance hero: muted label, the big number, the payout cycle and
          the green Withdraw pill. */}
      <Card sx={{ p: 2.5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.wallet.availableBalance')}
        </Typography>
        <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>
          {currency}
          {balance.toFixed(2)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
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
        <DuncitButton
          variant="contained"
          size="large"
          disabled={!eligible || balance <= 0}
          onClick={() => setOpen(true)}
          sx={{ mt: 2 }}
        >
          {t('mweb.wallet.withdraw')}
        </DuncitButton>
      </Card>

      <WalletSection title={t('mweb.wallet.withdrawals')} emptyText={t('mweb.wallet.noWithdrawalsYet')}>
        {withdrawals.map((w) => (
          <WithdrawalRow key={w.id} w={w} currency={currency} />
        ))}
      </WalletSection>

      <WalletSection title={t('mweb.wallet.transactions')} emptyText={t('mweb.wallet.yourPodPayoutsWillShowUp')}>
        {transactions.map((txn) => (
          <TxnRow key={txn.id} txn={txn} currency={currency} />
        ))}
      </WalletSection>

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
