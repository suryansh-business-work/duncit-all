import { useRoute, type RouteProp } from '@react-navigation/native';

import { PodListView } from '@/components/pod-list/PodListView';
import { StackScreen } from '@/components/StackScreen';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/** Dedicated page of pods that have already taken place (past date) for the
 * selected city/super-category — reached from the Home "Previous Pods" section. */
export function PreviousPodsScreen() {
  const { t } = useTranslation();
  const { previousPods } = useHomeFeed('');
  const route = useRoute<RouteProp<RootStackParamList, 'PreviousPods'>>();

  return (
    <StackScreen title={t('mweb.home.previousPodsTitle')} testID="previous-pods-screen">
      <PodListView
        pods={previousPods}
        initialIndex={route.params?.initialIndex}
        emptyText={t('mweb.home.previousPodsEmpty')}
        testID="previous-pods"
      />
    </StackScreen>
  );
}
