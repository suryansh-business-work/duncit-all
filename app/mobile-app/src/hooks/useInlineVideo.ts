import { useEffect } from 'react';
import { useVideoPlayer, type VideoPlayer } from 'expo-video';
import { videoSourceUrl } from '@duncit/utils';

/**
 * A muted, looping player for a clip inside a horizontal list — the reels feed
 * and the pod / club cover carousel (rule 34).
 *
 * It plays only while its card is the one on screen: a list keeps neighbouring
 * cards mounted, so a hero with four clips would otherwise run four decoders
 * behind a picture nobody is looking at.
 *
 * The address goes through `videoSourceUrl` for the reason the story player
 * does — ImageKit's metered re-encode answers 403 once its allowance is spent,
 * and a 403 leaves the slide black with nothing to report.
 */
export function useInlineVideo(url: string, isActive: boolean): VideoPlayer {
  const player = useVideoPlayer(videoSourceUrl(url), (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (!isActive) {
      player.pause();
      return undefined;
    }
    // The remote source may still be loading when the card becomes active —
    // start now and re-assert once it reports ready (same as BrandBackdrop).
    player.play();
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') player.play();
    });
    return () => sub.remove();
  }, [player, isActive]);

  return player;
}
