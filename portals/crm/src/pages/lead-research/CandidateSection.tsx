import { useId, type ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface Props {
  title: string;
  children: ReactNode;
  testId?: string;
}

/** One titled part of the candidate drawer, named by its heading for screen-reader navigation. */
export default function CandidateSection({ title, children, testId }: Readonly<Props>) {
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId} data-testid={testId}>
      <Typography id={headingId} component="h3" variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** Up to two decimals, the precision scores are stored at. */
export const formatPoints = (value: number): string => String(Math.round(value * 100) / 100);
