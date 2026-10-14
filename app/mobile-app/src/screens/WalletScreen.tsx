import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useLoadingRegion } from '@/components/Skeleton';
import { WithdrawCta } from '@/components/wallet/WithdrawCta';
import { StatementDialog } from '@/components/wallet/StatementDialog';
import { WithdrawDialog } from '@/components/wallet/WithdrawDialog';
import { fmtDate, TxnRow, WalletSection, WithdrawalRow } from '@/components/wallet/WalletRows';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWallet } from '@/hooks/useWallet';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

const PAYOUT_LABEL_KEY: Record<string, string> = {
  IMMEDIATE: 'mweb.wallet.payoutImmediate',
  WEEKLY: 'mweb.wallet.payoutWeekly',
  MONTH_END: 'mweb.wallet.payoutMonthEnd',
};

/** Host Wallet — balance, payout cycle, withdrawals and transaction history. */
export function WalletScreen() {
  const { t } = useTranslation();
  const { wallet, transactions, withdrawals, isLoading, refetch } = useWallet();
  const [open, setOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const { color: ink } = useThemeColors();
  const loadingRegion = useLoadingRegion();
  const symbol = wallet?.currency_symbol ?? '₹';
  const balance = wallet?.balance ?? 0;
  // Eligibility is decided by the server (role-wise Minimum Withdrawal Amount)
  // and never re-derived here — the app only words the number it is sent.
  const eligible = wallet?.can_withdraw === true;
  const minAmount = wallet?.min_withdrawal_amount ?? 0;
  const payoutKey = wallet ? PAYOUT_LABEL_KEY[wallet.payout_mode] : undefined;
  const noWithdrawals = isLoading ? null : (
    <Text testID="wallet-no-withdrawals" fontSize={14} color="$muted" paddingVertical={12}>
      {t('mweb.wallet.noWithdrawalsYet')}
    </Text>
  );
  const noTransactions = isLoading ? null : (
    <Text testID="wallet-no-transactions" fontSize={14} color="$muted" paddingVertical={12}>
      {t('mweb.wallet.yourPodPayoutsWillShowUp')}
    </Text>
  );

  return (
    <StackScreen header title={t('mweb.common.wallet')} testID="wallet-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={20} padding={16} paddingBottom={48}>
          {isLoading && !wallet ? (
            <Spinner testID="wallet-loading" color="$primary" {...loadingRegion} />
          ) : null}

          {/* The balance hero: muted label, the big number, the payout cycle
              and the green Withdraw pill. */}
          <SurfaceCard gap={4} padding={20}>
            <Text fontSize={14} color="$muted">
              {t('mweb.wallet.availableBalance')}
            </Text>
            <Text fontSize={32} fontWeight="700" color="$color">
              {symbol}
              {balance.toFixed(2)}
            </Text>
            {wallet ? (
              <Text fontSize={12} color="$muted">
                {payoutKey ? t(payoutKey) : ''} ·{' '}
                {t('mweb.wallet.nextCycle', { vars: { date: fmtDate(wallet.next_payout_at) } })}
              </Text>
            ) : null}
            <WithdrawCta
              minAmount={minAmount}
              symbol={symbol}
              eligible={eligible}
              disabled={!eligible || balance <= 0}
              onPress={() => setOpen(true)}
            />
            <XStack marginTop={8}>
              <DuncitButton
                testID="wallet-statement"
                label={t('withdraw.statement.title')}
                variant="outline"
                tone="neutral"
                icon={<MaterialIcons name="download" size={18} color={ink} />}
                onPress={() => setStatementOpen(true)}
              />
            </XStack>
          </SurfaceCard>

          <WalletSection title={t('mweb.wallet.withdrawals')} empty={noWithdrawals}>
            {withdrawals.map((w, rowIndex) => (
              <WithdrawalRow key={w.id} w={w} symbol={symbol} divided={rowIndex > 0} />
            ))}
          </WalletSection>

          <WalletSection title={t('mweb.wallet.transactions')} empty={noTransactions}>
            {transactions.map((txn, rowIndex) => (
              <TxnRow key={txn.id} txn={txn} symbol={symbol} divided={rowIndex > 0} />
            ))}
          </WalletSection>
        </YStack>
      </RefreshScrollView>

      <WithdrawDialog
        open={open}
        maxAmount={balance}
        minAmount={minAmount}
        currency={symbol}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          refetch().catch(() => undefined);
        }}
      />

      {/* Mounted only while open: the form starts fresh each time. */}
      {statementOpen ? <StatementDialog onClose={() => setStatementOpen(false)} /> : null}
    </StackScreen>
  );
}
