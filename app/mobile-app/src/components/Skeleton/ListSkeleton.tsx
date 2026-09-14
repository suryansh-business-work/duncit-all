import { YStack } from 'tamagui';

import { SkeletonCard } from '@/components/Skeleton/SkeletonCard';
import { useLoadingRegion } from '@/components/Skeleton/useLoadingRegion';

/** Vertical stack of card placeholders — the loading state for feed/list screens. */
export function ListSkeleton({ count = 4, testID }: Readonly<{ count?: number; testID?: string }>) {
  const region = useLoadingRegion();
  return (
    <YStack padding={16} gap={14} testID={testID} {...region}>
      {Array.from({ length: count }, (_, i) => `list-card-${i}`).map((key) => (
        <SkeletonCard key={key} height={120} />
      ))}
    </YStack>
  );
}
