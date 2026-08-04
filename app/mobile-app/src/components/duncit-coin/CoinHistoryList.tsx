import { Separator, Text, XStack, YStack } from 'tamagui';

import { useCoinGold } from '@/hooks/useCoins';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { CoinTransaction } from '@/stores/coin.store';

/** One ledger row. A CREDIT reads "+N" in gold, a DEBIT "−N" in the body colour
 * — the sign is what distinguishes them, so it is never colour alone. */
function CoinRow({ txn, gold }: Readonly<{ txn: CoinTransaction; gold: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const credit = txn.type === 'CREDIT';
  const label = credit ? t('mweb.coin.earned') : t('mweb.coin.redeemed');
  const sign = credit ? '+' : '−';
  const amountColor = credit ? gold : '$color';

  return (
    <XStack testID={`coin-row-${txn.id}`} alignItems="flex-start" gap={8} paddingVertical={10}>
      <YStack flex={1}>
        <Text fontSize={13.5} fontWeight="600" color="$color">
          {txn.reason || label}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {label} · {formatDateTime(txn.created_at)}
        </Text>
      </YStack>
      <Text fontSize={13.5} fontWeight="700" color={amountColor}>
        {sign}
        {txn.amount}
      </Text>
    </XStack>
  );
}

interface Props {
  transactions: readonly CoinTransaction[];
}

/** The coin ledger — RN twin of mWeb's duncit-coin-page/CoinHistoryList. */
export function CoinHistoryList({ transactions }: Readonly<Props>) {
  const { t } = useTranslation();
  const gold = useCoinGold();

  if (transactions.length === 0) {
    return (
      <YStack gap={8}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('mweb.coin.historyTitle')}
        </Text>
        <Text testID="coin-history-empty" fontSize={13} color="$muted">
          {t('mweb.coin.historyEmpty')}
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap={8}>
      <Text fontSize={14} fontWeight="600" color="$color">
        {t('mweb.coin.historyTitle')}
      </Text>
      <YStack>
        {transactions.map((txn, index) => (
          <YStack key={txn.id}>
            {index > 0 ? <Separator borderColor="$borderColor" /> : null}
            <CoinRow txn={txn} gold={gold} />
          </YStack>
        ))}
      </YStack>
    </YStack>
  );
}
