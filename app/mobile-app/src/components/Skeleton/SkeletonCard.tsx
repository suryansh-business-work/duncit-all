import { YStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton/Skeleton';

/** A pod/club-card shaped placeholder used in list + feed skeletons. */
export function SkeletonCard({ height = 200 }: Readonly<{ height?: number }>) {
  return (
    <YStack
      borderRadius={24}
      overflow="hidden"
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
    >
      <Skeleton width="100%" height={height} radius={0} />
      <YStack padding={16} gap={8}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="45%" height={12} />
      </YStack>
    </YStack>
  );
}
