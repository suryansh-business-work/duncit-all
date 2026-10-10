import type { ReactNode } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';

interface Props {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

/** The frame every tool panel in the arena shares: an icon, the tool's label, its content. */
export default function ToolCard({ icon, title, children }: Readonly<Props>) {
  return (
    <Card variant="outlined" component="section" aria-label={title}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {icon}
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
          </Stack>
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}

/** A quiet line of status text under a tool. */
export function ToolNote({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {children}
    </Typography>
  );
}
