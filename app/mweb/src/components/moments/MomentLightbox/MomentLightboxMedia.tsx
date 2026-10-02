import { Box, Stack } from '@mui/material';
import type { Moment } from './types';

interface MomentLightboxMediaProps {
  moment: Moment;
  current: number;
  total: number;
}

/** The moment on screen — a playable clip or a contained image. */
export default function MomentLightboxMedia({ moment, current, total }: Readonly<MomentLightboxMediaProps>) {
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
          component="img"
          data-testid="moment-lightbox-media"
          src={moment.url}
          alt={`Moment ${current + 1} of ${total}`}
          sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px' }}
        />
      )}
    </Stack>
  );
}
