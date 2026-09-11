import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import type { SearchSuggestion } from '@/hooks/useSearch';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

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

/** Type-ahead list shown beneath the search pill as the user types — rows in
 * one surface card, split by inset hairlines. */
export function SearchSuggestions({ suggestions, onPick }: Readonly<Props>) {
  const { muted } = useThemeColors();
  if (suggestions.length === 0) return null;
  return (
    <SurfaceCard
      testID="search-suggestions"
      marginHorizontal={16}
      marginTop={8}
      padding={0}
      paddingVertical={4}
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
          paddingVertical={12}
          marginHorizontal={16}
          borderTopWidth={index > 0 ? 1 : 0}
          borderColor="$borderColor"
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons name="search" size={16} color={muted} />
          <Text flex={1} fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
            {suggestion.text}
          </Text>
          <Text fontSize={12} color="$muted">
            {KIND_LABEL[suggestion.kind] ?? suggestion.kind}
          </Text>
        </XStack>
      ))}
    </SurfaceCard>
  );
}
