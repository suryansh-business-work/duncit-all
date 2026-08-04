import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { COIN_GOLD_TINT } from '@/constants/coin-gold';
import { useCoinGold } from '@/hooks/useCoins';
import { useTranslation } from '@/hooks/useTranslation';
import type { CoinBalance } from '@/stores/coin.store';

interface Props {
  balance: CoinBalance | null;
  currencySymbol: string;
}

/** The gold hero card: current balance, lifetime earned and the live rate — RN
 * twin of mWeb's duncit-coin-page/CoinBalanceCard. */
export function CoinBalanceCard({ balance, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const gold = useCoinGold();

  return (
    <YStack
      testID="coin-balance-card"
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor={gold}
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={12}>
        <YStack
          width={52}
          height={52}
          alignItems="center"
          justifyContent="center"
          borderRadius={16}
          backgroundColor={COIN_GOLD_TINT}
        >
          <MaterialIcons name="monetization-on" size={30} color={gold} />
        </YStack>
        <YStack flex={1}>
          <Text fontSize={13} color="$muted">
            {t('mweb.coin.balanceLabel')}
          </Text>
          <Text testID="coin-balance-value" fontSize={30} fontWeight="700" color={gold}>
            {balance?.balance ?? 0}
          </Text>
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="space-between" marginTop={16}>
        <Text fontSize={13} color="$muted">
          {t('mweb.coin.lifetimeLabel')}
        </Text>
        <Text fontSize={13} fontWeight="600" color="$color">
          {balance?.lifetime_earned ?? 0}
        </Text>
      </XStack>
      <Text fontSize={11.5} color="$muted" marginTop={12}>
        {t('mweb.coin.rateNote', {
          vars: { pct: balance?.earn_pct ?? 0, symbol: currencySymbol },
        })}
      </Text>
    </YStack>
  );
}
