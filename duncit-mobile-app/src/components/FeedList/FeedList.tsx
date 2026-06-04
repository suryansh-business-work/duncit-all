import type { ReactNode } from 'react';
import { RefreshControl } from 'react-native';
import { ScrollView, Text } from 'tamagui';

import { ListSkeleton } from '@/components/Skeleton';
import { useThemeColors } from '@/hooks/useThemeColors';

interface FeedListProps {
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  testID: string;
  onRefresh?: () => void;
  children: ReactNode;
}

/** Vertical feed scaffold shared by the tab screens: a skeleton while the first
 * load is in flight, an empty message, or the scrollable content with
 * pull-to-refresh and room for the floating bottom nav. */
export function FeedList({
  isLoading,
  isEmpty,
  emptyText,
  testID,
  onRefresh,
  children,
}: FeedListProps) {
  const { primary } = useThemeColors();

  if (isLoading && isEmpty) {
    return <ListSkeleton testID={`${testID}-loading`} />;
  }

  return (
    <ScrollView
      flex={1}
      testID={testID}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={primary} />
        ) : undefined
      }
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }}
    >
      {isEmpty ? (
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
        children
      )}
    </ScrollView>
  );
}
