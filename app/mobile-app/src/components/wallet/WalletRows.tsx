import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { WalletTxn, Withdrawal } from '@/hooks/useWallet';
import { formatDate } from '@/utils/date-format';

/** Withdrawal status → its pill fill (semantic tokens, readable in both modes). */
const STATUS_BG: Record<string, string> = {
  PENDING: '$warning',
  PAID: '$success',
  REJECTED: '$danger',
};

type RowIcon = 'account-balance' | 'call-received' | 'call-made';

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return formatDate(d) || '—';
};

/** The row's icon: a 40px soft disc. */
function IconDisc({ name }: Readonly<{ name: RowIcon }>) {
  const { muted } = useThemeColors();
  return (
    <YStack
      width={40}
      height={40}
      borderRadius={20}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$soft"
    >
      <MaterialIcons name={name} size={20} color={muted} />
    </YStack>
  );
}

/** A titled list: the section header, then its rows inside one card — or the
 * one muted line when there is nothing yet (no card at all while `empty` is
 * null, i.e. still loading). RN twin of mWeb's WalletSection. */
export function WalletSection({
  title,
  empty,
  children,
}: Readonly<{ title: string; empty: ReactNode; children: ReactNode[] }>) {
  const content = children.length === 0 ? empty : children;
  return (
    <YStack gap={10}>
      <SectionHeader title={title} />
      {content ? <SurfaceCard paddingVertical={4}>{content}</SurfaceCard> : null}
    </YStack>
  );
}

/** One ledger line — green for money in, ink for money out. */
export function TxnRow({
  txn,
  symbol,
  divided,
}: Readonly<{ txn: WalletTxn; symbol: string; divided: boolean }>) {
  const credit = txn.type === 'CREDIT';
  return (
    <XStack
      alignItems="center"
      gap={12}
      paddingVertical={12}
      borderTopWidth={divided ? 1 : 0}
      borderColor="$borderColor"
    >
      <IconDisc name={credit ? 'call-received' : 'call-made'} />
      <YStack flex={1} minWidth={0}>
        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
          {txn.reason || txn.source}
        </Text>
        <Text fontSize={12} color="$muted">
          {fmtDate(txn.created_at)}
        </Text>
      </YStack>
      <Text fontSize={14} fontWeight="700" color={credit ? '$success' : '$color'}>
        {credit ? '+' : '-'}
        {symbol}
        {txn.amount.toFixed(2)}
      </Text>
    </XStack>
  );
}

/** One withdrawal: amount · method, when it was requested (and why it was
 * rejected), and its status pill. */
export function WithdrawalRow({
  w,
  symbol,
  divided,
}: Readonly<{ w: Withdrawal; symbol: string; divided: boolean }>) {
  return (
    <XStack
      alignItems="center"
      gap={12}
      paddingVertical={12}
      borderTopWidth={divided ? 1 : 0}
      borderColor="$borderColor"
    >
      <IconDisc name="account-balance" />
      <YStack flex={1} minWidth={0}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {symbol}
          {w.amount.toFixed(2)} · {w.payout_method}
        </Text>
        <Text fontSize={12} color="$muted" numberOfLines={1}>
          {fmtDate(w.created_at)}
          {w.reject_reason ? ` · ${w.reject_reason}` : ''}
        </Text>
      </YStack>
      <XStack
        height={24}
        paddingHorizontal={10}
        alignItems="center"
        borderRadius={999}
        backgroundColor={STATUS_BG[w.status] ?? '$muted'}
      >
        <Text fontSize={11} fontWeight="600" color="$onPrimary">
          {w.status}
        </Text>
      </XStack>
    </XStack>
  );
}
