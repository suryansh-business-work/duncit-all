import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { logs } from '@duncit/logs';

interface Props {
  src: string;
  /** Sound off. Reels start muted (autoplay needs it); the rail's toggle unmutes. */
  muted: boolean;
  /** The reel on screen — the only one that plays. */
  active: boolean;
  /** Close enough to the reel on screen to be buffering already. */
  preload: boolean;
  /** The browser refused to play this reel with sound (no tap on it yet). */
  onSoundBlocked: () => void;
  testId?: string;
}

function isSoundRefusal(error: unknown, video: HTMLVideoElement): boolean {
  return error instanceof DOMException && error.name === 'NotAllowedError' && !video.muted;
}

/** A refused play() is routine — a swipe that pauses a reel before it starts
 * aborts it — so it is recorded, not surfaced. */
function logPlayError(error: unknown): void {
  logs.mWeb.debug('ExplorePage', 'ExploreReelVideo', { error });
}

/** Full-bleed reel video for an Explore card. It loops while it is the reel on
 * screen and pauses otherwise; the reels either side buffer ahead so a swipe
 * lands on a video that is already loaded. Native twin: ReelVideo. */
export default function ExploreReelVideo({ src, muted, active, preload, onSoundBlocked, testId }: Readonly<Props>) {
  const ref = useRef<HTMLVideoElement>(null);
  // React only writes `muted` as the initial attribute, so a later toggle is
  // set on the element itself.
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!active) {
      video.pause();
      return;
    }
    video.play().catch((error: unknown) => {
      if (!isSoundRefusal(error, video)) {
        logPlayError(error);
        return;
      }
      // Safari only plays a video with sound after a tap on that video, so a
      // swipe onto the next reel with sound on is refused and the reel would
      // freeze. Carry on muted and turn the feed's sound off to match.
      video.muted = true;
      onSoundBlocked();
      video.play().catch(logPlayError);
    });
  }, [active, onSoundBlocked]);

  return (
    <Box
      ref={ref}
      data-testid={testId}
      component="video"
      src={src}
      muted
      loop
      playsInline
      preload={preload ? 'auto' : 'none'}
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  );
}
