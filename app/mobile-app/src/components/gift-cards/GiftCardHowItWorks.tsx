import { Text, XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
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
    <SurfaceCard testID="gift-card-how" gap={12}>
      <SectionHeader title={t('mweb.giftCards.howTitle')} />
      {STEP_KEYS.map((key, index) => (
        <XStack key={key} gap={12} alignItems="flex-start">
          <YStack
            width={24}
            height={24}
            borderRadius={12}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$primarySoft"
          >
            <Text fontSize={12} fontWeight="600" color="$primary">
              {index + 1}
            </Text>
          </YStack>
          <Text flex={1} fontSize={14} color="$color" lineHeight={20}>
            {t(key)}
          </Text>
        </XStack>
      ))}
      <Text fontSize={12} color="$muted">
        {t('mweb.giftCards.howNote')}
      </Text>
    </SurfaceCard>
  );
}
