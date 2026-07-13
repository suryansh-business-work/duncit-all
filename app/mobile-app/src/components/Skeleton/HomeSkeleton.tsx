import { ScrollView, XStack, YStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { SkeletonCard } from '@/components/Skeleton/SkeletonCard';

/** Loading placeholder for the home feed (status rail · chips · featured · club). */
export function HomeSkeleton() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} testID="home-skeleton">
      <YStack gap={20} paddingTop={12} paddingBottom={110}>
        <XStack gap={12} paddingHorizontal={16}>
          {Array.from({ length: 6 }, (_, i) => `status-${i}`).map((key) => (
            <YStack key={key} gap={6} alignItems="center">
              <Skeleton width={64} height={64} radius={32} />
              <Skeleton width={48} height={10} />
            </YStack>
          ))}
        </XStack>
        <XStack gap={8} paddingHorizontal={16}>
          {Array.from({ length: 4 }, (_, i) => `chip-${i}`).map((key) => (
            <Skeleton key={key} width={84} height={36} radius={14} />
          ))}
        </XStack>
        <XStack gap={12} paddingHorizontal={16}>
          {Array.from({ length: 2 }, (_, i) => `featured-${i}`).map((key) => (
            <Skeleton key={key} width={280} height={200} radius={18} />
          ))}
        </XStack>
        <YStack gap={12} paddingHorizontal={16}>
          <Skeleton width="50%" height={18} />
          <SkeletonCard height={130} />
        </YStack>
      </YStack>
    </ScrollView>
  );
}
