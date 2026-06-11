import { useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, Text, XStack, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { Accordion } from '@/components/details/Accordion';
import { DetailSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { useFaqs, type FaqGroup } from '@/hooks/useLibrary';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Keeps only the groups (and their questions) whose question or answer text
 * matches the query — mirrors mWeb's FAQ search. */
function filterFaqGroups(groups: FaqGroup[], query: string): FaqGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((group) => ({
      ...group,
      faqs: group.faqs.filter(
        (faq) => faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q),
      ),
    }))
    .filter((group) => group.faqs.length > 0);
}

/** FAQs — searchable, grouped questions in collapsible accordions. */
export function FaqsScreen() {
  const { groups, isLoading } = useFaqs();
  const { muted } = useThemeColors();
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const total = groups.reduce((n, g) => n + g.faqs.length, 0);
  const toggleFaq = (id: string) => setOpenId((cur) => (cur === id ? null : id));
  const filteredGroups = useMemo(() => filterFaqGroups(groups, search), [groups, search]);

  if (isLoading && total === 0) {
    return (
      <StackScreen title="FAQs" testID="faqs-screen">
        <DetailSkeleton testID="faqs-loading" />
      </StackScreen>
    );
  }

  if (total === 0) {
    return (
      <StackScreen title="FAQs" testID="faqs-screen">
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
          <Text testID="faqs-empty" color="$muted">
            No FAQs yet.
          </Text>
        </YStack>
      </StackScreen>
    );
  }

  return (
    <StackScreen title="FAQs" testID="faqs-screen">
      <XStack
        alignItems="center"
        gap={8}
        margin={16}
        marginBottom={4}
        paddingHorizontal={12}
        height={44}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      >
        <MaterialIcons name="search" size={18} color={muted} />
        <Input
          testID="faqs-search"
          flex={1}
          unstyled
          value={search}
          onChangeText={setSearch}
          placeholder="Search questions, e.g. refund, host"
          placeholderTextColor="$muted"
          color="$color"
          fontSize={14}
        />
      </XStack>
      {filteredGroups.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
          <Text testID="faqs-no-match" color="$muted">
            No FAQs match your search.
          </Text>
        </YStack>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 24 }}>
          {filteredGroups.map((group, groupIndex) => (
            <Reveal key={group.super_category?.id ?? 'general'} index={groupIndex}>
              <YStack gap={6} marginBottom={14}>
                <Text fontSize={13} fontWeight="900" color="$muted" textTransform="uppercase">
                  {group.super_category?.name ?? 'General'}
                </Text>
                {group.faqs.map((faq) => (
                  <Accordion
                    key={faq.id}
                    title={faq.question}
                    icon="help-outline"
                    open={openId === faq.id}
                    onToggle={() => toggleFaq(faq.id)}
                    testID={`faq-${faq.id}`}
                  >
                    <Text fontSize={13.5} color="$color" lineHeight={20}>
                      {faq.answer}
                    </Text>
                  </Accordion>
                ))}
              </YStack>
            </Reveal>
          ))}
        </ScrollView>
      )}
    </StackScreen>
  );
}
