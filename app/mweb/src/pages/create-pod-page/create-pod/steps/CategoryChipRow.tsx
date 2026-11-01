import type { ReactNode } from 'react';
import { Box } from '@mui/material';

interface Props {
  label: string;
  testId: string;
  children: ReactNode;
}

/** A single line of chips that scrolls sideways instead of wrapping, so every
 * option stays one swipe away on a phone. */
export default function CategoryChipRow({ label, testId, children }: Readonly<Props>) {
  return (
    <Box
      role="group"
      aria-label={label}
      data-testid={testId}
      sx={{
        display: 'flex',
        gap: 1,
        // Takes the width it is given rather than the chips' total, so a
        // content-sized parent (grid or flex row) never grows past the screen.
        contain: 'inline-size',
        overflowX: 'auto',
        overscrollBehaviorX: 'contain',
        scrollSnapType: 'x proximity',
        pb: 0.5,
        '& > *': { scrollSnapAlign: 'start' },
        scrollbarWidth: 'thin',
      }}
    >
      {children}
    </Box>
  );
}
