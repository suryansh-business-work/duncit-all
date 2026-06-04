import { useState } from 'react';
import { ScrollView, Text, YStack } from 'tamagui';

import { Accordion } from '@/components/details/Accordion';
import { DetailSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { useFaqs } from '@/hooks/useLibrary';

/** FAQs — grouped questions in collapsible accordions. */
export function FaqsScreen() {
  const { groups, isLoading } = useFaqs();
  const [openId, setOpenId] = useState<string | null>(null);
  const total = groups.reduce((n, g) => n + g.faqs.length, 0);

  return (
    <StackScreen title="FAQs" testID="faqs-screen">
      {isLoading && total === 0 ? (
        <DetailSkeleton testID="faqs-loading" />
      ) : total === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
          <Text testID="faqs-empty" color="$muted">
            No FAQs yet.
          </Text>
        </YStack>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {groups.map((group) => (
            <YStack key={group.super_category?.id ?? 'general'} gap={6} marginBottom={14}>
              <Text fontSize={13} fontWeight="900" color="$muted" textTransform="uppercase">
                {group.super_category?.name ?? 'General'}
              </Text>
              {group.faqs.map((faq) => (
                <Accordion
                  key={faq.id}
                  title={faq.question}
                  icon="help-outline"
                  open={openId === faq.id}
                  onToggle={() => setOpenId((id) => (id === faq.id ? null : faq.id))}
                  testID={`faq-${faq.id}`}
                >
                  <Text fontSize={13.5} color="$color" lineHeight={20}>
                    {faq.answer}
                  </Text>
                </Accordion>
              ))}
            </YStack>
          ))}
        </ScrollView>
      )}
    </StackScreen>
  );
}
