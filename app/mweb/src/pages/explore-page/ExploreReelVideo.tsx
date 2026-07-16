import { Box } from '@mui/material';

interface Props {
  src: string;
}

/** Full-bleed reel video for an Explore card — autoplays muted and loops,
 * matching the video behavior of the old media carousel. */
export default function ExploreReelVideo({ src }: Readonly<Props>) {
  return (
    <Box
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
