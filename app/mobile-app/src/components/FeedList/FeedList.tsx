import type { ReactElement } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { Text } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { ListSkeleton } from '@/components/Skeleton';
import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useThemeColors } from '@/hooks/useThemeColors';

interface FeedListProps<T> {
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  /** Custom empty state (overrides emptyText) — e.g. an empty state with a CTA. */
  emptyComponent?: ReactElement;
  testID: string;
  onRefresh?: () => void;
  /** Drives the pull-to-refresh spinner. Defaults to the list's own loading
   * flag once there is data on screen, which is exactly a refresh. */
  refreshing?: boolean;
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => ReactElement;
}

/** Vertical feed scaffold shared by the tab screens: a skeleton while the first
 * load is in flight, an empty message, or a virtualized list with pull-to-refresh
 * and room for the floating bottom nav. Backed by FlatList so only the visible
 * rows (plus a small buffer) are mounted, instead of the whole list at once. */
export function FeedList<T>({
  isLoading,
  isEmpty,
  emptyText,
  emptyComponent,
  testID,
  onRefresh,
  refreshing,
  data,
  keyExtractor,
  renderItem,
}: Readonly<FeedListProps<T>>) {
  const { primary, surface } = useThemeColors();
  const bottomSpace = useBottomNavSpace();

  if (isLoading && isEmpty) {
    return <ListSkeleton testID={`${testID}-loading`} />;
  }

  // Without a truthful `refreshing` the spinner never appears, so a pull reads
  // as "nothing happened" even while the refetch is in flight.
  const isRefreshing = refreshing ?? (isLoading && !isEmpty);
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor={primary}
      colors={[primary]}
      progressBackgroundColor={surface}
    />
  ) : undefined;

  return (
    <FlatList
      testID={testID}
      style={{ flex: 1 }}
      data={data}
      showsVerticalScrollIndicator={false}
      keyExtractor={keyExtractor}
      renderItem={({ item, index }) => renderItem(item, index)}
      refreshControl={refreshControl}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: bottomSpace }}
      ListEmptyComponent={
        emptyComponent ?? (
          <Reveal scale>
            <Text
              testID={`${testID}-empty`}
              textAlign="center"
              fontSize={13}
              color="$muted"
              paddingVertical={40}
            >
              {emptyText}
            </Text>
          </Reveal>
        )
      }
    />
  );
}
