import { XStack, YStack } from 'tamagui';

import type { ViewerStatus } from './types';

/** One segment per slide: past slides full, the current one filling. */
export function StatusProgressBars({
  slides,
  index,
  progress,
}: Readonly<{ slides: ViewerStatus['slides']; index: number; progress: number }>) {
  return (
    <XStack gap={4} paddingHorizontal={12} paddingTop={8}>
      {slides.map((slide, slideIndex) => {
        let fill = 0;
        if (slideIndex < index) fill = 1;
        else if (slideIndex === index) fill = progress;
        return (
          <YStack
            key={slide.id}
            flex={1}
            height={3}
            borderRadius={999}
            backgroundColor="rgba(255,255,255,0.3)"
            overflow="hidden"
          >
            <YStack height={3} width={`${fill * 100}%`} backgroundColor="#ffffff" />
          </YStack>
        );
      })}
    </XStack>
  );
}
