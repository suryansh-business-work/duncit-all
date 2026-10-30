import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { VideoView } from 'expo-video';
import { hasWatchedEnough } from '@duncit/utils';

import { useInlineVideo } from '@/hooks/useInlineVideo';

interface Props {
  url: string;
  /** The focused, on-screen tutorial — the only one that plays. */
  isActive: boolean;
  muted: boolean;
  label: string;
  testID: string;
  /** Called once per mount, at 90% played or at the end of the first pass. */
  onWatched: () => void;
}

/**
 * A tutorial's full-card player. Reuses the reels' `useInlineVideo` (looping,
 * plays only while active) and adds the watched rule shared with mWeb.
 */
export function TutorialVideo({ url, isActive, muted, label, testID, onWatched }: Readonly<Props>) {
  const player = useInlineVideo(url, isActive);
  const reported = useRef(false);
  const watched = useRef(onWatched);
  watched.current = onWatched;

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (!isActive) return undefined;
    player.timeUpdateEventInterval = 1;
    const report = () => {
      if (reported.current) return;
      reported.current = true;
      watched.current();
    };
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (hasWatchedEnough(currentTime, player.duration)) report();
    });
    const endSub = player.addListener('playToEnd', report);
    return () => {
      timeSub.remove();
      endSub.remove();
    };
  }, [player, isActive]);

  return (
    <VideoView
      testID={testID}
      accessibilityLabel={label}
      player={player}
      style={{ ...StyleSheet.absoluteFill, width: '100%', height: '100%' }}
      contentFit="contain"
      nativeControls={false}
    />
  );
}
