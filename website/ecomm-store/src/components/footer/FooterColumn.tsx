import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';

/** One titled footer column. The heading gives the link group its name. */
export function FooterColumn({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Stack spacing={1.25} component="section" aria-label={title} sx={{ minWidth: 0 }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Stack>
  );
}
