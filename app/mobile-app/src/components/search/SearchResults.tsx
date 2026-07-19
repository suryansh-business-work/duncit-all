import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { SearchResultsSection } from './SearchResultsSection';
import { SearchEmptyState } from './SearchEmptyState';
import { SearchSortSheet } from './SearchSortSheet';
import { SearchFilterSheet } from './SearchFilterSheet';
import { sortClubResults, type SearchSort } from '@/utils/search-sort';
import type { SearchCategory, SearchClubResult } from '@/hooks/useSearch';
import { useThemeColors } from '@/hooks/useThemeColors';

type SearchPod = SearchClubResult['upcoming_pods'][number];

interface Props {
  happening: SearchClubResult[];
  moreClubs: SearchClubResult[];
  loading: boolean;
  keyword: string;
  sort: SearchSort;
  onSortChange: (next: SearchSort) => void;
  categories: SearchCategory[];
  categoryId: string;
  onCategoryChange: (next: string) => void;
  categoryNameOf: (club: SearchClubResult['club']) => string | null;
  onOpenClub: (clubSlug: string) => void;
  onOpenPod: (pod: SearchPod) => void;
  onShareIdea: () => void;
  onEarn: () => void;
}

export function SearchResults({
  happening,
  moreClubs,
  loading,
  keyword,
  sort,
  onSortChange,
  categories,
  categoryId,
  onCategoryChange,
  categoryNameOf,
  onOpenClub,
  onOpenPod,
  onShareIdea,
  onEarn,
}: Readonly<Props>) {
  const { color, onPrimary } = useThemeColors();
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const isEmpty = happening.length === 0 && moreClubs.length === 0;
  const filterActive = categoryId.length > 0;

  const sectionProps = { categoryNameOf, onOpenClub, onOpenPod };

  return (
    <YStack gap={16}>
      <XStack gap={10}>
        <XStack
          testID="search-sort-button"
          role="button"
          aria-label="Sort"
          onPress={() => setSortOpen(true)}
          alignItems="center"
          gap={6}
          height={38}
          paddingHorizontal={14}
          borderRadius={999}
          borderWidth={1.5}
          borderColor="$borderColor"
          backgroundColor="$surface"
          pressStyle={{ opacity: 0.85 }}
        >
          <MaterialIcons name="swap-vert" size={16} color={color} />
          <Text fontSize={13.5} fontWeight="800" color="$color">
            Sort
          </Text>
        </XStack>
        <XStack
          testID="search-filter-button"
          role="button"
          aria-label="Filter"
          onPress={() => setFilterOpen(true)}
          alignItems="center"
          gap={6}
          height={38}
          paddingHorizontal={14}
          borderRadius={999}
          borderWidth={1.5}
          borderColor={filterActive ? '$primary' : '$borderColor'}
          backgroundColor={filterActive ? '$primary' : '$surface'}
          pressStyle={{ opacity: 0.85 }}
        >
          <MaterialIcons name="tune" size={16} color={filterActive ? onPrimary : color} />
          <Text fontSize={13.5} fontWeight="800" color={filterActive ? '$onPrimary' : '$color'}>
            Filter
          </Text>
        </XStack>
      </XStack>

      {loading && isEmpty ? (
        <YStack alignItems="center" paddingVertical={24}>
          <Spinner testID="search-loading" color="$primary" />
        </YStack>
      ) : null}

      {!loading && isEmpty ? (
        <SearchEmptyState
          variant={filterActive ? 'empty-category' : 'no-results'}
          keyword={keyword}
          onShareIdea={onShareIdea}
          onEarn={onEarn}
          onExploreCategories={() => onCategoryChange('')}
        />
      ) : null}

      <SearchResultsSection
        heading="🔥 Explore Experiences Happening Soon"
        subheading="Find clubs hosting exciting experiences you can join this week."
        results={sortClubResults(happening, sort)}
        testID="search-happening"
        {...sectionProps}
      />
      <SearchResultsSection
        heading="✨ More Clubs Worth Exploring"
        subheading="Discover communities that match your interests and start your next experience."
        results={sortClubResults(moreClubs, sort)}
        testID="search-more"
        {...sectionProps}
      />

      <SearchSortSheet
        open={sortOpen}
        value={sort}
        onClose={() => setSortOpen(false)}
        onSelect={onSortChange}
      />
      <SearchFilterSheet
        open={filterOpen}
        categories={categories}
        categoryId={categoryId}
        onClose={() => setFilterOpen(false)}
        onSelect={onCategoryChange}
      />
    </YStack>
  );
}
