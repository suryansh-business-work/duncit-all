import { Box, Stack } from '@mui/material';
import type { Moment } from './types';
import { usePinchZoom } from './usePinchZoom';

interface MomentLightboxMediaProps {
  moment: Moment;
  current: number;
  total: number;
  /** A sideways swipe on an image at rest steps to the next or previous one. */
  onSwipe?: (direction: 'next' | 'prev') => void;
}

/** The moment on screen — a playable clip, or an image that pinches, double-taps and drags to zoom. */
export default function MomentLightboxMedia({ moment, current, total, onSwipe }: Readonly<MomentLightboxMediaProps>) {
  const zoom = usePinchZoom(onSwipe);
  return (
    <Stack
      sx={{
        alignItems: "center",
        justifyContent: "center",
        width: '100%',
        height: '100%',
        p: 2
      }}>
      {moment.type === 'VIDEO' ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- user-uploaded media; no caption track exists in the data model
        <Box
          component="video"
          data-testid="moment-lightbox-media"
          src={moment.url}
          controls
          autoPlay
          sx={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px' }}
        />
      ) : (
        <Box
          ref={zoom.ref}
          data-testid="moment-lightbox-zoom"
          {...zoom.handlers}
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            // The page must not scroll or browser-zoom under the gesture.
            touchAction: 'none',
            cursor: zoom.zoomed ? 'grab' : 'zoom-in',
          }}
        >
          <Box
            component="img"
            data-testid="moment-lightbox-media"
            src={moment.url}
            alt={`Moment ${current + 1} of ${total}`}
            draggable={false}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '12px',
              userSelect: 'none',
              transform: zoom.transform,
              transition: 'transform 80ms ease-out',
            }}
          />
        </Box>
      )}
    </Stack>
  );
}
