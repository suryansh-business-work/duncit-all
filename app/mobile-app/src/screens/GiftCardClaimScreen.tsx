import { useEffect, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { GiftCardRedeemPanel, type GiftCardByCode } from '@/components/gift-cards';
import { StackScreen } from '@/components/StackScreen';
import { MobileGiftCardByCodeDocument } from '@/graphql/gift-cards';
import { useFinanceCurrency } from '@/hooks/useGiftCards';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

/** The claim page a shared /gift-card/CODE link opens — the card, who sent it,
 * their message, and the same redeem panel the Redeem screen uses. RN twin of
 * mWeb's /gift-card/:code (rule 27). */
export function GiftCardClaimScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, 'GiftCardClaim'>>();
  const code = route.params.code;
  const currency = useFinanceCurrency();
  const [card, setCard] = useState<GiftCardByCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    graphqlRequest(MobileGiftCardByCodeDocument, { code }, { auth: true })
      .then((data) => active && setCard(data.giftCardByCode))
      .catch((e) => active && setError(toErrorMessage(e, t('mweb.giftCards.redeemError'))))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
    // `t` is stable enough for an error fallback; the lookup re-runs per code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  let body;
  if (isLoading) {
    body = (
      <YStack alignItems="center" paddingVertical={32}>
        <Spinner testID="gift-card-claim-loading" size="large" color="$primary" />
      </YStack>
    );
  } else if (error) {
    body = (
      <Text testID="gift-card-claim-error" fontSize={13} color="$danger">
        {error}
      </Text>
    );
  } else if (card) {
    body = <GiftCardRedeemPanel card={card} currency={currency} />;
  } else {
    body = (
      <Text testID="gift-card-claim-missing" fontSize={13} color="$muted">
        {t('mweb.giftCards.redeemError')}
      </Text>
    );
  }

  return (
    <StackScreen title={t('mweb.giftCards.title')} testID="gift-card-claim-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16} paddingBottom={48}>
          {body}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
