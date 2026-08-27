import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { GiftCardBuySection, MyGiftCardsList } from '@/components/gift-cards';
import { StackScreen } from '@/components/StackScreen';
import { useFinanceCurrency, useGiftCards } from '@/hooks/useGiftCards';
import { useMe } from '@/hooks/useMe';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import type { GiftCardSelection } from '@/utils/gift-cards';
import { PRESS_STYLE } from '@duncit/buttons-native';

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

  const tabs: readonly { key: TabKey; label: string }[] = [
    { key: 'buy', label: t('mweb.giftCards.buyTab') },
    { key: 'cards', label: t('mweb.giftCards.myCardsTab') },
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16} paddingBottom={48}>
          <XStack gap={8}>
            {tabs.map(({ key, label }) => {
              const isActive = tab === key;
              return (
                <XStack
                  key={key}
                  testID={`gift-cards-tab-${key}`}
                  role="button"
                  aria-label={label}
                  onPress={() => setTab(key)}
                  paddingHorizontal={16}
                  paddingVertical={8}
                  borderRadius={999}
                  borderWidth={1}
                  borderColor={isActive ? '$primary' : '$borderColor'}
                  backgroundColor={isActive ? '$primary' : 'transparent'}
                  pressStyle={PRESS_STYLE.control}
                >
                  <Text fontSize={13} fontWeight="700" color={isActive ? '$onPrimary' : '$color'}>
                    {label}
                  </Text>
                </XStack>
              );
            })}
          </XStack>
          {body}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
