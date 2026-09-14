import type { ReactNode } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** A titled card — every panel on the run page is one. */
export default function SectionCard({ title, subtitle, action, children }: Readonly<Props>) {
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
