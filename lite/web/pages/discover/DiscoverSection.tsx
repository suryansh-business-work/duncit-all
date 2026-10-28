import { useId, type ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';

interface DiscoverSectionProps {
  title: string;
  /** A quieter second line under the title, e.g. the city "Popular events" is for. */
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  testId: string;
}

/** A titled band of Discover or the landing page, labelled by its own heading. */
export function DiscoverSection({ title, subtitle, action, children, testId }: Readonly<DiscoverSectionProps>) {
  const headingId = useId();
  return (
    <Stack component="section" aria-labelledby={headingId} spacing={2} data-testid={testId}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Stack sx={{ minWidth: 0 }}>
          <Typography id={headingId} variant="h3" component="h2">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
        {action}
      </Stack>
      {children}
    </Stack>
  );
}
