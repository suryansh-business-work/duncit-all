import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { CoinCheckoutSummary } from '@duncit/utils';

import { COIN_GOLD_TINT } from '@/constants/coin-gold';
import { useCoinGold } from '@/hooks/useCoins';
import { useTranslation } from '@/hooks/useTranslation';

function CoinRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text fontSize={12} color="$muted">
        {label}
      </Text>
      <Text fontSize={12} fontWeight="700" color="$color">
        {value}
      </Text>
    </XStack>
  );
}

/**
 * The Duncit Coin block under the payable — what this purchase spends, what is
 * left afterwards, and what it pays back. Tamagui twin of mWeb's
 * CoinSummaryRows (rule 27), rendering the same three numbers from the same
 * shared `coinCheckoutSummary`.
 */
export function CoinSummaryRows({ coins }: Readonly<{ coins?: CoinCheckoutSummary | null }>) {
  const { t } = useTranslation();
  const gold = useCoinGold();
  if (!coins?.hasAny) return null;

  return (
    <YStack
      testID="coin-summary"
      marginTop={8}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor={gold}
      backgroundColor={COIN_GOLD_TINT}
      gap={2}
    >
      <XStack alignItems="center" gap={6} marginBottom={2}>
        <MaterialIcons name="monetization-on" size={16} color={gold} />
        <Text fontSize={13} fontWeight="700" color="$color">
          {t('mweb.coin.checkoutTitle')}
        </Text>
      </XStack>
      {coins.used > 0 ? (
        <CoinRow label={t('mweb.coin.checkoutUsed')} value={`− ${coins.used}`} />
      ) : null}
      <CoinRow label={t('mweb.coin.checkoutRemaining')} value={String(coins.remaining)} />
      {coins.earning > 0 ? (
        <CoinRow label={t('mweb.coin.checkoutEarning')} value={`+ ${coins.earning}`} />
      ) : null}
    </YStack>
  );
}
