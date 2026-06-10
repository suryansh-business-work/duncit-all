import { XStack, YStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton/Skeleton';

/** Loading placeholder for the pod/club details screens (hero + lines + blocks). */
export function DetailSkeleton({ testID = 'detail-skeleton' }: Readonly<{ testID?: string }>) {
  return (
    <YStack flex={1} testID={testID}>
      <Skeleton width="100%" height={300} radius={0} />
      <YStack padding={16} gap={12}>
        <Skeleton width="70%" height={24} />
        <XStack gap={8}>
          <Skeleton width={92} height={28} radius={999} />
          <Skeleton width={70} height={28} radius={999} />
          <Skeleton width={80} height={28} radius={999} />
        </XStack>
        <Skeleton width="100%" height={14} />
        <Skeleton width="92%" height={14} />
        <Skeleton width="60%" height={14} />
        <YStack gap={10} paddingTop={8}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={52} radius={12} />
          ))}
        </YStack>
      </YStack>
    </YStack>
  );
}
