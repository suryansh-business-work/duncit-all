import { useRoute, type RouteProp } from '@react-navigation/native';

import { HomeFilterButton } from '@/components/home/HomeFilterButton';
import { HomeFilterSheet } from '@/components/home/HomeFilterSheet';
import { PodListView } from '@/components/pod-list/PodListView';
import { usePodListFilters } from '@/components/pod-list/usePodListFilters';
import { StackScreen } from '@/components/StackScreen';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/** Dedicated page of pods that have already taken place (past date) for the
 * selected city/super-category — reached from the Home "Previous Pods" section. */
export function PreviousPodsScreen() {
  const { t } = useTranslation();
  const podFilters = usePodListFilters();
  // The feed hook already applies category/price/date/sort, so the list here
  // narrows through the same rules Home uses — no second implementation.
  const { previousPods, categoryChips, hasContent } = useHomeFeed(
    podFilters.categoryId,
    podFilters.filters,
  );
  const route = useRoute<RouteProp<RootStackParamList, 'PreviousPods'>>();

  return (
    <StackScreen title={t('mweb.home.previousPodsTitle')} testID="previous-pods-screen">
      <PodListView
        pods={previousPods}
        initialIndex={route.params?.initialIndex}
        emptyText={t('mweb.home.previousPodsEmpty')}
        testID="previous-pods"
        filterAction={
          <HomeFilterButton
            count={podFilters.count}
            disabled={!hasContent}
            onPress={() => podFilters.setOpen(true)}
          />
        }
      />
      <HomeFilterSheet
        open={podFilters.open}
        onClose={() => podFilters.setOpen(false)}
        categoryChips={categoryChips}
        categoryId={podFilters.categoryId}
        onCategory={podFilters.setCategoryId}
        filters={podFilters.filters}
        onChange={podFilters.setFilters}
        onReset={podFilters.reset}
        showSort={false}
      />
    </StackScreen>
  );
}
