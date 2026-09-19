import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';

interface DiscoverSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  testId: string;
}

/** A titled band of the Discover page. */
export function DiscoverSection({ title, action, children, testId }: Readonly<DiscoverSectionProps>) {
  return (
    <Stack component="section" spacing={2} data-testid={testId}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="h2" component="h2" sx={{ fontSize: { xs: '1.35rem', md: '1.6rem' } }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Stack>
  );
}
