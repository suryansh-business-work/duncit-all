import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

/** Step keys in order (full literal keys — never composed). */
const STEP_KEYS = [
  'mweb.giftCards.howStep1',
  'mweb.giftCards.howStep2',
  'mweb.giftCards.howStep3',
  'mweb.giftCards.howStep4',
] as const;

/** The "How gift cards work" instruction block shown on the buy and redeem
 * pages — identical copy to mWeb (rule 27). */
export function GiftCardHowItWorks() {
  const { t } = useTranslation();

  return (
    <YStack
      testID="gift-card-how"
      gap={8}
      padding={14}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={14} fontWeight="700" color="$color">
        {t('mweb.giftCards.howTitle')}
      </Text>
      {STEP_KEYS.map((key, index) => (
        <XStack key={key} gap={8} alignItems="flex-start">
          <Text fontSize={12.5} fontWeight="700" color="$primary">
            {index + 1}.
          </Text>
          <Text flex={1} fontSize={12.5} color="$color">
            {t(key)}
          </Text>
        </XStack>
      ))}
      <Text fontSize={11.5} color="$muted">
        {t('mweb.giftCards.howNote')}
      </Text>
    </YStack>
  );
}
