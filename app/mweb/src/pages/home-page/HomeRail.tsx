import type { ReactNode } from 'react';
import { Box } from '@mui/material';

interface Props {
  children: ReactNode;
  /** Space between the entries, in theme units (1.5 = 12px cards, 1 = 8px chips). */
  gap?: number;
}

/**
 * One sideways-scrolling Home rail: it bleeds out of the page's 16px gutter to
 * the screen edges and insets its entries by the same 16px, so the first card
 * lines up with the section title and the last one is visibly cut off — the
 * only honest "this scrolls" signal with no scrollbar. The inner row is
 * `max-content` so the trailing 16px survives in every browser. Native twin:
 * each rail's ScrollView `contentContainerStyle={{ gap, paddingHorizontal: 16 }}`.
 */
export default function HomeRail({ children, gap = 1.5 }: Readonly<Props>) {
  return (
    <Box
      sx={{
        mx: -2,
        px: 2,
        pb: 0.5,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Box sx={{ display: 'flex', gap, width: 'max-content' }}>{children}</Box>
    </Box>
  );
}
