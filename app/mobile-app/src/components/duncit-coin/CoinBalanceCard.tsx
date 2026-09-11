import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { COIN_GOLD_TINT } from '@/constants/coin-gold';
import { useCoinGold } from '@/hooks/useCoins';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CoinLedgerBalance } from '@/stores/coin.store';

interface Props {
  balance: CoinLedgerBalance | null;
  currencySymbol: string;
}

/** The soonest batch of coins to lapse, stated under the balance it will leave.
 * The icon carries the warning tint; the words stay body-coloured for contrast. */
function CoinExpiryNote({ coins, at }: Readonly<{ coins: number; at: string }>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { warning } = useThemeColors();
  return (
    <XStack testID="coin-next-expiry" alignItems="center" gap={4} marginTop={4}>
      <MaterialIcons name="hourglass-bottom" size={14} color={warning} />
      <Text fontSize={11.5} fontWeight="600" color="$color">
        {t('mweb.coin.nextExpiry', { vars: { coins, date: formatDate(at) } })}
      </Text>
    </XStack>
  );
}

/** The gold hero card: current balance, the next coins to expire, lifetime
 * earned and the live rate — RN twin of mWeb's duncit-coin-page/CoinBalanceCard. */
export function CoinBalanceCard({ balance, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const gold = useCoinGold();
  // Finance can switch the feedback reward off, and a line reading "You earn 0
  // Duncit Coins" promises nothing — so the rate decides whether it is stated.
  const feedbackCoins = balance?.pod_feedback_coins ?? 0;
  // The same rule for expiry: nothing due to lapse means nothing to say.
  const expiringCoins = balance?.expiring_coins ?? 0;
  const nextExpiryAt = balance?.next_expiry_at;

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
          {expiringCoins > 0 && nextExpiryAt ? (
            <CoinExpiryNote coins={expiringCoins} at={nextExpiryAt} />
          ) : null}
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
          vars: {
            pct: balance?.earn_pct ?? 0,
            shopPct: balance?.shop_earn_pct ?? 0,
            symbol: currencySymbol,
          },
        })}
      </Text>
      {feedbackCoins > 0 ? (
        <Text testID="coin-feedback-rate" fontSize={11.5} color="$muted" marginTop={4}>
          {t('mweb.coin.feedbackRateNote', { vars: { coins: feedbackCoins } })}
        </Text>
      ) : null}
    </YStack>
  );
}
