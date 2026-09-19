import type { ReactNode } from 'react';
import { YStack } from 'tamagui';

import { LaunchBackdrop } from './LaunchBackdrop';

/** The copy column never grows past a phone's width, whatever the viewport. */
const COLUMN_MAX_WIDTH = 560;

interface Props {
  testID: string;
  media: { videoUrl: string; imageUrl: string };
  /** One screen's worth — the page is a stack of these. */
  minHeight: number;
  children: ReactNode;
}

/**
 * One full-height section of the waitlist: the backdrop edge to edge, and the
 * copy in a centred column over it, spread from the top edge to the bottom
 * so the closing line always sits at the foot. mWeb twin:
 * components/city-launch/LaunchSection.
 */
export function LaunchSection({ testID, media, minHeight, children }: Readonly<Props>) {
  return (
    <YStack testID={testID} position="relative" minHeight={minHeight} overflow="hidden">
      <LaunchBackdrop
        videoUrl={media.videoUrl}
        imageUrl={media.imageUrl}
        testID={`${testID}-backdrop`}
      />
      {/* Above the absolute backdrop: web paints positioned nodes last. */}
      <YStack
        zIndex={1}
        flex={1}
        width="100%"
        maxWidth={COLUMN_MAX_WIDTH}
        alignSelf="center"
        paddingHorizontal={16}
        paddingVertical={24}
        gap={16}
        justifyContent="space-between"
      >
        {children}
      </YStack>
    </YStack>
  );
}
