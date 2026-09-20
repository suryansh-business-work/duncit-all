import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import LaunchBackdrop from './LaunchBackdrop';

/** The copy column never grows past a phone's width, whatever the viewport. */
const COLUMN_MAX_WIDTH = 560;

interface Props {
  testId: string;
  media: { videoUrl: string; imageUrl: string };
  /** One screen's worth — the page is a stack of these. */
  minHeight: number;
  children: ReactNode;
}

/**
 * One full-height section of the waitlist: the backdrop edge to edge, and the
 * copy in a centred column over it, spread from the top edge to the bottom
 * so the closing line always sits at the foot. Native twin:
 * components/city-launch/LaunchSection.
 */
export default function LaunchSection({ testId, media, minHeight, children }: Readonly<Props>) {
  return (
    <Box
      component="section"
      data-testid={testId}
      sx={{
        position: 'relative',
        isolation: 'isolate',
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        color: 'common.white',
      }}
    >
      <LaunchBackdrop videoUrl={media.videoUrl} imageUrl={media.imageUrl} testId={`${testId}-backdrop`} />
      <Stack
        spacing={2}
        sx={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          width: '100%',
          maxWidth: COLUMN_MAX_WIDTH,
          mx: 'auto',
          px: 2,
          py: 3,
          justifyContent: 'space-between',
        }}
      >
        {children}
      </Stack>
    </Box>
  );
}
