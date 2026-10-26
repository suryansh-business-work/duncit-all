import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, CircularProgress, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { MY_WALLET } from './queries';
import { StatementForm } from './statement';
import { WithdrawForm } from './withdraw';
import { fmtDate, TxnRow, WalletSection, WithdrawalRow } from './WalletRows';

const PAYOUT_LABEL_KEY: Record<string, string> = {
  IMMEDIATE: 'mweb.wallet.payoutImmediate',
  WEEKLY: 'mweb.wallet.payoutWeekly',
  MONTH_END: 'mweb.wallet.payoutMonthEnd',
};

export default function WalletPage() {
  const { data, loading, error, refetch } = useQuery<any>(MY_WALLET, { fetchPolicy: 'cache-and-network' });
  const [open, setOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const { t } = useTranslation();

  if (loading && !data) {
    return (
      <Stack
        data-testid="wallet-loading"
        sx={{
          alignItems: "center",
          py: 8
        }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
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
  const payoutKey: string | undefined = PAYOUT_LABEL_KEY[wallet?.payout_mode];

  return (
    <Stack data-testid="wallet-page" spacing={2.5} sx={{ maxWidth: 760, mx: 'auto', width: '100%', py: 0.5 }}>
      <PageHeader testId="wallet-page-header" title={t('mweb.common.wallet')} />

      {error && <Alert severity="error" data-testid="wallet-page-error">{error.message}</Alert>}

      {/* The balance hero: muted label, the big number, the payout cycle and
          the green Withdraw pill. */}
      <Card sx={{ p: 2.5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.wallet.availableBalance')}
        </Typography>
        <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, mt: 0.5 }} data-testid="wallet-balance">
          {currency}
          {balance.toFixed(2)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
          {payoutKey ? t(payoutKey) : ''} · {t('mweb.wallet.nextCycle', { vars: { date: fmtDate(wallet?.next_payout_at) } })}
        </Typography>
        {minAmount > 0 && (
          <Typography
            variant="caption"
            color={eligible ? 'text.secondary' : 'warning.main'}
            data-testid="wallet-minimum-notice"
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
          data-testid="wallet-withdraw"
        >
          {t('mweb.wallet.withdraw')}
        </DuncitButton>
        <DuncitButton
          variant="outlined"
          size="large"
          startIcon={<DownloadIcon />}
          onClick={() => setStatementOpen(true)}
          sx={{ mt: 2, ml: 1 }}
          data-testid="wallet-statement"
        >
          {t('withdraw.statement.title')}
        </DuncitButton>
      </Card>

      <WalletSection title={t('mweb.wallet.withdrawals')} emptyText={t('mweb.wallet.noWithdrawalsYet')} testId="wallet-withdrawals">
        {withdrawals.map((w) => (
          <WithdrawalRow key={w.id} w={w} currency={currency} />
        ))}
      </WalletSection>

      <WalletSection title={t('mweb.wallet.transactions')} emptyText={t('mweb.wallet.yourPodPayoutsWillShowUp')} testId="wallet-transactions">
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

      {/* Mounted only while open: the form starts fresh each time, and a wallet
          nobody downloads from asks for nothing extra. */}
      {statementOpen && <StatementForm onClose={() => setStatementOpen(false)} />}
    </Stack>
  );
}
