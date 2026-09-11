import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { coinLedgerLabelKey } from '@duncit/utils';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useCoinGold } from '@/hooks/useCoins';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CoinTransaction } from '@/stores/coin.store';

/** One ledger row. A CREDIT reads "+N" in gold, a DEBIT "−N" in the body colour
 * — the sign is what distinguishes them, so it is never colour alone. A grant
 * that expires says how long it lasts on a line of its own. */
function CoinRow({
  txn,
  gold,
  divided,
}: Readonly<{ txn: CoinTransaction; gold: string; divided: boolean }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const { formatDate, formatDateTime } = useDateFormat();
  const credit = txn.type === 'CREDIT';
  const label = t(coinLedgerLabelKey(txn));
  const sign = credit ? '+' : '−';
  const amountColor = credit ? gold : '$color';

  return (
    <XStack
      testID={`coin-row-${txn.id}`}
      alignItems="flex-start"
      gap={12}
      paddingVertical={12}
      borderTopWidth={divided ? 1 : 0}
      borderColor="$borderColor"
    >
      <YStack
        width={40}
        height={40}
        borderRadius={20}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name={credit ? 'call-received' : 'call-made'} size={20} color={muted} />
      </YStack>
      <YStack flex={1}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {txn.reason || label}
        </Text>
        <Text fontSize={12} color="$muted">
          {label} · {formatDateTime(txn.created_at)}
        </Text>
        {txn.expires_at ? (
          <Text testID={`coin-row-valid-${txn.id}`} fontSize={12} fontWeight="600" color="$muted">
            {t('mweb.coin.validTill', { vars: { date: formatDate(txn.expires_at) } })}
          </Text>
        ) : null}
      </YStack>
      <Text fontSize={14} fontWeight="700" color={amountColor}>
        {sign}
        {txn.amount}
      </Text>
    </XStack>
  );
}

interface Props {
  transactions: readonly CoinTransaction[];
}

/** The coin ledger — rows inside one card under the section header. RN twin
 * of mWeb's duncit-coin-page/CoinHistoryList. */
export function CoinHistoryList({ transactions }: Readonly<Props>) {
  const { t } = useTranslation();
  const gold = useCoinGold();

  return (
    <YStack gap={10}>
      <SectionHeader title={t('mweb.coin.historyTitle')} />
      <SurfaceCard paddingVertical={4}>
        {transactions.length === 0 ? (
          <Text testID="coin-history-empty" fontSize={14} color="$muted" paddingVertical={12}>
            {t('mweb.coin.historyEmpty')}
          </Text>
        ) : (
          transactions.map((txn, rowIndex) => (
            <CoinRow key={txn.id} txn={txn} gold={gold} divided={rowIndex > 0} />
          ))
        )}
      </SurfaceCard>
    </YStack>
  );
}
