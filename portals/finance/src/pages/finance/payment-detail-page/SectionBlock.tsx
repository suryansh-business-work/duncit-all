import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface Props {
  title: string;
  children: ReactNode;
}

/** A titled block inside one of the detail page's two section cards. The blocks
 * are not cards themselves: nesting an outlined card inside an outlined card
 * draws a second border around content that already has one. */
export default function SectionBlock({ title, children }: Readonly<Props>) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
