import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface Props {
  src: string;
  /** Sound off. Reels start muted (autoplay needs it); the rail's toggle unmutes. */
  muted: boolean;
  testId?: string;
}

/** Full-bleed reel video for an Explore card — autoplays and loops, matching
 * the video behavior of the old media carousel. */
export default function ExploreReelVideo({ src, muted, testId }: Readonly<Props>) {
  const ref = useRef<HTMLVideoElement>(null);
  // React only writes `muted` as the initial attribute, so a later toggle is
  // set on the element itself.
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  return (
    <Box
      ref={ref}
      data-testid={testId}
      component="video"
      src={src}
      autoPlay
      muted
      loop
      playsInline
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
