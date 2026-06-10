import { useWindowDimensions } from 'react-native';
import { ScrollView, Text } from 'tamagui';

import { PodCard } from '@/components/home/PodCard';
import { ListSkeleton } from '@/components/Skeleton';
import type { LibraryPod } from '@/hooks/useLibrary';

interface PodCardScrollProps {
  pods: LibraryPod[];
  isLoading: boolean;
  emptyText: string;
  testID: string;
  onOpen: (pod: LibraryPod) => void;
}

/** A simple vertical scroll of pod cards with skeleton/empty states — shared by
 * Saved Items and Pod History. */
export function PodCardScroll({
  pods,
  isLoading,
  emptyText,
  testID,
  onOpen,
}: Readonly<PodCardScrollProps>) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, 520);

  if (isLoading && pods.length === 0) {
    return <ListSkeleton testID={`${testID}-loading`} />;
  }

  return (
    <ScrollView
      flex={1}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}
    >
      {pods.length === 0 ? (
        <Text
          testID={`${testID}-empty`}
          textAlign="center"
          fontSize={13}
          color="$muted"
          paddingVertical={40}
        >
          {emptyText}
        </Text>
      ) : (
        pods.map((pod) => (
          <PodCard key={pod.id} pod={pod} width={cardWidth} onPress={() => onOpen(pod)} />
        ))
      )}
    </ScrollView>
  );
}
