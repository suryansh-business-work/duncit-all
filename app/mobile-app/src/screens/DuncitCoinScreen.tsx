import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { CoinBalanceCard, CoinHistoryList } from '@/components/duncit-coin';
import { useCoinLedger } from '@/hooks/useCoins';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useTranslation } from '@/hooks/useTranslation';

/** Duncit Coin — the consumer's loyalty balance and its full ledger. Coins are
 * earned on every successful payment and spent at checkout. RN twin of mWeb's
 * DuncitCoinPage. */
export function DuncitCoinScreen() {
  const { t } = useTranslation();
  const { balance, transactions, isLoading, error } = useCoinLedger();
  const { currency } = usePublicFinance();
  const pending = isLoading && !balance;

  return (
    <StackScreen title={t('mweb.coin.title')} testID="duncit-coin-screen">
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16} paddingBottom={48}>
          {error ? (
            <Text testID="coin-error" fontSize={13} color="$danger">
              {t('mweb.coin.loadError')}
            </Text>
          ) : null}

          <CoinBalanceCard balance={balance} currencySymbol={currency} />

          {pending ? (
            <YStack alignItems="center" paddingVertical={24}>
              <Spinner testID="coin-loading" color="$primary" />
            </YStack>
          ) : (
            <CoinHistoryList transactions={transactions} />
          )}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
