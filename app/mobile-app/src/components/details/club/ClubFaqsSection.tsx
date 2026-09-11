import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Faq {
  question: string;
  answer: string;
}

/** Admin-authored FAQs as expandable question/answer pairs — each its own
 * surface card. mWeb twin: club-details-page/ClubFaqsSection. */
export function ClubFaqsSection({ faqs }: Readonly<{ faqs: Faq[] }>) {
  const [open, setOpen] = useState<string | null>(null);
  const { muted } = useThemeColors();
  if (faqs.length === 0) return null;
  return (
    <YStack gap={8} testID="club-faqs">
      <SectionHeader title="FAQs" />
      {faqs.map((faq) => {
        const expanded = open === faq.question;
        return (
          <SurfaceCard key={faq.question} paddingVertical={14}>
            <XStack
              pressStyle={PRESS_STYLE.surface}
              testID={`club-faq-${faq.question}`}
              role="button"
              aria-label={faq.question}
              onPress={() => setOpen(expanded ? null : faq.question)}
              alignItems="center"
              justifyContent="space-between"
              gap={8}
            >
              <Text flex={1} fontSize={14} fontWeight="600" color="$color">
                {faq.question}
              </Text>
              <MaterialIcons
                name={expanded ? 'expand-less' : 'expand-more'}
                size={22}
                color={muted}
              />
            </XStack>
            {expanded ? (
              <Text marginTop={8} fontSize={14} color="$muted" lineHeight={20}>
                {faq.answer}
              </Text>
            ) : null}
          </SurfaceCard>
        );
      })}
    </YStack>
  );
}
