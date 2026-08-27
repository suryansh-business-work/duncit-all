import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { COIN_GOLD_TINT } from '@/constants/coin-gold';
import { useCoinGold } from '@/hooks/useCoins';
import type { CoinRedemption } from '@/hooks/useCoinRedemption';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface RowProps {
  gold: string;
  caption: string;
  children?: ReactNode;
}

/** The gold row itself — icon, title, one line of state, one action. Hoisted so
 * each redemption state below is just a caption and a button. */
function CoinRow({ gold, caption, children }: Readonly<RowProps>) {
  const { t } = useTranslation();
  return (
    <XStack
      testID="coin-redeem"
      alignItems="center"
      justifyContent="space-between"
      gap={8}
      padding={12}
      borderRadius={12}
      backgroundColor={COIN_GOLD_TINT}
      borderWidth={1}
      borderColor={gold}
    >
      <XStack alignItems="center" gap={8} flex={1}>
        <MaterialIcons name="monetization-on" size={18} color={gold} />
        <YStack flex={1}>
          <Text fontSize={13.5} fontWeight="600" color="$color">
            {t('mweb.coin.checkoutTitle')}
          </Text>
          <Text testID="coin-redeem-caption" fontSize={11.5} color="$muted">
            {caption}
          </Text>
        </YStack>
      </XStack>
      {children}
    </XStack>
  );
}

/** Duncit Coin redemption for the payment step — the gold twin of CouponField.
 * Coins cut the gross before GST exactly like the coupon does, so applying is
 * all-or-nothing at the maximum the bill can absorb. RN twin of mWeb's
 * CoinRedeemField. */
export function CoinRedeemField({ coins }: Readonly<{ coins: CoinRedemption }>) {
  const { t } = useTranslation();
  const gold = useCoinGold();

  if (coins.balance <= 0) {
    return <CoinRow gold={gold} caption={t('mweb.coin.checkoutNone')} />;
  }

  if (coins.applied > 0) {
    const removeLabel = t('mweb.coin.checkoutRemove');
    return (
      <CoinRow
        gold={gold}
        caption={t('mweb.coin.checkoutApplied', { vars: { coins: coins.applied } })}
      >
        <XStack
          testID="coin-remove"
          role="button"
          aria-label={removeLabel}
          onPress={coins.onRemove}
          paddingHorizontal={8}
          pressStyle={PRESS_STYLE.inline}
        >
          <Text fontSize={13} fontWeight="700" color={gold}>
            {removeLabel}
          </Text>
        </XStack>
      </CoinRow>
    );
  }

  const applyLabel = t('mweb.coin.checkoutApply');
  const canApply = coins.max > 0;
  return (
    <CoinRow
      gold={gold}
      caption={t('mweb.coin.checkoutAvailable', { vars: { coins: coins.balance } })}
    >
      <XStack
        testID="coin-apply"
        role="button"
        aria-label={applyLabel}
        aria-disabled={!canApply}
        onPress={canApply ? coins.onApply : undefined}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={14}
        height={36}
        borderRadius={999}
        borderWidth={1}
        borderColor={gold}
        opacity={canApply ? 1 : 0.5}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={13} fontWeight="700" color={gold}>
          {applyLabel}
        </Text>
      </XStack>
    </CoinRow>
  );
}
