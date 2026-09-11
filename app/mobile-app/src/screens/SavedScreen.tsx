import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { PodCardScroll } from '@/components/library/PodCardScroll';
import { SearchPill } from '@/components/pod-list/SearchPill';
import { SavedFilterSheet, SavedSortSheet, SavedToolbar } from '@/components/saved';
import { StackScreen } from '@/components/StackScreen';
import { useDetailNav } from '@/hooks/useDetailNav';
import { usePodHistoryCategories } from '@/hooks/usePodHistory';
import { useSavedPods } from '@/hooks/useSavedPods';
import { toErrorMessage } from '@/utils/errors';
import {
  activeSavedFilterCount,
  DEFAULT_SAVED_FILTERS,
  effectiveCategoryId,
  type SavedFilters,
} from '@/utils/saved-filter';
import { useTranslation } from '@/hooks/useTranslation';

/** Saved Items — the pods the user bookmarked, with a debounced server-side
 * search, a Super → Category → Sub filter and sort. RN twin of mWeb's
 * SavedItemsPage; all three inputs drive the one `mySavedPods` query. */
export function SavedScreen() {
  const { t } = useTranslation();
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

  return (
    <StackScreen title={t('mweb.saved.savedItems')} testID="saved-screen">
      <YStack flex={1}>
        {/* Search pill + round green filter + round sort in one row — the same
            row mWeb's SavedItemsToolbar draws (rule 27). */}
        <XStack alignItems="center" gap={8} marginHorizontal={16} marginTop={4}>
          <SearchPill
            testID="saved-search"
            ariaLabel={t('mweb.saved.searchSavedPods')}
            value={searchText}
            onChangeText={setSearchText}
            placeholder={t('mweb.common.searchSavedPods')}
          />
          <SavedToolbar
            filterCount={activeSavedFilterCount(filters)}
            onFilter={() => setFilterOpen(true)}
            onSort={() => setSortOpen(true)}
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
            emptyText={t('mweb.saved.noSavedPodsYetTapThe')}
            onOpen={(pod) => openPod(pod.club_slug, pod.pod_id, pod.id)}
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
