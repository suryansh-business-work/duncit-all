import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { PodCardScroll } from '@/components/library/PodCardScroll';
import { SavedFilterSheet, SavedSortSheet, SavedToolbar } from '@/components/saved';
import { StackScreen } from '@/components/StackScreen';
import { useDetailNav } from '@/hooks/useDetailNav';
import { usePodHistoryCategories } from '@/hooks/usePodHistory';
import { useSavedPods } from '@/hooks/useSavedPods';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toErrorMessage } from '@/utils/errors';
import {
  activeSavedFilterCount,
  DEFAULT_SAVED_FILTERS,
  effectiveCategoryId,
  type SavedFilters,
} from '@/utils/saved-filter';

/** Saved Items — the pods the user bookmarked, with a debounced server-side
 * search, a Super → Category → Sub filter and sort. RN twin of mWeb's
 * SavedItemsPage; all three inputs drive the one `mySavedPods` query. */
export function SavedScreen() {
  const { muted } = useThemeColors();
  const { openPod } = useDetailNav();
  const categories = usePodHistoryCategories();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<SavedFilters>(DEFAULT_SAVED_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const { pods, isLoading, error } = useSavedPods({
    search: searchText,
    categoryId: effectiveCategoryId(filters),
    sort: filters.sort,
  });

  const toolbar = (
    <SavedToolbar
      filterCount={activeSavedFilterCount(filters)}
      onFilter={() => setFilterOpen(true)}
      onSort={() => setSortOpen(true)}
    />
  );

  return (
    <StackScreen title="Saved Items" testID="saved-screen" right={toolbar}>
      <YStack flex={1}>
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
            testID="saved-search"
            flex={1}
            unstyled
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search saved pods…"
            placeholderTextColor="$muted"
            color="$color"
            fontSize={15}
            returnKeyType="search"
          />
        </XStack>
        {error ? (
          <Text testID="saved-error" padding={24} color="$danger">
            {toErrorMessage(error)}
          </Text>
        ) : (
          <PodCardScroll
            testID="saved-list"
            pods={pods}
            isLoading={isLoading}
            emptyText="No saved pods yet. Tap the bookmark on a pod to save it."
            onOpen={(pod) => openPod(pod.id, pod.pod_title)}
          />
        )}
      </YStack>
      <SavedFilterSheet
        open={filterOpen}
        filters={filters}
        categories={categories}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_SAVED_FILTERS)}
        onClose={() => setFilterOpen(false)}
      />
      <SavedSortSheet
        open={sortOpen}
        value={filters.sort}
        onClose={() => setSortOpen(false)}
        onSelect={(sort) => setFilters((f) => ({ ...f, sort }))}
      />
    </StackScreen>
  );
}
