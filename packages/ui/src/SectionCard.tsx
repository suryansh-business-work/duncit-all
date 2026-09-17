import type { ReactNode } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  /** Rendered at the right end of the title row (a toggle, a link). */
  action?: ReactNode;
  children: ReactNode;
}

/** A titled, outlined panel — the unit a console's detail and report pages are built from. */
export function SectionCard({ title, subtitle, action, children }: Readonly<SectionCardProps>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {subtitle}
              </Typography>
            )}
          </Stack>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}
