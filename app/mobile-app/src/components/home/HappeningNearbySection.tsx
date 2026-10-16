import type { ComponentProps } from 'react';
import { YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { HappeningNearbyHeader } from '@/components/home/HappeningNearbyHeader';
import { HomeFeaturedPods } from '@/components/home/HomeFeaturedPods';
import { TourAnchor } from '@/tours/TourAnchor';

/** The "Happening nearby" title and its rail. With no pod nearby the whole
 * section goes, title included — a heading over nothing reads as a broken
 * screen. The tour skips its "home-pods" stop while it is absent. mWeb twin:
 * HomeNearbySection. */
export function HappeningNearbySection(props: Readonly<ComponentProps<typeof HomeFeaturedPods>>) {
  if (props.pods.length === 0) return null;
  return (
    <YStack gap={12}>
      <Reveal index={2}>
        <HappeningNearbyHeader totalPods={props.totalCount} onPress={() => props.onSeeAll()} />
      </Reveal>
      <Reveal index={3}>
        <TourAnchor tour="home" anchor="home-pods">
          <HomeFeaturedPods {...props} />
        </TourAnchor>
      </Reveal>
    </YStack>
  );
}
