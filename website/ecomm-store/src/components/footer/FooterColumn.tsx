import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';

/** One titled footer column. The heading gives the link group its name. */
export function FooterColumn({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Stack spacing={1} component="section" aria-label={title}>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      {children}
    </Stack>
  );
}
