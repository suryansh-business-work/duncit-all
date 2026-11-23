import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

import { GiftCardBuySection, GiftCardOrdersList, MyGiftCardsList } from '@/components/gift-cards';
import { GiftCardSegmented, type SegmentOption } from '@/components/gift-cards/GiftCardSegmented';
import { StackScreen } from '@/components/StackScreen';
import { useLoadingRegion } from '@/components/Skeleton';
import { useFinanceCurrency, useGiftCards } from '@/hooks/useGiftCards';
import { useMe } from '@/hooks/useMe';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import type { GiftCardSelection } from '@/utils/gift-cards';
import { RefreshScrollView } from '@/components/PullToRefresh';

type TabKey = 'buy' | 'cards' | 'orders';

/**
 * Gift Cards — the Buy tab (the one card: amount, quantity, email or printed,
 * recipient, how-it-works), the My cards tab (held + gifted cards with
 * copy/share) and the Orders tab (every order with its tracking). RN twin of
 * mWeb's /gift-cards page (rule 27); reached through the flag-gated sidebar.
 */
export function GiftCardsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { storefront, isLoading, hasError, cards, cardsLoading, cardsError, refreshCards } =
    useGiftCards();
  const currency = useFinanceCurrency();
  const { data: meData } = useMe();
  const senderName = meData?.me?.full_name ?? '';
  const [tab, setTab] = useState<TabKey>('buy');
  const loadingRegion = useLoadingRegion();

  // Re-read the cards every time the tab is opened, so a purchase made in this
  // session shows without a cold restart.
  useEffect(() => {
    if (tab !== 'cards') return;
    refreshCards().catch(() => undefined);
  }, [tab, refreshCards]);

  const tabs: readonly SegmentOption<TabKey>[] = [
    { value: 'buy', label: t('mweb.giftCards.buyTab'), testID: 'gift-cards-tab-buy' },
    { value: 'cards', label: t('mweb.giftCards.myCardsTab'), testID: 'gift-cards-tab-cards' },
    { value: 'orders', label: t('mweb.giftCards.ordersTab'), testID: 'gift-cards-tab-orders' },
  ];

  const onContinue = (selection: GiftCardSelection) => {
    navigation.navigate('GiftCardCheckout', { selection });
  };

  let body;
  if (tab === 'orders') {
    body = (
      <GiftCardOrdersList onOpen={(orderNo) => navigation.navigate('GiftCardOrder', { orderNo })} />
    );
  } else if (tab === 'cards') {
    body = (
      <MyGiftCardsList
        cards={cards}
        loading={cardsLoading}
        error={cardsError}
        currency={currency}
        senderName={senderName}
      />
    );
  } else if (hasError) {
    body = (
      <Text testID="gift-cards-buy-error" role="alert" fontSize={13} color="$danger">
        {t('mweb.giftCards.loadError')}
      </Text>
    );
  } else if (isLoading || !storefront) {
    body = (
      <YStack alignItems="center" paddingVertical={32}>
        <Spinner testID="gift-cards-buy-loading" size="large" color="$primary" {...loadingRegion} />
      </YStack>
    );
  } else {
    body = storefront.design ? (
      <GiftCardBuySection
        storefront={storefront}
        design={storefront.design}
        onContinue={onContinue}
      />
    ) : (
      <Text testID="gift-cards-unavailable" fontSize={14} color="$muted">
        {t('mweb.giftCards.unavailable')}
      </Text>
    );
  }

  return (
    <StackScreen title={t('mweb.giftCards.title')} testID="gift-cards-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={20} padding={16} paddingBottom={48}>
          <GiftCardSegmented options={tabs} value={tab} onChange={setTab} />
          {body}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
