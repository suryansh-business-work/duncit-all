import { Box } from '@mui/material';
import type { ReactNode } from 'react';

/** Responsive form grid: 1 column on mobile, N columns on larger screens. */
export default function FieldGrid({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: `repeat(${cols}, 1fr)` }, gap: 1.5 }}>
      {children}
    </Box>
  );
}
