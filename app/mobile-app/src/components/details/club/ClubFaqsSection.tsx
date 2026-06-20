import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Faq {
  question: string;
  answer: string;
}

/** Admin-authored FAQs as expandable question/answer pairs. */
export function ClubFaqsSection({ faqs }: Readonly<{ faqs: Faq[] }>) {
  const [open, setOpen] = useState<string | null>(null);
  const { color } = useThemeColors();
  if (faqs.length === 0) return null;
  return (
    <YStack gap={8} testID="club-faqs">
      <Text fontSize={16} fontWeight="900" color="$color">
        FAQs
      </Text>
      {faqs.map((faq) => {
        const expanded = open === faq.question;
        return (
          <YStack
            key={faq.question}
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius={12}
            padding={12}
            backgroundColor="$surface"
          >
            <XStack
              testID={`club-faq-${faq.question}`}
              role="button"
              aria-label={faq.question}
              onPress={() => setOpen(expanded ? null : faq.question)}
              alignItems="center"
              justifyContent="space-between"
              gap={8}
            >
              <Text flex={1} fontSize={14} fontWeight="800" color="$color">
                {faq.question}
              </Text>
              <MaterialIcons
                name={expanded ? 'expand-less' : 'expand-more'}
                size={20}
                color={color}
              />
            </XStack>
            {expanded ? (
              <Text marginTop={8} fontSize={13} color="$muted" lineHeight={19}>
                {faq.answer}
              </Text>
            ) : null}
          </YStack>
        );
      })}
    </YStack>
  );
}
