import { PodCardScroll } from '@/components/library/PodCardScroll';
import { StackScreen } from '@/components/StackScreen';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useMyPods } from '@/hooks/useLibrary';

/** Pod History — pods the user has joined or hosted. Tapping opens the details. */
export function PodHistoryScreen() {
  const { historyPods, isLoading } = useMyPods();
  const { openPod } = useDetailNav();

  return (
    <StackScreen title="Pod History" testID="pod-history-screen">
      <PodCardScroll
        testID="history-list"
        pods={historyPods}
        isLoading={isLoading}
        emptyText="You haven't joined any pods yet."
        onOpen={(pod) => openPod(pod.id, pod.pod_title)}
      />
    </StackScreen>
  );
}
