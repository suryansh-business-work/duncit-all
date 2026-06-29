import { useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { CategoryActions } from '@/components/search/CategoryActions';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useSearchCategories, useSearchDiscovery, useSearchSuggestions } from '@/hooks/useSearch';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import type { SearchSort } from '@/utils/search-sort';

/** Home > Search — live suggestions, category quick-actions, club-grouped results
 * (Happening This Week / More Clubs), sort & filter and discovery-oriented empty
 * states. Identical experience to mWeb's SearchPage. */
export function SearchScreen() {
  const { muted } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { openPod, openClub } = useDetailNav();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState<SearchSort>('RELEVANCE');
  const [showSuggest, setShowSuggest] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  const { happening, moreClubs, loading, active } = useSearchDiscovery(query, categoryId);
  const suggestions = useSearchSuggestions(query);
  const { categories, nameOf } = useSearchCategories();

  useEffect(() => {
    const timer = setTimeout(
      /* istanbul ignore next -- the input stays mounted for the screen's lifetime */
      () => inputRef.current?.focus(),
      300,
    );
    return () => clearTimeout(timer);
  }, []);

  const onChange = (next: string) => {
    setQuery(next);
    setShowSuggest(true);
  };

  const pickSuggestion = (text: string) => {
    setQuery(text);
    setShowSuggest(false);
  };

  const pickCategory = (id: string) => {
    setCategoryId(id);
    setQuery('');
    setShowSuggest(false);
  };

  return (
    <StackScreen title="Search" testID="search-screen">
      <XStack
        alignItems="center"
        gap={8}
        margin={16}
        marginBottom={4}
        paddingHorizontal={12}
        height={46}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      >
        <MaterialIcons name="search" size={20} color={muted} />
        <Input
          ref={inputRef}
          testID="search-input"
          flex={1}
          unstyled
          autoFocus
          value={query}
          onChangeText={onChange}
          placeholder="Search clubs, pods, categories or activities…"
          placeholderTextColor="$muted"
          color="$color"
          fontSize={15}
          returnKeyType="search"
        />
      </XStack>

      <SearchSuggestions suggestions={showSuggest ? suggestions : []} onPick={pickSuggestion} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding={16} gap={16} paddingBottom={40}>
          {active ? (
            <SearchResults
              happening={happening}
              moreClubs={moreClubs}
              loading={loading}
              keyword={query.trim()}
              sort={sort}
              onSortChange={setSort}
              categories={categories}
              categoryId={categoryId}
              onCategoryChange={setCategoryId}
              categoryNameOf={nameOf}
              onOpenClub={openClub}
              onOpenPod={(pod) => openPod(pod.id, pod.pod_title)}
              onShareIdea={() => navigation.navigate('PodIdeas')}
              onEarn={() => navigation.navigate('Earn')}
            />
          ) : (
            <CategoryActions categories={categories} onSelect={pickCategory} />
          )}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
