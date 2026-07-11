import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, YStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton';
import { useFaqs, type FaqItem } from '@/hooks/useLibrary';
import type { RootStackParamList } from '@/navigation/types';
import { FaqAnswerModal } from './FaqAnswerModal';
import { FaqSearch } from './FaqSearch';
import { FrequentlyAsked } from './FrequentlyAsked';
import { StartConversation } from './StartConversation';
import { SupportMoreWays } from './SupportMoreWays';
import { SupportTopics } from './SupportTopics';
import type { SupportSection } from './supportSections';

const TOP_FAQ_COUNT = 6;

/** FAQ-forward help center: hero + debounced search, then (when not searching)
 * the top FAQs and topic list, a Start-a-conversation CTA, and the remaining
 * support tools. RN twin of mWeb's SupportHubPage. */
export function SupportHelpCenter() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { groups, isLoading, error } = useFaqs();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FaqItem | null>(null);

  const topFaqs = useMemo(() => groups.flatMap((g) => g.faqs).slice(0, TOP_FAQ_COUNT), [groups]);
  const searching = query.trim().length > 0;
  const showLoading = !searching && isLoading;
  const showBrowse = !searching && !isLoading;

  const startChat = () => navigation.navigate('ChatWithUs');
  const openTopic = () => navigation.navigate('Faqs');
  const openMoreWay = (section: SupportSection) => navigation.navigate(section.route as 'Sos');
  const answerFromModal = () => {
    setSelected(null);
    startChat();
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <YStack gap={4}>
          <Text testID="support-hero-title" fontSize={22} fontWeight="900" color="$color">
            Have a burning question?
          </Text>
          <Text fontSize={13.5} color="$muted">
            Search our help center or talk to us
          </Text>
        </YStack>

        <FaqSearch query={query} onQueryChange={setQuery} onOpen={setSelected} />

        {error ? (
          <Text testID="support-error" fontSize={13} color="$danger">
            We couldn&apos;t load help topics right now.
          </Text>
        ) : null}

        {showLoading ? (
          <YStack testID="support-loading" gap={12}>
            <Skeleton height={130} radius={18} />
            <Skeleton height={160} radius={16} />
          </YStack>
        ) : null}

        {showBrowse ? (
          <>
            <FrequentlyAsked faqs={topFaqs} onOpen={setSelected} />
            <SupportTopics groups={groups} onOpenTopic={openTopic} />
          </>
        ) : null}

        <StartConversation onPress={startChat} />
        <SupportMoreWays onNavigate={openMoreWay} />
      </ScrollView>

      <FaqAnswerModal
        faq={selected}
        onClose={() => setSelected(null)}
        onStartChat={answerFromModal}
      />
    </>
  );
}
