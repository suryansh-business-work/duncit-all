import { useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SearchPill } from '@/components/pod-list/SearchPill';
import { CategoryActions } from '@/components/search/CategoryActions';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useSearchCategories, useSearchDiscovery, useSearchSuggestions } from '@/hooks/useSearch';
import type { RootStackParamList } from '@/navigation/types';
import type { SearchSort } from '@/utils/search-sort';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** Home > Search — live suggestions, category quick-actions, club-grouped results
 * (Happening This Week / More Clubs), sort & filter and discovery-oriented empty
 * states. Identical experience to mWeb's SearchPage. */
export function SearchScreen() {
  const { t } = useTranslation();
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
    <StackScreen title={t('mweb.common.search')} testID="search-screen">
      <XStack paddingHorizontal={16} paddingTop={4}>
        <SearchPill
          inputRef={inputRef}
          testID="search-input"
          ariaLabel={t('mweb.common.search')}
          height={52}
          autoFocus
          value={query}
          onChangeText={onChange}
          placeholder={t('mweb.search.searchClubsPodsCategoriesOrActivities')}
        />
      </XStack>

      <SearchSuggestions suggestions={showSuggest ? suggestions : []} onPick={pickSuggestion} />

      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack padding={16} paddingTop={20} gap={20} paddingBottom={40}>
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
              onOpenPod={(pod) => openPod(pod.club_slug, pod.pod_id, pod.id)}
              onShareIdea={() => navigation.navigate('PodIdeas')}
              onEarn={() => navigation.navigate('Earn')}
            />
          ) : (
            <CategoryActions categories={categories} onSelect={pickCategory} />
          )}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
