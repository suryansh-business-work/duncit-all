import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

interface Props {
  /** Coins credited by THIS redemption — 0 when the card had already paid out. */
  coinsAdded: number;
  coinBalance: number;
}

/**
 * What every redemption ends on — an emailed code (Redeem and Claim screens) or
 * a printed card: the coins added, the new balance, and the way to the coins.
 * One card, so the two doors can never report a redemption differently. mWeb
 * twin: gift-cards-page/GiftCardRedeemSuccess.
 */
export function GiftCardRedeemSuccess({ coinsAdded, coinBalance }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // A repeat redemption by the same holder is a no-op reporting 0 coins.
  const body =
    coinsAdded > 0
      ? t('mweb.giftCards.redeemSuccessBody', { vars: { coins: coinsAdded, balance: coinBalance } })
      : t('mweb.giftCards.redeemAlreadyBody');
  // The button that was pressed is gone with the form it sat in, and a screen
  // reader never hears text that appears away from its focus (WCAG 4.1.3).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(body);
  }, [body]);

  return (
    <SurfaceCard testID="gift-card-redeem-success" alignItems="center" gap={12} padding={24}>
      <YStack
        width={72}
        height={72}
        borderRadius={36}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primarySoft"
      >
        <MaterialIcons name="check" size={40} color={accent} />
      </YStack>
      <Text role="heading" fontSize={20} fontWeight="600" color="$color" textAlign="center">
        {t('mweb.giftCards.redeemSuccessTitle')}
      </Text>
      <Text fontSize={14} color="$muted" textAlign="center">
        {body}
      </Text>
      <YStack alignSelf="stretch" marginTop={8}>
        <PrimaryButton
          testID="gift-card-go-to-coins"
          label={t('mweb.giftCards.goToCoins')}
          onPress={() => navigation.navigate('DuncitCoin')}
        />
      </YStack>
    </SurfaceCard>
  );
}
