import { useRoute, type RouteProp } from '@react-navigation/native';

import { PodListView } from '@/components/pod-list/PodListView';
import { StackScreen } from '@/components/StackScreen';
import { useActiveAds } from '@/hooks/useActiveAds';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/** Dedicated page of every live (upcoming) pod for the selected city/super-
 * category — reached from the Home "Happening nearby" section (title or See all). */
export function HappeningNearbyScreen() {
  const { t } = useTranslation();
  const { activePods } = useHomeFeed('');
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
      />
    </StackScreen>
  );
}
