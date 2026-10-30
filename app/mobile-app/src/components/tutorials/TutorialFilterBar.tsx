import { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { TUTORIAL_LANGUAGE_OPTIONS, type TutorialFilters, type TutorialLanguageCode } from '@duncit/utils';

import { PillTabs, type PillTab } from '@/components/PillTabs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { TutorialTopic } from '@/hooks/useTutorialFeed';

type LanguageTab = TutorialLanguageCode | 'all';

const LANGUAGE_TABS: readonly PillTab<LanguageTab>[] = [
  { key: 'all', labelKey: 'mweb.tutorials.allTopics' },
  ...TUTORIAL_LANGUAGE_OPTIONS.map((option) => ({ key: option.value, labelKey: option.labelKey })),
];

interface Props {
  filters: TutorialFilters;
  topics: readonly TutorialTopic[];
  onChange: (next: Partial<TutorialFilters>) => void;
}

function TopicChip({ label, selected, testID, onPress }: Readonly<{ label: string; selected: boolean; testID: string; onPress: () => void }>) {
  return (
    <XStack
      testID={testID}
      role="tab"
      aria-selected={selected}
      tabIndex={0}
      onPress={onPress}
      pressStyle={PRESS_STYLE.control}
      height={36}
      paddingHorizontal={14}
      borderRadius={999}
      alignItems="center"
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor={selected ? '$primary' : '$surface'}
    >
      <Text fontSize={13} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** Search, topic chips and the English / Hindi toggle above the Tutorials feed. */
export function TutorialFilterBar({ filters, topics, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [text, setText] = useState(filters.search);
  const debounced = useDebouncedValue(text.trim());

  // Only the typed text drives this; a filter change from elsewhere is synced below.
  const latest = useRef({ search: filters.search, onChange });
  latest.current = { search: filters.search, onChange };
  useEffect(() => {
    if (debounced !== latest.current.search) latest.current.onChange({ search: debounced });
  }, [debounced]);

  useEffect(() => {
    setText(filters.search);
  }, [filters.search]);

  return (
    <YStack gap={8} paddingBottom={8}>
      <XStack marginHorizontal={16} alignItems="center" gap={8} borderRadius={999} backgroundColor="$soft" paddingHorizontal={14}>
        <MaterialIcons name="search" size={20} color={muted} />
        <Input
          testID="tutorials-search"
          aria-label={t('mweb.tutorials.searchLabel')}
          flex={1}
          height={44}
          borderWidth={0}
          backgroundColor="transparent"
          value={text}
          onChangeText={setText}
          placeholder={t('mweb.tutorials.searchPlaceholder')}
          placeholderTextColor="$muted"
          returnKeyType="search"
        />
        {text ? (
          <XStack
            testID="tutorials-search-clear"
            role="button"
            tabIndex={0}
            aria-label={t('mweb.tutorials.clearSearch')}
            onPress={() => setText('')}
            width={44}
            height={44}
            alignItems="center"
            justifyContent="center"
          >
            <MaterialIcons name="close" size={18} color={muted} />
          </XStack>
        ) : null}
      </XStack>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        <XStack gap={8} role="tablist" aria-label={t('mweb.tutorials.topicsLabel')}>
          <TopicChip label={t('mweb.tutorials.allTopics')} selected={!filters.topic} testID="tutorials-topic-all" onPress={() => onChange({ topic: '' })} />
          {topics.map((topic) => (
            <TopicChip
              key={topic.id}
              label={topic.label}
              selected={filters.topic === topic.key}
              testID={`tutorials-topic-${topic.key}`}
              onPress={() => onChange({ topic: topic.key })}
            />
          ))}
        </XStack>
      </ScrollView>
      <PillTabs<LanguageTab>
        tabs={LANGUAGE_TABS}
        value={filters.language || 'all'}
        onChange={(tab) => onChange({ language: tab === 'all' ? '' : tab })}
        ariaLabel={t('mweb.tutorials.languageLabel')}
        testIDPrefix="tutorials-language"
      />
    </YStack>
  );
}
