import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { PrimaryButton } from '@/components/PrimaryButton';
import { GiftCardStatus } from '@/generated/graphql/graphql';
import { MobileGiftCardByCodeDocument, MobileRedeemGiftCardDocument } from '@/graphql/gift-cards';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import type { RootStackParamList } from '@/navigation/types';
import { formatMoney } from '@/utils/checkout-math';
import { formatDate } from '@/utils/date-format';
import { toErrorMessage } from '@/utils/errors';
import { GiftCardVisual } from './GiftCardVisual';

export type GiftCardByCode = ResultOf<typeof MobileGiftCardByCodeDocument>['giftCardByCode'];
type RedeemResult = ResultOf<typeof MobileRedeemGiftCardDocument>['redeemGiftCard'];

interface Props {
  card: GiftCardByCode;
  currency: string;
}

/**
 * The looked-up card and everything redeeming it can end in — shared by the
 * Redeem (code entry) and Claim (shared link) screens so the two can never
 * disagree. EXPIRED/REDEEMED cards state why there is no button; redeeming an
 * ACTIVE card converts the full value into Duncit Coins (rule 27 twin).
 */
export function GiftCardRedeemPanel({ card, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redeem = async () => {
    setRedeeming(true);
    setError(null);
    try {
      const data = await graphqlRequest(
        MobileRedeemGiftCardDocument,
        { code: card.code },
        { auth: true },
      );
      setResult(data.redeemGiftCard);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.giftCards.redeemError')));
    } finally {
      setRedeeming(false);
    }
  };

  if (result) {
    const body =
      result.coins_added > 0
        ? t('mweb.giftCards.redeemSuccessBody', {
            vars: { coins: result.coins_added, balance: result.coin_balance },
          })
        : t('mweb.giftCards.redeemAlreadyBody');
    return (
      <YStack testID="gift-card-redeem-success" alignItems="center" gap={12} paddingVertical={12}>
        <MaterialIcons name="check-circle" size={56} color={semantic.success} />
        <Text fontSize={18} fontWeight="700" color="$color" textAlign="center">
          {t('mweb.giftCards.redeemSuccessTitle')}
        </Text>
        <Text fontSize={13.5} color="$muted" textAlign="center">
          {body}
        </Text>
        <PrimaryButton
          testID="gift-card-go-to-coins"
          label={t('mweb.giftCards.goToCoins')}
          onPress={() => navigation.navigate('DuncitCoin')}
        />
      </YStack>
    );
  }

  let footer;
  if (card.status === GiftCardStatus.Expired) {
    footer = (
      <Text testID="gift-card-expired" fontSize={13} color="$danger">
        {t('mweb.giftCards.claimExpiredBody')}
      </Text>
    );
  } else if (card.status === GiftCardStatus.Redeemed) {
    footer = (
      <Text testID="gift-card-redeemed" fontSize={13} color="$muted">
        {t('mweb.giftCards.claimRedeemedBody')}
      </Text>
    );
  } else {
    footer = (
      <YStack gap={8}>
        <Text fontSize={12} color="$muted">
          {t('mweb.giftCards.validUntil', { vars: { date: formatDate(card.expires_at) } })}
        </Text>
        <PrimaryButton
          testID="gift-card-redeem-cta"
          label={t('mweb.giftCards.redeemCta')}
          loading={redeeming}
          onPress={() => {
            redeem().catch(() => undefined);
          }}
        />
      </YStack>
    );
  }

  return (
    <YStack testID="gift-card-redeem-panel" gap={10}>
      <GiftCardVisual
        theme={card}
        imageUrl={card.scope_image_url}
        artworkFrontUrl={card.scope_image_front_url}
        artworkBackUrl={card.scope_image_back_url}
        amountLabel={formatMoney(currency, card.initial_amount)}
      />
      {card.sender_name ? (
        <XStack alignItems="center" gap={6}>
          <MaterialIcons name="card-giftcard" size={16} color={semantic.success} />
          <Text testID="gift-card-sender" fontSize={13} fontWeight="600" color="$color">
            {t('mweb.giftCards.claimFrom', { vars: { sender: card.sender_name } })}
          </Text>
        </XStack>
      ) : null}
      {card.message ? (
        <Text testID="gift-card-message" fontSize={13} fontStyle="italic" color="$muted">
          {card.message}
        </Text>
      ) : null}
      {footer}
      {error ? (
        <Text testID="gift-card-redeem-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
