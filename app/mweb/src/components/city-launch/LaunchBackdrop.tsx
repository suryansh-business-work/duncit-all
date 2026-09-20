import { useState } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import { imageSourceUrl, videoSourceUrl } from '@duncit/utils';

/** The widest a backdrop image draws, device pixels included — native asks for the same. */
const BACKDROP_IMAGE_WIDTH = 1080;

/** The dark ground under everything: the same near-black native paints (rule 27). */
const GROUND = '#09090f';

/** Heavier at the foot, where the button and the closing line sit, lighter
 * in the middle so the admin's frame still reads. White copy stays at 4.5:1
 * over any frame. */
const SCRIM =
  'linear-gradient(180deg, rgba(9, 9, 15, 0.55) 0%, rgba(9, 9, 15, 0.38) 40%, rgba(9, 9, 15, 0.9) 100%)';

const COVER = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  pointerEvents: 'none',
} as const;

interface Props {
  videoUrl: string;
  imageUrl: string;
  testId: string;
}

/**
 * What a section plays behind its copy: the admin's video, muted and
 * looping, over its backup image. The image is always underneath, so a video
 * that is still loading, refuses to autoplay or 404s at request time leaves
 * the picture rather than a black frame — and a reader who asked for reduced
 * motion gets the picture alone (WCAG 2.3.3). Native twin:
 * components/city-launch/LaunchBackdrop.
 */
export default function LaunchBackdrop({ videoUrl, imageUrl, testId }: Readonly<Props>) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = Boolean(videoUrl) && !reduceMotion && !videoFailed;

  return (
    <Box
      data-testid={testId}
      aria-hidden
      sx={{ position: 'absolute', inset: 0, overflow: 'hidden', bgcolor: GROUND }}
    >
      {imageUrl ? (
        <Box
          component="img"
          data-testid={`${testId}-image`}
          src={imageSourceUrl(imageUrl, BACKDROP_IMAGE_WIDTH)}
          alt=""
          sx={COVER}
        />
      ) : null}
      {showVideo ? (
        <Box
          component="video"
          data-testid={`${testId}-video`}
          src={videoSourceUrl(videoUrl)}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
          sx={COVER}
        />
      ) : null}
      <Box sx={{ ...COVER, backgroundImage: SCRIM }} />
    </Box>
  );
}
