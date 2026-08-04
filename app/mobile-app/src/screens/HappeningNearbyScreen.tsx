import { useRoute, type RouteProp } from '@react-navigation/native';

import { HomeFilterButton } from '@/components/home/HomeFilterButton';
import { HomeFilterSheet } from '@/components/home/HomeFilterSheet';
import { PodListView } from '@/components/pod-list/PodListView';
import { usePodListFilters } from '@/components/pod-list/usePodListFilters';
import { StackScreen } from '@/components/StackScreen';
import { useActiveAds } from '@/hooks/useActiveAds';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/** Dedicated page of every live (upcoming) pod for the selected city/super-
 * category — reached from the Home "Happening nearby" section (title or See all). */
export function HappeningNearbyScreen() {
  const { t } = useTranslation();
  const podFilters = usePodListFilters();
  // The feed hook already applies category/price/date/sort, so the list here
  // narrows through the same rules Home uses — no second implementation.
  const { activePods, categoryChips, hasContent } = useHomeFeed(
    podFilters.categoryId,
    podFilters.filters,
  );
  // A full-width sponsored banner every 4 live pods.
  const { ads } = useActiveAds('POD_LIST');
  const route = useRoute<RouteProp<RootStackParamList, 'HappeningNearby'>>();

  return (
    <StackScreen title={t('mweb.home.happeningNearbyTitle')} testID="happening-nearby-screen">
      <PodListView
        pods={activePods}
        ads={ads}
        initialIndex={route.params?.initialIndex}
        emptyText={t('mweb.home.happeningNearbyEmpty')}
        testID="happening-nearby"
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
