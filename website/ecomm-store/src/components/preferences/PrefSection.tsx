import { useId, type ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';

/** A titled group in the preferences drawer; children get the heading's id to label themselves. */
export function PrefSection({ title, children }: Readonly<{ title: string; children: (headingId: string) => ReactNode }>) {
  const headingId = useId();
  return (
    <Stack component="section" spacing={1.5} aria-labelledby={headingId}>
      <Typography id={headingId} variant="h5" component="h3">
        {title}
      </Typography>
      {children(headingId)}
    </Stack>
  );
}
