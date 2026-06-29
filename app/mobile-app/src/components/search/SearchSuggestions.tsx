import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { SearchSuggestion } from '@/hooks/useSearch';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  suggestions: SearchSuggestion[];
  onPick: (text: string) => void;
}

const KIND_LABEL: Record<string, string> = {
  CLUB: 'Club',
  CATEGORY: 'Category',
  POD: 'Pod',
  ACTIVITY: 'Activity',
};

/** Type-ahead dropdown shown beneath the search bar as the user types. */
export function SearchSuggestions({ suggestions, onPick }: Readonly<Props>) {
  const { muted } = useThemeColors();
  if (suggestions.length === 0) return null;
  return (
    <YStack
      testID="search-suggestions"
      marginHorizontal={16}
      marginTop={6}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      overflow="hidden"
    >
      {suggestions.map((suggestion, index) => (
        <XStack
          key={`${suggestion.kind}:${suggestion.text}`}
          testID={`search-suggestion-${index}`}
          role="button"
          aria-label={suggestion.text}
          onPress={() => onPick(suggestion.text)}
          alignItems="center"
          gap={10}
          padding={12}
          borderTopWidth={index > 0 ? 1 : 0}
          borderColor="$borderColor"
          pressStyle={{ opacity: 0.8 }}
        >
          <MaterialIcons name="search" size={16} color={muted} />
          <Text flex={1} fontSize={14} fontWeight="700" color="$color" numberOfLines={1}>
            {suggestion.text}
          </Text>
          <Text fontSize={11} color="$muted">
            {KIND_LABEL[suggestion.kind] ?? suggestion.kind}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}
