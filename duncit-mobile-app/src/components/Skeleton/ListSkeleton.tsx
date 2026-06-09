import { YStack } from 'tamagui';

import { SkeletonCard } from '@/components/Skeleton/SkeletonCard';

/** Vertical stack of card placeholders — the loading state for feed/list screens. */
export function ListSkeleton({ count = 4, testID }: Readonly<{ count?: number; testID?: string }>) {
  return (
    <YStack padding={16} gap={14} testID={testID}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={120} />
      ))}
    </YStack>
  );
}
