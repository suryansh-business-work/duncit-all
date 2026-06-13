import { useState } from 'react';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { WithdrawDialog } from '@/components/wallet/WithdrawDialog';
import { useWallet, type WalletTxn, type Withdrawal } from '@/hooks/useWallet';

const PAYOUT_LABEL: Record<string, string> = {
  IMMEDIATE: 'Paid immediately after approval',
  WEEKLY: 'Paid on the weekly payout cycle',
  MONTH_END: 'Paid at month end',
};
const STATUS_BG: Record<string, string> = {
  PENDING: '#d97706',
  PAID: '#16a34a',
  REJECTED: '#dc2626',
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

function TxnRow({ txn, symbol }: Readonly<{ txn: WalletTxn; symbol: string }>) {
  const credit = txn.type === 'CREDIT';
  return (
    <XStack alignItems="center" gap={8} paddingVertical={6}>
      <YStack flex={1}>
        <Text fontSize={13.5} fontWeight="700" color="$color" numberOfLines={1}>
          {txn.reason || txn.source}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {fmtDate(txn.created_at)}
        </Text>
      </YStack>
      <Text fontSize={13.5} fontWeight="900" color={credit ? '#16a34a' : '#dc2626'}>
        {credit ? '+' : '-'}
        {symbol}
        {txn.amount.toFixed(2)}
      </Text>
    </XStack>
  );
}

function WithdrawalRow({ w, symbol }: Readonly<{ w: Withdrawal; symbol: string }>) {
  return (
    <XStack alignItems="center" gap={8} paddingVertical={6}>
      <YStack flex={1}>
        <Text fontSize={13.5} fontWeight="700" color="$color">
          {symbol}
          {w.amount.toFixed(2)} · {w.payout_method}
        </Text>
        <Text fontSize={11.5} color="$muted" numberOfLines={1}>
          {fmtDate(w.created_at)}
          {w.reject_reason ? ` · ${w.reject_reason}` : ''}
        </Text>
      </YStack>
      <XStack
        paddingHorizontal={8}
        paddingVertical={2}
        borderRadius={999}
        backgroundColor={STATUS_BG[w.status] ?? '#6b7280'}
      >
        <Text fontSize={10.5} fontWeight="900" color="#ffffff">
          {w.status}
        </Text>
      </XStack>
    </XStack>
  );
}

/** Host Wallet — balance, payout cycle, withdrawals and transaction history. */
export function WalletScreen() {
  const { wallet, transactions, withdrawals, isLoading, refetch } = useWallet();
  const [open, setOpen] = useState(false);
  const symbol = wallet?.currency_symbol ?? '₹';
  const balance = wallet?.balance ?? 0;

  return (
    <StackScreen header title="Wallet" testID="wallet-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16} paddingBottom={48}>
          {isLoading && !wallet ? <Spinner testID="wallet-loading" color="$primary" /> : null}

          <YStack gap={6} padding={16} borderRadius={16} backgroundColor="rgba(255,79,115,0.10)">
            <Text fontSize={12} fontWeight="900" color="$primary">
              Available balance
            </Text>
            <Text fontSize={30} fontWeight="900" color="$color">
              {symbol}
              {balance.toFixed(2)}
            </Text>
            {wallet ? (
              <Text fontSize={11.5} color="$muted">
                {PAYOUT_LABEL[wallet.payout_mode] ?? ''} · Next cycle{' '}
                {fmtDate(wallet.next_payout_at)}
              </Text>
            ) : null}
            <XStack
              testID="wallet-withdraw"
              role="button"
              aria-label="Withdraw"
              aria-disabled={balance <= 0}
              onPress={balance <= 0 ? undefined : () => setOpen(true)}
              alignSelf="flex-start"
              marginTop={8}
              paddingHorizontal={18}
              height={42}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              backgroundColor="$primary"
              opacity={balance <= 0 ? 0.5 : 1}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={14} fontWeight="900" color="$onPrimary">
                Withdraw
              </Text>
            </XStack>
          </YStack>

          <Text fontSize={16} fontWeight="900" color="$color">
            Withdrawals
          </Text>
          {!isLoading && withdrawals.length === 0 ? (
            <Text testID="wallet-no-withdrawals" fontSize={13} color="$muted">
              No withdrawals yet.
            </Text>
          ) : null}
          {withdrawals.map((w) => (
            <WithdrawalRow key={w.id} w={w} symbol={symbol} />
          ))}

          <Text fontSize={16} fontWeight="900" color="$color">
            Transactions
          </Text>
          {!isLoading && transactions.length === 0 ? (
            <Text testID="wallet-no-transactions" fontSize={13} color="$muted">
              Your pod payouts will show up here.
            </Text>
          ) : null}
          {transactions.map((t) => (
            <TxnRow key={t.id} txn={t} symbol={symbol} />
          ))}
        </YStack>
      </ScrollView>

      <WithdrawDialog
        open={open}
        maxAmount={balance}
        currency={symbol}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          refetch().catch(() => undefined);
        }}
      />
    </StackScreen>
  );
}
