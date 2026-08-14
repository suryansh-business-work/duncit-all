import { useState } from 'react';
import { Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { Field } from '@/components/Field';
import {
  GiftCardHowItWorks,
  GiftCardRedeemPanel,
  type GiftCardByCode,
} from '@/components/gift-cards';
import { StackScreen } from '@/components/StackScreen';
import { MobileGiftCardByCodeDocument } from '@/graphql/gift-cards';
import { useFinanceCurrency } from '@/hooks/useGiftCards';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

/** Redeem a gift card — code entry, the looked-up card, and the conversion of
 * its full value into Duncit Coins. RN twin of mWeb's /gift-cards/redeem
 * (rule 27); the shared panel is the same one the claim link opens. */
export function GiftCardRedeemScreen() {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const currency = useFinanceCurrency();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [card, setCard] = useState<GiftCardByCode | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const codeLabel = t('mweb.giftCards.codeLabel');
  const checkLabel = t('mweb.giftCards.checkCta');

  const check = async () => {
    const trimmed = code.trim();
    if (!trimmed || checking) return;
    setChecking(true);
    setLookupError(null);
    setCard(null);
    try {
      const data = await graphqlRequest(
        MobileGiftCardByCodeDocument,
        { code: trimmed },
        { auth: true },
      );
      setCard(data.giftCardByCode);
    } catch (e) {
      setLookupError(toErrorMessage(e, t('mweb.giftCards.redeemError')));
    } finally {
      setChecking(false);
    }
  };

  return (
    <StackScreen title={t('mweb.giftCards.redeemTitle')} testID="gift-card-redeem-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16} paddingBottom={48}>
          <Text fontSize={13} color="$muted">
            {t('mweb.giftCards.redeemSubtitle')}
          </Text>
          <Field label={codeLabel} hint={t('mweb.giftCards.codeHint')} testID="gift-card-code">
            <XStack gap={8} alignItems="center">
              <Input
                testID="gift-card-code-input"
                flex={1}
                value={code}
                onChangeText={(next) => setCode(next.toUpperCase())}
                placeholder={codeLabel}
                placeholderTextColor="$muted"
                autoCapitalize="characters"
                aria-label={codeLabel}
                onSubmitEditing={() => {
                  check().catch(() => undefined);
                }}
              />
              <XStack
                testID="gift-card-check"
                role="button"
                aria-label={checkLabel}
                onPress={() => {
                  check().catch(() => undefined);
                }}
                alignItems="center"
                justifyContent="center"
                paddingHorizontal={16}
                height={44}
                borderRadius={10}
                borderWidth={1}
                borderColor="$primary"
                opacity={checking || !code.trim() ? 0.5 : 1}
                pressStyle={{ opacity: 0.8 }}
              >
                {checking ? (
                  <Spinner color={primary} />
                ) : (
                  <Text fontSize={14} fontWeight="600" color="$primary">
                    {checkLabel}
                  </Text>
                )}
              </XStack>
            </XStack>
          </Field>
          {lookupError ? (
            <Text testID="gift-card-lookup-error" fontSize={13} color="$danger">
              {lookupError}
            </Text>
          ) : null}
          {card ? <GiftCardRedeemPanel card={card} currency={currency} /> : null}
          <GiftCardHowItWorks />
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
