import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

import { GiftCardBuySection, MyGiftCardsList } from '@/components/gift-cards';
import { GiftCardSegmented, type SegmentOption } from '@/components/gift-cards/GiftCardSegmented';
import { StackScreen } from '@/components/StackScreen';
import { useFinanceCurrency, useGiftCards } from '@/hooks/useGiftCards';
import { useMe } from '@/hooks/useMe';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import type { GiftCardSelection } from '@/utils/gift-cards';
import { RefreshScrollView } from '@/components/PullToRefresh';

type TabKey = 'buy' | 'cards';

/**
 * Gift Cards — the Buy tab (theme, amount, recipient, how-it-works) and the
 * My cards tab (held + gifted cards with copy/share). RN twin of mWeb's
 * /gift-cards page (rule 27); reached through the flag-gated sidebar section.
 */
export function GiftCardsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    settings,
    categories,
    isLoading,
    hasError,
    cards,
    cardsLoading,
    cardsError,
    refreshCards,
  } = useGiftCards();
  const currency = useFinanceCurrency();
  const { data: meData } = useMe();
  const senderName = meData?.me?.full_name ?? '';
  const [tab, setTab] = useState<TabKey>('buy');

  // Re-read the cards every time the tab is opened, so a purchase made in this
  // session shows without a cold restart.
  useEffect(() => {
    if (tab !== 'cards') return;
    refreshCards().catch(() => undefined);
  }, [tab, refreshCards]);

  const tabs: readonly SegmentOption<TabKey>[] = [
    { value: 'buy', label: t('mweb.giftCards.buyTab'), testID: 'gift-cards-tab-buy' },
    { value: 'cards', label: t('mweb.giftCards.myCardsTab'), testID: 'gift-cards-tab-cards' },
  ];

  const onContinue = (selection: GiftCardSelection) => {
    navigation.navigate('GiftCardCheckout', { selection });
  };

  let body;
  if (tab === 'cards') {
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
      <Text testID="gift-cards-buy-error" fontSize={13} color="$danger">
        {t('mweb.giftCards.loadError')}
      </Text>
    );
  } else if (isLoading || !settings) {
    body = (
      <YStack alignItems="center" paddingVertical={32}>
        <Spinner testID="gift-cards-buy-loading" size="large" color="$primary" />
      </YStack>
    );
  } else {
    body = (
      <GiftCardBuySection
        settings={settings}
        categories={categories}
        currency={currency}
        onContinue={onContinue}
      />
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
