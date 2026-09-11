import { XStack, YStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton';
import { SurfaceCard } from '@/components/SurfaceCard';

/** Rows a placeholder Manage-Account group stands in for. */
const LIST_ROWS = ['a', 'b', 'c'];
/** The four quick-action tiles the grid always renders. */
const GRID_TILES = ['a', 'b', 'c', 'd'];

function TileSkeleton() {
  return (
    <YStack
      width="100%"
      flexGrow={1}
      gap={10}
      borderRadius={16}
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
      padding={14}
    >
      <Skeleton width={36} height={36} radius={18} />
      <Skeleton width="70%" height={14} />
    </YStack>
  );
}

function CardSkeleton() {
  return (
    <YStack paddingHorizontal={16} paddingBottom={12}>
      <SurfaceCard flexDirection="row" alignItems="center" gap={12}>
        <Skeleton width={44} height={44} radius={22} />
        <YStack flex={1} gap={6}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="65%" height={11} />
        </YStack>
      </SurfaceCard>
    </YStack>
  );
}

function ListSkeleton() {
  return (
    <YStack paddingHorizontal={16} paddingBottom={12} gap={8}>
      <Skeleton width="35%" height={16} />
      <SurfaceCard paddingVertical={0}>
        {LIST_ROWS.map((row) => (
          <XStack key={row} alignItems="center" gap={12} minHeight={60}>
            <Skeleton width={36} height={36} radius={18} />
            <Skeleton width="55%" height={14} />
          </XStack>
        ))}
      </SurfaceCard>
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
      <YStack paddingHorizontal={16} paddingBottom={12}>
        <SurfaceCard flexDirection="row" alignItems="center" gap={14}>
          <Skeleton width={52} height={52} radius={26} />
          <YStack flex={1} gap={6}>
            <Skeleton width="55%" height={16} />
            <Skeleton width="70%" height={12} />
          </YStack>
        </SurfaceCard>
      </YStack>

      <XStack
        paddingHorizontal={16}
        paddingBottom={12}
        flexWrap="wrap"
        gap={12}
        justifyContent="space-between"
      >
        {GRID_TILES.map((tile) => (
          <YStack key={tile} width="48%" flexGrow={1}>
            <TileSkeleton />
          </YStack>
        ))}
      </XStack>

      <YStack paddingHorizontal={16} paddingBottom={12}>
        <Skeleton width="100%" height={132} radius={16} />
      </YStack>

      <CardSkeleton />
      <CardSkeleton />
      <ListSkeleton />
      <ListSkeleton />
    </YStack>
  );
}
