import { XStack, YStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton';

/** Rows a placeholder Manage-Account group stands in for. */
const LIST_ROWS = ['a', 'b', 'c'];
/** The four quick-action tiles the grid always renders. */
const GRID_TILES = ['a', 'b', 'c', 'd'];

function TileSkeleton() {
  return (
    <YStack
      width="100%"
      flexGrow={1}
      gap={8}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={12}
    >
      <Skeleton width={36} height={36} radius={8} />
      <YStack gap={4}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="45%" height={11} />
      </YStack>
    </YStack>
  );
}

function CardSkeleton() {
  return (
    <YStack paddingHorizontal={16} paddingBottom={10}>
      <XStack
        alignItems="center"
        gap={12}
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        padding={12}
      >
        <Skeleton width={44} height={44} radius={10} />
        <YStack flex={1} gap={6}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="65%" height={11} />
        </YStack>
      </XStack>
    </YStack>
  );
}

function ListSkeleton() {
  return (
    <YStack paddingHorizontal={16} paddingBottom={10} gap={8}>
      <Skeleton width="35%" height={12} />
      <YStack
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        paddingHorizontal={14}
      >
        {LIST_ROWS.map((row) => (
          <XStack key={row} alignItems="center" gap={12} paddingVertical={11}>
            <Skeleton width={24} height={24} radius={12} />
            <Skeleton width="55%" height={14} />
          </XStack>
        ))}
      </YStack>
    </YStack>
  );
}

/**
 * The menu's shape while the account query is still in flight — the twin of
 * mWeb's <MenuSkeleton/>. It stands in for the whole body rather than a spinner
 * so the panel does not paint a stranger's menu for a beat: an anonymous "User"
 * avatar sitting at 0% profile completion.
 */
export function SidebarSkeleton() {
  return (
    <YStack testID="sidebar-skeleton">
      <XStack alignItems="center" gap={12} marginHorizontal={16} marginVertical={8} padding={12}>
        <YStack flex={1} gap={6}>
          <Skeleton width="55%" height={15} />
          <Skeleton width="70%" height={12} />
        </YStack>
        <Skeleton width={44} height={44} radius={22} />
      </XStack>

      <XStack
        paddingHorizontal={16}
        paddingBottom={10}
        flexWrap="wrap"
        gap={10}
        justifyContent="space-between"
      >
        {GRID_TILES.map((tile) => (
          <YStack key={tile} width="48%" flexGrow={1}>
            <TileSkeleton />
          </YStack>
        ))}
      </XStack>

      <YStack paddingHorizontal={16} paddingBottom={10}>
        <Skeleton width="100%" height={132} radius={16} />
      </YStack>

      <CardSkeleton />
      <CardSkeleton />
      <ListSkeleton />
      <ListSkeleton />
    </YStack>
  );
}
