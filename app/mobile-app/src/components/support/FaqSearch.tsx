import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton';
import { useFaqSearch, type FaqItem } from '@/hooks/useLibrary';
import { useThemeColors } from '@/hooks/useThemeColors';

interface FaqResultsProps {
  results: FaqItem[];
  isLoading: boolean;
  query: string;
  onOpen: (faq: FaqItem) => void;
}

/** The dropdown panel below the field: loading skeletons, a no-match note, or
 * the matching questions. */
function FaqResults({ results, isLoading, query, onOpen }: Readonly<FaqResultsProps>) {
  if (isLoading) {
    return (
      <YStack
        testID="support-search-loading"
        gap={8}
        padding={12}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <Skeleton height={16} radius={8} />
        <Skeleton height={16} radius={8} />
        <Skeleton height={16} radius={8} />
      </YStack>
    );
  }

  if (results.length === 0) {
    return (
      <YStack
        padding={16}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <Text testID="support-search-empty" fontSize={13} color="$muted">
          No FAQs match “{query.trim()}”. Try starting a conversation below.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      overflow="hidden"
    >
      {results.map((faq, index) => (
        <XStack
          key={faq.id}
          testID={`support-search-${faq.id}`}
          role="button"
          aria-label={faq.question}
          onPress={() => onOpen(faq)}
          padding={14}
          borderTopWidth={index === 0 ? 0 : 1}
          borderTopColor="$borderColor"
          pressStyle={{ opacity: 0.8 }}
        >
          <Text flex={1} fontSize={14} fontWeight="800" color="$color">
            {faq.question}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}

interface FaqSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  onOpen: (faq: FaqItem) => void;
}

/** Debounced server-side FAQ search — a rounded pill field whose matches render
 * in a panel below it. RN twin of mWeb's FaqSearch. */
export function FaqSearch({ query, onQueryChange, onOpen }: Readonly<FaqSearchProps>) {
  const { muted } = useThemeColors();
  const { results, isLoading, hasQuery } = useFaqSearch(query);

  return (
    <YStack gap={8}>
      <XStack
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        height={48}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <MaterialIcons name="search" size={18} color={muted} />
        <Input
          testID="support-search"
          aria-label="Search help topics"
          flex={1}
          unstyled
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search for topics or questions…"
          placeholderTextColor="$muted"
          color="$color"
          fontSize={14}
        />
        {query ? (
          <XStack
            testID="support-search-clear"
            role="button"
            aria-label="Clear search"
            onPress={() => onQueryChange('')}
            width={28}
            height={28}
            alignItems="center"
            justifyContent="center"
            borderRadius={14}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="close" size={18} color={muted} />
          </XStack>
        ) : null}
      </XStack>
      {hasQuery ? (
        <FaqResults results={results} isLoading={isLoading} query={query} onOpen={onOpen} />
      ) : null}
    </YStack>
  );
}
