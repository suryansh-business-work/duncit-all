import { PodCardScroll } from '@/components/library/PodCardScroll';
import { StackScreen } from '@/components/StackScreen';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useMyPods } from '@/hooks/useLibrary';

/** Saved Items — the pods the user has bookmarked. */
export function SavedScreen() {
  const { savedPods, isLoading } = useMyPods();
  const { openPod } = useDetailNav();

  return (
    <StackScreen title="Saved Items" testID="saved-screen">
      <PodCardScroll
        testID="saved-list"
        pods={savedPods}
        isLoading={isLoading}
        emptyText="No saved pods yet. Tap the bookmark on a pod to save it."
        onOpen={(pod) => openPod(pod.id, pod.pod_title)}
      />
    </StackScreen>
  );
}
