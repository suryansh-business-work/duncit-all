import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { FaqItem } from '@/hooks/useLibrary';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { useTranslation } from '@/hooks/useTranslation';

interface FrequentlyAskedTileProps {
  faq: FaqItem;
  onOpen: (faq: FaqItem) => void;
}

/** A single card for a top FAQ — the help icon on a soft disc, then the question. */
function FrequentlyAskedTile({ faq, onOpen }: Readonly<FrequentlyAskedTileProps>) {
  const { accent } = useThemeColors();
  return (
    <SurfaceCard
      testID={`faq-card-${faq.id}`}
      role="button"
      aria-label={faq.question}
      onPress={() => onOpen(faq)}
      width={190}
      minHeight={130}
      justifyContent="space-between"
      gap={12}
      pressStyle={PRESS_STYLE.surface}
    >
      <YStack
        width={36}
        height={36}
        borderRadius={18}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name="help-outline" size={20} color={accent} />
      </YStack>
      <Text fontSize={15} fontWeight="600" color="$color" lineHeight={19}>
        {faq.question}
      </Text>
    </SurfaceCard>
  );
}

interface FrequentlyAskedProps {
  faqs: FaqItem[];
  onOpen: (faq: FaqItem) => void;
}

/** Horizontal row of "Frequently Asked" cards (top FAQs). RN twin of mWeb's
 * FrequentlyAsked. */
export function FrequentlyAsked({ faqs, onOpen }: Readonly<FrequentlyAskedProps>) {
  const { t } = useTranslation();
  if (faqs.length === 0) return null;
  return (
    <YStack gap={12}>
      <SectionHeader title={t('mweb.supportHub.frequentlyAsked')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingVertical: 2 }}
      >
        {faqs.map((faq) => (
          <FrequentlyAskedTile key={faq.id} faq={faq} onOpen={onOpen} />
        ))}
      </ScrollView>
    </YStack>
  );
}
